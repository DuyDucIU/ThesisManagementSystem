import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
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
    enrollment: { deleteMany: jest.Mock };
    thesis: { count: jest.Mock };
    user: {
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
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
            user: {
              create: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
            $transaction: jest.fn().mockImplementation((arg) => {
              if (typeof arg === 'function') return arg(prisma);
              return Promise.resolve(arg);
            }),
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
        id: 1, studentId: 'ITITWE22055', fullName: 'Vo Gia Kiet',
        email: 'ititwe22055@student.hcmiu.edu.vn',
        userId: null,
        user: null,
      },
      {
        id: 2, studentId: 'ITIT22001', fullName: 'Nguyen Van An',
        email: 'itit22001@student.hcmiu.edu.vn',
        userId: 5,
        user: { isActive: true },
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

    it('includes isActive from the linked user (active)', async () => {
      prisma.student.findMany.mockResolvedValue([
        { id: 1, studentId: 'ITITIU21001', fullName: 'Nguyen Van A', email: 'a@b.com', userId: 5, user: { isActive: true } },
        { id: 2, studentId: 'ITITIU21002', fullName: 'Tran Thi B',   email: 'b@b.com', userId: null, user: null },
      ]);
      prisma.student.count.mockResolvedValue(2);

      const result = await service.findAll({});

      expect(result.data[0].isActive).toBe(true);
      expect(result.data[1].isActive).toBeNull();
    });

    it('filters by accountStatus: active — passes user.isActive:true in where', async () => {
      prisma.student.findMany.mockResolvedValue([]);
      prisma.student.count.mockResolvedValue(0);

      await service.findAll({ accountStatus: 'active' });

      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { user: { isActive: true } } }),
      );
    });

    it('filters by accountStatus: inactive — passes user.isActive:false in where', async () => {
      prisma.student.findMany.mockResolvedValue([]);
      prisma.student.count.mockResolvedValue(0);

      await service.findAll({ accountStatus: 'inactive' });

      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { user: { isActive: false } } }),
      );
    });

    it('filters by accountStatus: no-account — passes userId:null in where', async () => {
      prisma.student.findMany.mockResolvedValue([]);
      prisma.student.count.mockResolvedValue(0);

      await service.findAll({ accountStatus: 'no-account' });

      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: null } }),
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

  // ─── activateAccount ─────────────────────────────────────────────────────────

  describe('activateAccount', () => {
    const mockStudent = {
      id: 1,
      studentId: 'ITITIU21001',
      fullName: 'Nguyen Van A',
      email: 'a@student.hcmiu.edu.vn',
      userId: null,
    };

    beforeEach(() => {
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed_pw' as never);
    });

    it('throws NotFoundException when student not found', async () => {
      prisma.student.findUnique.mockResolvedValue(null);

      await expect(service.activateAccount(999)).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when student already has an account', async () => {
      prisma.student.findUnique.mockResolvedValue({ ...mockStudent, userId: 5 });

      await expect(service.activateAccount(1)).rejects.toThrow(
        new ConflictException('Student already has an account'),
      );
    });

    it('hashes studentId, creates user + links student, returns account shape', async () => {
      prisma.student.findUnique.mockResolvedValue(mockStudent);
      prisma.user.create.mockResolvedValue({ id: 10 });
      prisma.student.update.mockResolvedValue({});

      const result = await service.activateAccount(1);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith('ITITIU21001', 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          username: 'ITITIU21001',
          passwordHash: 'hashed_pw',
          role: 'STUDENT',
          isActive: true,
        },
      });
      expect(prisma.student.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { userId: 10 },
      });
      expect(result).toEqual({
        id: 1,
        studentId: 'ITITIU21001',
        fullName: 'Nguyen Van A',
        email: 'a@student.hcmiu.edu.vn',
        hasAccount: true,
        isActive: true,
      });
    });
  });

  // ─── toggleAccount ───────────────────────────────────────────────────────────

  describe('toggleAccount', () => {
    const mockStudentWithAccount = {
      id: 1,
      studentId: 'ITITIU21001',
      fullName: 'Nguyen Van A',
      email: 'a@student.hcmiu.edu.vn',
      userId: 5,
    };

    it('throws NotFoundException when student not found', async () => {
      prisma.student.findUnique.mockResolvedValue(null);

      await expect(service.toggleAccount(999, { isActive: false })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ConflictException when student has no account', async () => {
      prisma.student.findUnique.mockResolvedValue({ ...mockStudentWithAccount, userId: null });

      await expect(service.toggleAccount(1, { isActive: false })).rejects.toThrow(
        new ConflictException('Student has no account to modify'),
      );
    });

    it('deactivates account — calls user.update with isActive:false and returns shape', async () => {
      prisma.student.findUnique.mockResolvedValue(mockStudentWithAccount);
      prisma.user.update.mockResolvedValue({});

      const result = await service.toggleAccount(1, { isActive: false });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { isActive: false },
      });
      expect(result).toEqual({
        id: 1,
        studentId: 'ITITIU21001',
        fullName: 'Nguyen Van A',
        email: 'a@student.hcmiu.edu.vn',
        hasAccount: true,
        isActive: false,
      });
    });

    it('reactivates account — calls user.update with isActive:true', async () => {
      prisma.student.findUnique.mockResolvedValue(mockStudentWithAccount);
      prisma.user.update.mockResolvedValue({});

      const result = await service.toggleAccount(1, { isActive: true });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { isActive: true },
      });
      expect(result).toEqual({
        id: 1,
        studentId: 'ITITIU21001',
        fullName: 'Nguyen Van A',
        email: 'a@student.hcmiu.edu.vn',
        hasAccount: true,
        isActive: true,
      });
    });
  });

  // ─── activateBulk ────────────────────────────────────────────────────────────

  describe('activateBulk', () => {
    beforeEach(() => {
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed_pw' as never);
    });

    it('skips all when all ids already have accounts', async () => {
      prisma.student.findMany.mockResolvedValue([]);  // none without account

      const result = await service.activateBulk({ ids: [1, 2] });

      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(result).toEqual({ activated: 0, skipped: 2 });
    });

    it('activates students without accounts and skips those with', async () => {
      const noAccountStudents = [
        { id: 1, studentId: 'ITITIU21001', fullName: 'A', email: 'a@b.com', userId: null },
      ];
      prisma.student.findMany.mockResolvedValue(noAccountStudents);
      prisma.user.create.mockResolvedValue({ id: 10 });
      prisma.student.update.mockResolvedValue({});

      const result = await service.activateBulk({ ids: [1, 2] });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith('ITITIU21001', 10);
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
      expect(prisma.student.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { userId: 10 },
      });
      expect(result).toEqual({ activated: 1, skipped: 1 });
    });

    it('activates multiple students — creates user and links each', async () => {
      const students = [
        { id: 1, studentId: 'ITITIU21001', fullName: 'A', email: 'a@b.com', userId: null },
        { id: 2, studentId: 'ITITIU21002', fullName: 'B', email: 'b@b.com', userId: null },
      ];
      prisma.student.findMany.mockResolvedValue(students);
      prisma.user.create
        .mockResolvedValueOnce({ id: 10 })
        .mockResolvedValueOnce({ id: 11 });
      prisma.student.update.mockResolvedValue({});

      const result = await service.activateBulk({ ids: [1, 2] });

      expect(bcrypt.hash).toHaveBeenCalledTimes(2);
      expect(prisma.user.create).toHaveBeenCalledTimes(2);
      expect(prisma.student.update).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ activated: 2, skipped: 0 });
    });
  });

  // ─── toggleAccountBulk ───────────────────────────────────────────────────────

  describe('toggleAccountBulk', () => {
    it('skips students with no account', async () => {
      prisma.student.findMany.mockResolvedValue([]);  // none with account

      const result = await service.toggleAccountBulk({ ids: [1, 2], isActive: false });

      expect(prisma.user.updateMany).not.toHaveBeenCalled();
      expect(result).toEqual({ updated: 0, skipped: 2 });
    });

    it('updates isActive for all students that have accounts', async () => {
      prisma.student.findMany.mockResolvedValue([
        { userId: 5 },
        { userId: 8 },
      ]);
      prisma.user.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.toggleAccountBulk({ ids: [1, 2, 3], isActive: false });

      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [5, 8] } },
        data: { isActive: false },
      });
      expect(result).toEqual({ updated: 2, skipped: 1 });
    });

    it('reactivates accounts — passes isActive:true to updateMany', async () => {
      prisma.student.findMany.mockResolvedValue([{ userId: 5 }]);
      prisma.user.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.toggleAccountBulk({ ids: [1], isActive: true });

      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [5] } },
        data: { isActive: true },
      });
      expect(result).toEqual({ updated: 1, skipped: 0 });
    });
  });
});
