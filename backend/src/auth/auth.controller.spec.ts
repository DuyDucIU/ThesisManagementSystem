import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockProfile = {
    id: 1,
    username: 'john.doe',
    role: 'STUDENT',
    fullName: 'John Doe',
    email: 'john@uni.edu',
  };
  const mockLoginResult = {
    accessToken: 'access.token',
    refreshToken: 'refresh.token',
    user: mockProfile,
  };

  const mockRes = () => ({
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            refresh: jest.fn(),
            logout: jest.fn(),
            getMe: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('login sets refreshToken cookie and returns accessToken + user', async () => {
    authService.login.mockResolvedValue(mockLoginResult as any);
    const res = mockRes();

    const result = await controller.login(
      { username: 'john.doe', password: 'secret' },
      res as any,
    );

    expect(authService.login).toHaveBeenCalledWith('john.doe', 'secret');
    expect(res.cookie).toHaveBeenCalledWith(
      'refreshToken',
      'refresh.token',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(result).toEqual({ accessToken: 'access.token', user: mockProfile });
  });

  it('refresh reads cookie, rotates it, and returns new accessToken', async () => {
    const tokens = { accessToken: 'new.access', refreshToken: 'new.refresh' };
    authService.refresh.mockResolvedValue(tokens);
    const res = mockRes();
    const req = { cookies: { refreshToken: 'old.refresh.token' } };

    const result = await controller.refresh(req as any, res as any);

    expect(authService.refresh).toHaveBeenCalledWith('old.refresh.token');
    expect(res.cookie).toHaveBeenCalledWith(
      'refreshToken',
      'new.refresh',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(result).toEqual({ accessToken: 'new.access' });
  });

  it('refresh throws 401 when cookie is missing', async () => {
    const res = mockRes();
    const req = { cookies: {} };

    await expect(controller.refresh(req as any, res as any)).rejects.toThrow(
      new UnauthorizedException('Missing refresh token'),
    );
  });

  it('logout clears cookie and calls authService.logout', async () => {
    const callOrder: string[] = [];
    authService.logout.mockImplementation(async () => {
      callOrder.push('logout');
    });
    const res = mockRes() as any;
    res.clearCookie.mockImplementation(() => {
      callOrder.push('clearCookie');
    });

    await controller.logout({ id: 42 } as any, res);

    expect(authService.logout).toHaveBeenCalledWith(42);
    expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', { path: '/' });
    expect(callOrder).toEqual(['logout', 'clearCookie']);
  });

  it('getMe calls authService.getMe with userId and returns profile', async () => {
    authService.getMe.mockResolvedValue(mockProfile as any);

    const result = await controller.getMe({ id: 1 } as any);

    expect(authService.getMe).toHaveBeenCalledWith(1);
    expect(result).toBe(mockProfile);
  });
});
