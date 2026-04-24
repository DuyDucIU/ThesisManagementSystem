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
    thesisReview: { count: jest.Mock };
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
      thesisReview: { count: jest.fn() },
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
        { code: 'P2002', clientVersion: '5.0.0', meta: { target: ['username'] } },
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

  // ─── findAll ─────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    const mockLecturers = [
      { id: 1, lecturerId: 'GV001', fullName: 'Nguyen Van A', email: 'nva@x.com', title: 'Dr.', maxStudents: 5, userId: 99 },
      { id: 2, lecturerId: 'GV002', fullName: 'Tran Thi B', email: 'ttb@x.com', title: null, maxStudents: 3, userId: 100 },
    ];

    it('returns paginated lecturers with default page and limit', async () => {
      prisma.lecturer.findMany.mockResolvedValue(mockLecturers);
      prisma.lecturer.count.mockResolvedValue(2);

      const result = await service.findAll({});

      expect(prisma.lecturer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20, orderBy: { fullName: 'asc' } }),
      );
      expect(result).toEqual({
        data: [
          { id: 1, lecturerId: 'GV001', fullName: 'Nguyen Van A', email: 'nva@x.com', title: 'Dr.', maxStudents: 5 },
          { id: 2, lecturerId: 'GV002', fullName: 'Tran Thi B', email: 'ttb@x.com', title: null, maxStudents: 3 },
        ],
        total: 2,
        page: 1,
        limit: 20,
      });
    });

    it('applies page and limit to skip/take', async () => {
      prisma.lecturer.findMany.mockResolvedValue([]);
      prisma.lecturer.count.mockResolvedValue(0);

      await service.findAll({ page: 3, limit: 10 });

      expect(prisma.lecturer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('applies search filter to fullName, lecturerId, and email', async () => {
      prisma.lecturer.findMany.mockResolvedValue([]);
      prisma.lecturer.count.mockResolvedValue(0);

      await service.findAll({ search: 'Nguyen' });

      expect(prisma.lecturer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { fullName: { contains: 'Nguyen' } },
              { lecturerId: { contains: 'Nguyen' } },
              { email: { contains: 'Nguyen' } },
            ],
          },
        }),
      );
    });

    it('strips userId from response', async () => {
      prisma.lecturer.findMany.mockResolvedValue([mockLecturers[0]]);
      prisma.lecturer.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result.data[0]).not.toHaveProperty('userId');
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns the lecturer response when found', async () => {
      prisma.lecturer.findUnique.mockResolvedValue(mockLecturer);

      const result = await service.findOne(1);

      expect(prisma.lecturer.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(lecturerResponse);
    });

    it('throws NotFoundException when lecturer does not exist', async () => {
      prisma.lecturer.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('throws NotFoundException when lecturer does not exist', async () => {
      prisma.lecturer.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { fullName: 'New Name' })).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when no fields are provided', async () => {
      prisma.lecturer.findUnique.mockResolvedValue(mockLecturer);

      await expect(service.update(1, {})).rejects.toThrow(
        new BadRequestException('At least one field must be provided'),
      );
    });

    it('updates fullName and returns response without userId', async () => {
      prisma.lecturer.findUnique.mockResolvedValue(mockLecturer);
      prisma.lecturer.update.mockResolvedValue({ ...mockLecturer, fullName: 'Updated Name' });

      const result = await service.update(1, { fullName: 'Updated Name' });

      expect(prisma.lecturer.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { fullName: 'Updated Name' },
      });
      expect(result).toEqual({ ...lecturerResponse, fullName: 'Updated Name' });
      expect(result).not.toHaveProperty('userId');
    });

    it('updates only the provided fields', async () => {
      prisma.lecturer.findUnique.mockResolvedValue(mockLecturer);
      prisma.lecturer.update.mockResolvedValue({ ...mockLecturer, maxStudents: 8 });

      await service.update(1, { maxStudents: 8 });

      expect(prisma.lecturer.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { maxStudents: 8 },
      });
    });

    it('throws ConflictException on email duplicate (P2002)', async () => {
      prisma.lecturer.findUnique.mockResolvedValue(mockLecturer);
      const p2002 = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.0.0', meta: { target: 'lecturers_email_key' } },
      );
      prisma.lecturer.update.mockRejectedValue(p2002);

      await expect(service.update(1, { email: 'dup@x.com' })).rejects.toThrow(ConflictException);
    });
  });

  // ─── remove ──────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('throws NotFoundException when lecturer does not exist', async () => {
      prisma.lecturer.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when lecturer has topics', async () => {
      prisma.lecturer.findUnique.mockResolvedValue(mockLecturer);
      prisma.topic.count.mockResolvedValue(2);

      await expect(service.remove(1)).rejects.toThrow(
        new ConflictException('Cannot delete lecturer with existing topics'),
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('throws ConflictException when lecturer is assigned as thesis reviewer', async () => {
      prisma.lecturer.findUnique.mockResolvedValue(mockLecturer);
      prisma.topic.count.mockResolvedValue(0);
      prisma.thesis.count.mockResolvedValue(1);

      await expect(service.remove(1)).rejects.toThrow(
        new ConflictException('Cannot delete lecturer assigned as thesis reviewer'),
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('throws ConflictException when lecturer has thesis reviews', async () => {
      prisma.lecturer.findUnique.mockResolvedValue(mockLecturer);
      prisma.topic.count.mockResolvedValue(0);
      prisma.thesis.count.mockResolvedValue(0);
      prisma.thesisReview.count.mockResolvedValue(1);

      await expect(service.remove(1)).rejects.toThrow(
        new ConflictException('Cannot delete lecturer with existing thesis reviews'),
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('deletes lecturer then user in a transaction when no constraints violated', async () => {
      prisma.lecturer.findUnique.mockResolvedValue(mockLecturer);
      prisma.topic.count.mockResolvedValue(0);
      prisma.thesis.count.mockResolvedValue(0);
      prisma.thesisReview.count.mockResolvedValue(0);
      prisma.lecturer.delete.mockResolvedValue(mockLecturer);
      prisma.user.delete.mockResolvedValue({});

      await service.remove(1);

      expect(prisma.lecturer.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 99 } });
      expect(prisma.$transaction).toHaveBeenCalledWith([
        expect.anything(),
        expect.anything(),
      ]);
    });
  });
});
