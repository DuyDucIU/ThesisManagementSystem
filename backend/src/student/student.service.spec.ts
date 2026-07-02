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

const STUDENT_ID_1 = '11111111-1111-1111-1111-111111111111';
const STUDENT_ID_2 = '22222222-2222-2222-2222-222222222222';
const STUDENT_ID_3 = '33333333-3333-3333-3333-333333333333';
const STUDENT_ID_10 = '10101010-1010-1010-1010-101010101010';
const NON_EXISTENT_ID = '99999999-9999-9999-9999-999999999999';
const USER_ID_5 = 'a5555555-5555-5555-5555-555555555555';
const USER_ID_8 = 'a8888888-8888-8888-8888-888888888888';
const USER_ID_10 = 'a1010101-1010-1010-1010-101010101010';
const USER_ID_11 = 'a1111111-1111-1111-1111-111111111111';

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
        id: STUDENT_ID_1, studentId: 'ITITWE22055', fullName: 'Vo Gia Kiet',
        email: 'ititwe22055@student.hcmiu.edu.vn',
        userId: null,
        user: null,
      },
      {
        id: STUDENT_ID_2, studentId: 'ITIT22001', fullName: 'Nguyen Van An',
        email: 'itit22001@student.hcmiu.edu.vn',
        userId: USER_ID_5,
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
        { id: STUDENT_ID_1, studentId: 'ITITIU21001', fullName: 'Nguyen Van A', email: 'a@b.com', userId: USER_ID_5, user: { isActive: true } },
        { id: STUDENT_ID_2, studentId: 'ITITIU21002', fullName: 'Tran Thi B',   email: 'b@b.com', userId: null, user: null },
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
      id: STUDENT_ID_1,
      studentId: 'ITITWE22055',
      fullName: 'Vo Gia Kiet',
      email: 'ititwe22055@student.hcmiu.edu.vn',
      userId: null,
    };

    it('throws NotFoundException when student does not exist', async () => {
      prisma.student.findUnique.mockResolvedValue(null);

      await expect(
        service.update(NON_EXISTENT_ID, { fullName: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when no fields are provided', async () => {
      prisma.student.findUnique.mockResolvedValue(mockStudent);

      await expect(service.update(STUDENT_ID_1, {})).rejects.toThrow(
        new BadRequestException('At least one field must be provided'),
      );
    });

    it('updates fullName and returns student shape with hasAccount', async () => {
      prisma.student.findUnique.mockResolvedValue(mockStudent);
      prisma.student.update.mockResolvedValue({
        ...mockStudent,
        fullName: 'Updated Name',
      });

      const result = await service.update(STUDENT_ID_1, { fullName: 'Updated Name' });

      expect(prisma.student.update).toHaveBeenCalledWith({
        where: { id: STUDENT_ID_1 },
        data: { fullName: 'Updated Name' },
      });
      expect(result).toEqual({
        id: STUDENT_ID_1,
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
        service.update(STUDENT_ID_1, { studentId: 'DUPLICATE' }),
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
        service.update(STUDENT_ID_1, { email: 'dup@student.hcmiu.edu.vn' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── remove ──────────────────────────────────────────────────────────────────

  describe('remove', () => {
    const mockStudent = {
      id: STUDENT_ID_1,
      studentId: 'ITITWE22055',
      fullName: 'Vo Gia Kiet',
      email: 'ititwe22055@student.hcmiu.edu.vn',
      userId: null,
    };

    it('throws NotFoundException when student does not exist', async () => {
      prisma.student.findUnique.mockResolvedValue(null);

      await expect(service.remove(NON_EXISTENT_ID)).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when student has thesis records', async () => {
      prisma.student.findUnique.mockResolvedValue(mockStudent);
      prisma.thesis.count.mockResolvedValue(1);

      await expect(service.remove(STUDENT_ID_1)).rejects.toThrow(
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

      await service.remove(STUDENT_ID_1);

      expect(prisma.enrollment.deleteMany).toHaveBeenCalledWith({
        where: { studentId: STUDENT_ID_1 },
      });
      expect(prisma.student.delete).toHaveBeenCalledWith({ where: { id: STUDENT_ID_1 } });
    });

    it('deletes student with no semesterStudent records', async () => {
      prisma.student.findUnique.mockResolvedValue(mockStudent);
      prisma.thesis.count.mockResolvedValue(0);
      prisma.enrollment.deleteMany.mockResolvedValue({ count: 0 });
      prisma.student.delete.mockResolvedValue(mockStudent);

      await service.remove(STUDENT_ID_1);

      expect(prisma.enrollment.deleteMany).toHaveBeenCalledWith({
        where: { studentId: STUDENT_ID_1 },
      });
      expect(prisma.student.delete).toHaveBeenCalledWith({ where: { id: STUDENT_ID_1 } });
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
        id: STUDENT_ID_10,
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
        id: STUDENT_ID_10,
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
      id: STUDENT_ID_1,
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

      await expect(service.activateAccount(NON_EXISTENT_ID)).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when student already has an account', async () => {
      prisma.student.findUnique.mockResolvedValue({ ...mockStudent, userId: USER_ID_5 });

      await expect(service.activateAccount(STUDENT_ID_1)).rejects.toThrow(
        new ConflictException('Student already has an account'),
      );
    });

    it('hashes studentId, creates user + links student, returns account shape', async () => {
      prisma.student.findUnique.mockResolvedValue(mockStudent);
      prisma.user.create.mockResolvedValue({ id: USER_ID_10 });
      prisma.student.update.mockResolvedValue({});

      const result = await service.activateAccount(STUDENT_ID_1);

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
        where: { id: STUDENT_ID_1 },
        data: { userId: USER_ID_10 },
      });
      expect(result).toEqual({
        id: STUDENT_ID_1,
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
      id: STUDENT_ID_1,
      studentId: 'ITITIU21001',
      fullName: 'Nguyen Van A',
      email: 'a@student.hcmiu.edu.vn',
      userId: USER_ID_5,
    };

    it('throws NotFoundException when student not found', async () => {
      prisma.student.findUnique.mockResolvedValue(null);

      await expect(service.toggleAccount(NON_EXISTENT_ID, { isActive: false })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ConflictException when student has no account', async () => {
      prisma.student.findUnique.mockResolvedValue({ ...mockStudentWithAccount, userId: null });

      await expect(service.toggleAccount(STUDENT_ID_1, { isActive: false })).rejects.toThrow(
        new ConflictException('Student has no account to modify'),
      );
    });

    it('deactivates account — calls user.update with isActive:false and returns shape', async () => {
      prisma.student.findUnique.mockResolvedValue(mockStudentWithAccount);
      prisma.user.update.mockResolvedValue({});

      const result = await service.toggleAccount(STUDENT_ID_1, { isActive: false });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID_5 },
        data: { isActive: false },
      });
      expect(result).toEqual({
        id: STUDENT_ID_1,
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

      const result = await service.toggleAccount(STUDENT_ID_1, { isActive: true });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID_5 },
        data: { isActive: true },
      });
      expect(result).toEqual({
        id: STUDENT_ID_1,
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

      const result = await service.activateBulk({ ids: [STUDENT_ID_1, STUDENT_ID_2] });

      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(result).toEqual({ activated: 0, skipped: 2 });
    });

    it('activates students without accounts and skips those with', async () => {
      const noAccountStudents = [
        { id: STUDENT_ID_1, studentId: 'ITITIU21001', fullName: 'A', email: 'a@b.com', userId: null },
      ];
      prisma.student.findMany.mockResolvedValue(noAccountStudents);
      prisma.user.create.mockResolvedValue({ id: USER_ID_10 });
      prisma.student.update.mockResolvedValue({});

      const result = await service.activateBulk({ ids: [STUDENT_ID_1, STUDENT_ID_2] });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith('ITITIU21001', 10);
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
      expect(prisma.student.update).toHaveBeenCalledWith({
        where: { id: STUDENT_ID_1 },
        data: { userId: USER_ID_10 },
      });
      expect(result).toEqual({ activated: 1, skipped: 1 });
    });

    it('activates multiple students — creates user and links each', async () => {
      const students = [
        { id: STUDENT_ID_1, studentId: 'ITITIU21001', fullName: 'A', email: 'a@b.com', userId: null },
        { id: STUDENT_ID_2, studentId: 'ITITIU21002', fullName: 'B', email: 'b@b.com', userId: null },
      ];
      prisma.student.findMany.mockResolvedValue(students);
      prisma.user.create
        .mockResolvedValueOnce({ id: USER_ID_10 })
        .mockResolvedValueOnce({ id: USER_ID_11 });
      prisma.student.update.mockResolvedValue({});

      const result = await service.activateBulk({ ids: [STUDENT_ID_1, STUDENT_ID_2] });

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

      const result = await service.toggleAccountBulk({ ids: [STUDENT_ID_1, STUDENT_ID_2], isActive: false });

      expect(prisma.user.updateMany).not.toHaveBeenCalled();
      expect(result).toEqual({ updated: 0, skipped: 2 });
    });

    it('updates isActive for all students that have accounts', async () => {
      prisma.student.findMany.mockResolvedValue([
        { userId: USER_ID_5 },
        { userId: USER_ID_8 },
      ]);
      prisma.user.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.toggleAccountBulk({ ids: [STUDENT_ID_1, STUDENT_ID_2, STUDENT_ID_3], isActive: false });

      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [USER_ID_5, USER_ID_8] } },
        data: { isActive: false },
      });
      expect(result).toEqual({ updated: 2, skipped: 1 });
    });

    it('reactivates accounts — passes isActive:true to updateMany', async () => {
      prisma.student.findMany.mockResolvedValue([{ userId: USER_ID_5 }]);
      prisma.user.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.toggleAccountBulk({ ids: [STUDENT_ID_1], isActive: true });

      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [USER_ID_5] } },
        data: { isActive: true },
      });
      expect(result).toEqual({ updated: 1, skipped: 0 });
    });
  });
});
