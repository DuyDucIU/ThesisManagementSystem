import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { LecturerService } from './lecturer.service';
import { PrismaService } from '../prisma/prisma.service';

const mockLecturer = {
  id: 1,
  lecturerId: 'GV001',
  fullName: 'Nguyen Van A',
  email: 'nguyen@hcmiu.edu.vn',
  title: 'Dr.',
  maxStudents: 5,
  userId: 99,
};

const lecturerResponse = {
  id: 1,
  lecturerId: 'GV001',
  fullName: 'Nguyen Van A',
  email: 'nguyen@hcmiu.edu.vn',
  title: 'Dr.',
  maxStudents: 5,
};

describe('LecturerService', () => {
  let service: LecturerService;
  let prisma: {
    lecturer: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    user: {
      create: jest.Mock;
      delete: jest.Mock;
    };
    topic: { count: jest.Mock };
    thesis: { count: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      lecturer: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      user: {
        create: jest.fn(),
        delete: jest.fn(),
      },
      topic: { count: jest.fn() },
      thesis: { count: jest.fn() },
      $transaction: jest.fn().mockImplementation((arg) => {
        if (typeof arg === 'function') return arg(prisma);
        return Promise.resolve(arg);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LecturerService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<LecturerService>(LecturerService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    beforeEach(() => {
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed_gv001' as never);
    });

    it('hashes lecturerId and creates user + lecturer in a transaction', async () => {
      const mockUser = { id: 99 };
      prisma.user.create.mockResolvedValue(mockUser);
      prisma.lecturer.create.mockResolvedValue(mockLecturer);

      const dto = {
        lecturerId: 'GV001',
        fullName: 'Nguyen Van A',
        email: 'nguyen@hcmiu.edu.vn',
        title: 'Dr.',
        maxStudents: 5,
      };

      const result = await service.create(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith('GV001', 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          username: 'GV001',
          passwordHash: 'hashed_gv001',
          role: Role.LECTURER,
          isActive: true,
        },
      });
      expect(prisma.lecturer.create).toHaveBeenCalledWith({
        data: {
          lecturerId: 'GV001',
          fullName: 'Nguyen Van A',
          email: 'nguyen@hcmiu.edu.vn',
          title: 'Dr.',
          maxStudents: 5,
          userId: 99,
        },
      });
      expect(result).toEqual(lecturerResponse);
    });

    it('defaults maxStudents to 5 when not provided', async () => {
      prisma.user.create.mockResolvedValue({ id: 99 });
      prisma.lecturer.create.mockResolvedValue({ ...mockLecturer, maxStudents: 5 });

      await service.create({
        lecturerId: 'GV001',
        fullName: 'Nguyen Van A',
        email: 'nguyen@hcmiu.edu.vn',
      });

      expect(prisma.lecturer.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ maxStudents: 5 }) }),
      );
    });

    it('throws ConflictException on lecturerId duplicate (P2002)', async () => {
      const p2002 = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.0.0', meta: { target: 'lecturers_lecturer_id_key' } },
      );
      prisma.user.create.mockRejectedValue(p2002);

      await expect(
        service.create({ lecturerId: 'GV001', fullName: 'Name', email: 'a@b.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException on email duplicate (P2002)', async () => {
      const p2002 = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.0.0', meta: { target: 'lecturers_email_key' } },
      );
      prisma.user.create.mockResolvedValue({ id: 99 });
      prisma.lecturer.create.mockRejectedValue(p2002);

      await expect(
        service.create({ lecturerId: 'GV001', fullName: 'Name', email: 'dup@x.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
