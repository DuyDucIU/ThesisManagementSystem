import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { StudentService } from './student.service';
import { PrismaService } from '../prisma/prisma.service';

describe('StudentService', () => {
  let service: StudentService;
  let prisma: {
    student: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      create: jest.Mock;
    };
    enrollment: {
      deleteMany: jest.Mock;
    };
    thesis: { count: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentService,
        {
          provide: PrismaService,
          useValue: {
            student: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              create: jest.fn(),
            },
            enrollment: {
              deleteMany: jest.fn(),
            },
            thesis: { count: jest.fn() },
            $transaction: jest.fn((queries) => Promise.resolve(queries)),
          },
        },
      ],
    }).compile();

    service = module.get<StudentService>(StudentService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── findAll ─────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    const mockStudents = [
      {
        id: 1,
        studentId: 'ITITWE22055',
        fullName: 'Vo Gia Kiet',
        email: 'ititwe22055@student.hcmiu.edu.vn',
        userId: null,
      },
      {
        id: 2,
        studentId: 'ITIT22001',
        fullName: 'Nguyen Van An',
        email: 'itit22001@student.hcmiu.edu.vn',
        userId: 5,
      },
    ];

    it('returns paginated students with default page and limit', async () => {
      prisma.student.findMany.mockResolvedValue(mockStudents);
      prisma.student.count.mockResolvedValue(2);

      const result = await service.findAll({});

      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.data).toHaveLength(2);
    });

    it('maps userId presence to hasAccount boolean', async () => {
      prisma.student.findMany.mockResolvedValue(mockStudents);
      prisma.student.count.mockResolvedValue(2);

      const result = await service.findAll({});

      expect(result.data[0].hasAccount).toBe(false);
      expect(result.data[1].hasAccount).toBe(true);
    });

    it('applies page and limit to skip/take', async () => {
      prisma.student.findMany.mockResolvedValue([]);
      prisma.student.count.mockResolvedValue(0);

      await service.findAll({ page: 3, limit: 10 });

      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('applies search filter to fullName, studentId, and email', async () => {
      prisma.student.findMany.mockResolvedValue([]);
      prisma.student.count.mockResolvedValue(0);

      await service.findAll({ search: 'Nguyen' });

      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { fullName: { contains: 'Nguyen' } },
              { studentId: { contains: 'Nguyen' } },
              { email: { contains: 'Nguyen' } },
            ],
          },
        }),
      );
    });

    it('filters by hasAccount: true (userId not null)', async () => {
      prisma.student.findMany.mockResolvedValue([]);
      prisma.student.count.mockResolvedValue(0);

      await service.findAll({ hasAccount: true });

      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: { not: null } },
        }),
      );
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────────

  describe('update', () => {
    const mockStudent = {
      id: 1,
      studentId: 'ITITWE22055',
      fullName: 'Vo Gia Kiet',
      email: 'ititwe22055@student.hcmiu.edu.vn',
      userId: null,
    };

    it('throws NotFoundException when student does not exist', async () => {
      prisma.student.findUnique.mockResolvedValue(null);

      await expect(
        service.update(999, { fullName: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when no fields are provided', async () => {
      prisma.student.findUnique.mockResolvedValue(mockStudent);

      await expect(service.update(1, {})).rejects.toThrow(
        new BadRequestException('At least one field must be provided'),
      );
    });

    it('updates fullName and returns student shape with hasAccount', async () => {
      prisma.student.findUnique.mockResolvedValue(mockStudent);
      prisma.student.update.mockResolvedValue({
        ...mockStudent,
        fullName: 'Updated Name',
      });

      const result = await service.update(1, { fullName: 'Updated Name' });

      expect(prisma.student.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { fullName: 'Updated Name' },
      });
      expect(result).toEqual({
        id: 1,
        studentId: 'ITITWE22055',
        fullName: 'Updated Name',
        email: 'ititwe22055@student.hcmiu.edu.vn',
        hasAccount: false,
      });
    });

    it('throws BadRequestException on studentId duplicate (P2002)', async () => {
      prisma.student.findUnique.mockResolvedValue(mockStudent);
      const p2002 = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: 'students_student_id_key' },
        },
      );
      prisma.student.update.mockRejectedValue(p2002);

      await expect(
        service.update(1, { studentId: 'DUPLICATE' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException on email duplicate (P2002)', async () => {
      prisma.student.findUnique.mockResolvedValue(mockStudent);
      const p2002 = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: 'students_email_key' },
        },
      );
      prisma.student.update.mockRejectedValue(p2002);

      await expect(
        service.update(1, { email: 'dup@student.hcmiu.edu.vn' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── remove ──────────────────────────────────────────────────────────────────

  describe('remove', () => {
    const mockStudent = {
      id: 1,
      studentId: 'ITITWE22055',
      fullName: 'Vo Gia Kiet',
      email: 'ititwe22055@student.hcmiu.edu.vn',
      userId: null,
    };

    it('throws NotFoundException when student does not exist', async () => {
      prisma.student.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when student has thesis records', async () => {
      prisma.student.findUnique.mockResolvedValue(mockStudent);
      prisma.thesis.count.mockResolvedValue(1);

      await expect(service.remove(1)).rejects.toThrow(
        new ConflictException('Cannot delete student with active thesis work'),
      );
      expect(prisma.enrollment.deleteMany).not.toHaveBeenCalled();
      expect(prisma.student.delete).not.toHaveBeenCalled();
    });

    it('deletes semesterStudent records then student when no thesis exists', async () => {
      prisma.student.findUnique.mockResolvedValue(mockStudent);
      prisma.thesis.count.mockResolvedValue(0);
      prisma.enrollment.deleteMany.mockResolvedValue({ count: 1 });
      prisma.student.delete.mockResolvedValue(mockStudent);

      await service.remove(1);

      expect(prisma.enrollment.deleteMany).toHaveBeenCalledWith({
        where: { studentId: 1 },
      });
      expect(prisma.student.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('deletes student with no semesterStudent records', async () => {
      prisma.student.findUnique.mockResolvedValue(mockStudent);
      prisma.thesis.count.mockResolvedValue(0);
      prisma.enrollment.deleteMany.mockResolvedValue({ count: 0 });
      prisma.student.delete.mockResolvedValue(mockStudent);

      await service.remove(1);

      expect(prisma.enrollment.deleteMany).toHaveBeenCalledWith({
        where: { studentId: 1 },
      });
      expect(prisma.student.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });

  // ─── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates and returns a student with hasAccount: false', async () => {
      const dto = {
        studentId: 'ITITIU21001',
        fullName: 'Nguyen Van A',
        email: 'nvana@student.hcmiu.edu.vn',
      };
      prisma.student.create.mockResolvedValue({
        id: 10,
        studentId: dto.studentId,
        fullName: dto.fullName,
        email: dto.email,
        userId: null,
      });

      const result = await service.create(dto);

      expect(prisma.student.create).toHaveBeenCalledWith({
        data: {
          studentId: dto.studentId,
          fullName: dto.fullName,
          email: dto.email,
        },
      });
      expect(result).toEqual({
        id: 10,
        studentId: dto.studentId,
        fullName: dto.fullName,
        email: dto.email,
        hasAccount: false,
      });
    });

    it('throws BadRequestException on studentId duplicate (P2002)', async () => {
      const p2002 = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: 'students_student_id_key' },
        },
      );
      prisma.student.create.mockRejectedValue(p2002);

      await expect(
        service.create({
          studentId: 'DUP',
          fullName: 'Name',
          email: 'a@b.com',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException on email duplicate (P2002)', async () => {
      const p2002 = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: 'students_email_key' },
        },
      );
      prisma.student.create.mockRejectedValue(p2002);

      await expect(
        service.create({
          studentId: 'NEW001',
          fullName: 'Name',
          email: 'dup@student.hcmiu.edu.vn',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
