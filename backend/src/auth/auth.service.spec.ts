import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { findUnique: jest.Mock; update: jest.Mock } };
  let jwtService: jest.Mocked<Pick<JwtService, 'signAsync' | 'verifyAsync'>>;

  const mockUser = {
    id: 1,
    username: 'john.doe',
    passwordHash: '$2b$10$hashedpassword',
    role: Role.STUDENT,
    isActive: true,
    refreshToken: null,
    lecturer: null,
    student: { fullName: 'John Doe', email: 'john@uni.edu' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('mock.jwt.token'),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((_key: string, def?: string) => def ?? 'test-secret'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('login', () => {
    it('returns tokens and profile for valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-jti' as never);
      prisma.user.update.mockResolvedValue(mockUser as any);

      const result = await service.login('john.doe', 'password');

      expect(result.accessToken).toBe('mock.jwt.token');
      expect(result.refreshToken).toBe('mock.jwt.token');
      expect(result.user).toEqual({
        id: 1,
        username: 'john.doe',
        role: Role.STUDENT,
        fullName: 'John Doe',
        email: 'john@uni.edu',
      });
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { refreshToken: 'hashed-jti' } }),
      );
    });

    it('throws 401 "Invalid credentials" when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login('nobody', 'password')).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });

    it('throws 401 "Account is disabled" when user is inactive', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, isActive: false } as any);

      await expect(service.login('john.doe', 'password')).rejects.toThrow(
        new UnauthorizedException('Account is disabled'),
      );
    });

    it('throws 401 "Invalid credentials" when password is wrong', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.login('john.doe', 'wrongpassword')).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });
  });

  describe('refresh', () => {
    it('returns new tokens for valid refresh token', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 1, jti: 'test-uuid' });
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, refreshToken: 'hashed-jti' } as any);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('new-hashed-jti' as never);
      prisma.user.update.mockResolvedValue(mockUser as any);

      const result = await service.refresh('valid.refresh.token');

      expect(result.accessToken).toBe('mock.jwt.token');
      expect(result.refreshToken).toBe('mock.jwt.token');
    });

    it('throws 401 "Invalid refresh token" when JWT verification fails', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(service.refresh('expired.token')).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });

    it('throws 401 "Invalid refresh token" when user not found', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 99, jti: 'test-uuid' });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.refresh('valid.token')).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });

    it('throws 401 "Invalid refresh token" when no stored token in DB', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 1, jti: 'test-uuid' });
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, refreshToken: null } as any);

      await expect(service.refresh('valid.token')).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });

    it('throws 401 "Invalid refresh token" when jti does not match stored hash', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 1, jti: 'test-uuid' });
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, refreshToken: 'hashed-jti' } as any);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.refresh('tampered.token')).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });
  });

  describe('logout', () => {
    it('sets refreshToken to null in DB', async () => {
      prisma.user.update.mockResolvedValue(mockUser as any);

      await service.logout(1);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { refreshToken: null },
      });
    });
  });

  describe('getMe', () => {
    it('returns profile for STUDENT user', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser as any);

      const result = await service.getMe(1);

      expect(result).toEqual({
        id: 1,
        username: 'john.doe',
        role: Role.STUDENT,
        fullName: 'John Doe',
        email: 'john@uni.edu',
      });
    });

    it('returns profile for LECTURER user', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        role: Role.LECTURER,
        student: null,
        lecturer: { fullName: 'Prof. Smith', email: 'smith@uni.edu' },
      } as any);

      const result = await service.getMe(1);

      expect(result.fullName).toBe('Prof. Smith');
      expect(result.email).toBe('smith@uni.edu');
    });

    it('returns null fullName and email for ADMIN user', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        role: Role.ADMIN,
        student: null,
        lecturer: null,
      } as any);

      const result = await service.getMe(1);

      expect(result.fullName).toBeNull();
      expect(result.email).toBeNull();
    });

    it('throws UnauthorizedException when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe(99)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });
  });
});
