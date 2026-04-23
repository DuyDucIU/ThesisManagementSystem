import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EnrollmentStatus, SemesterStatus } from '@prisma/client';
import { EnrollmentService } from './enrollment.service';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';

function buildExcelBuffer(dataRows: string[][]): Buffer {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Last Name', 'First Name', 'Username', 'StudentID'],
    ...dataRows,
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return Buffer.from(
    XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as ArrayBuffer,
  );
}

const mockActiveSemester = {
  id: 1,
  code: 'HK1-2025',
  name: 'HK1',
  startDate: new Date('2025-09-01'),
  endDate: new Date('2026-01-15'),
  status: SemesterStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockClosedSemester = {
  ...mockActiveSemester,
  id: 2,
  status: SemesterStatus.CLOSED,
};
const mockInactiveSemester = {
  ...mockActiveSemester,
  id: 3,
  status: SemesterStatus.INACTIVE,
};

describe('EnrollmentService', () => {
  let service: EnrollmentService;
  let prisma: {
    semester: { findFirst: jest.Mock; findUnique: jest.Mock };
    student: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
    enrollment: {
      findUnique: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentService,
        {
          provide: PrismaService,
          useValue: {
            semester: { findFirst: jest.fn(), findUnique: jest.fn() },
            student: { findUnique: jest.fn(), upsert: jest.fn() },
            enrollment: {
              findUnique: jest.fn(),
              create: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<EnrollmentService>(EnrollmentService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('returns enrollments for active semester when semesterId omitted', async () => {
      prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
      prisma.enrollment.findMany.mockResolvedValue([
        {
          id: 10,
          status: 'ASSIGNED',
          student: {
            id: 1,
            studentId: 'ITITIU20001',
            fullName: 'Nguyen Van A',
            email: 'a@student.hcmiu.edu.vn',
            userId: 42,
          },
        },
      ]);
      prisma.enrollment.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(prisma.semester.findFirst).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
      });
      expect(result.semester).toEqual({
        id: 1,
        code: 'HK1-2025',
        name: 'HK1',
      });
      expect(result.data).toEqual([
        {
          enrollmentId: 10,
          status: 'ASSIGNED',
          student: {
            id: 1,
            studentId: 'ITITIU20001',
            fullName: 'Nguyen Van A',
            email: 'a@student.hcmiu.edu.vn',
            hasAccount: true,
          },
        },
      ]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('uses explicit semesterId when provided', async () => {
      prisma.semester.findUnique.mockResolvedValue(mockClosedSemester);
      prisma.enrollment.findMany.mockResolvedValue([]);
      prisma.enrollment.count.mockResolvedValue(0);

      await service.findAll({ semesterId: 2 });

      expect(prisma.semester.findUnique).toHaveBeenCalledWith({
        where: { id: 2 },
      });
      expect(prisma.semester.findFirst).not.toHaveBeenCalled();
    });

    it('allows reading from CLOSED semester (unlike import)', async () => {
      prisma.semester.findUnique.mockResolvedValue(mockClosedSemester);
      prisma.enrollment.findMany.mockResolvedValue([]);
      prisma.enrollment.count.mockResolvedValue(0);

      await expect(service.findAll({ semesterId: 2 })).resolves.toBeDefined();
    });

    it('throws 400 when no active and no semesterId', async () => {
      prisma.semester.findFirst.mockResolvedValue(null);

      await expect(service.findAll({})).rejects.toThrow(
        new BadRequestException(
          'No active semester — please specify semesterId',
        ),
      );
    });

    it('throws 404 when semesterId not found', async () => {
      prisma.semester.findUnique.mockResolvedValue(null);

      await expect(service.findAll({ semesterId: 999 })).rejects.toThrow(
        new NotFoundException('Semester #999 not found'),
      );
    });

    it('applies status filter', async () => {
      prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
      prisma.enrollment.findMany.mockResolvedValue([]);
      prisma.enrollment.count.mockResolvedValue(0);

      await service.findAll({ status: EnrollmentStatus.ASSIGNED });

      expect(prisma.enrollment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({
            semesterId: 1,
            status: 'ASSIGNED',
          }),
        }),
      );
    });

    it('applies search filter on student fields', async () => {
      prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
      prisma.enrollment.findMany.mockResolvedValue([]);
      prisma.enrollment.count.mockResolvedValue(0);

      await service.findAll({ search: 'Nguyen' });

      expect(prisma.enrollment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({
            semesterId: 1,
            student: {
              OR: [
                { fullName: { contains: 'Nguyen' } },
                { studentId: { contains: 'Nguyen' } },
                { email: { contains: 'Nguyen' } },
              ],
            },
          }),
        }),
      );
    });

    it('returns hasAccount=false when student.userId is null', async () => {
      prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
      prisma.enrollment.findMany.mockResolvedValue([
        {
          id: 10,
          status: 'AVAILABLE',
          student: {
            id: 1,
            studentId: 'X',
            fullName: 'X',
            email: 'x@x',
            userId: null,
          },
        },
      ]);
      prisma.enrollment.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result.data[0].student.hasAccount).toBe(false);
    });
  });

  describe('parseImport', () => {
    it('throws 400 when no active and no semesterId', async () => {
      prisma.semester.findFirst.mockResolvedValue(null);
      const buffer = buildExcelBuffer([['A', 'B', 'u1', 'S1']]);

      await expect(service.parseImport(buffer, undefined)).rejects.toThrow(
        new BadRequestException(
          'No active semester — please specify semesterId',
        ),
      );
    });

    it('throws 400 when target semester is CLOSED', async () => {
      prisma.semester.findUnique.mockResolvedValue(mockClosedSemester);
      const buffer = buildExcelBuffer([['A', 'B', 'u1', 'S1']]);

      await expect(service.parseImport(buffer, 2)).rejects.toThrow(
        new BadRequestException('Cannot import into a closed semester'),
      );
    });

    it('throws 404 when semester not found', async () => {
      prisma.semester.findUnique.mockResolvedValue(null);
      const buffer = buildExcelBuffer([['A', 'B', 'u1', 'S1']]);

      await expect(service.parseImport(buffer, 999)).rejects.toThrow(
        new NotFoundException('Semester #999 not found'),
      );
    });

    it('throws 400 when file has no data rows', async () => {
      prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
      const buffer = buildExcelBuffer([]);

      await expect(service.parseImport(buffer, undefined)).rejects.toThrow(
        new BadRequestException('File has no data rows'),
      );
    });

    it('returns all valid for clean new rows', async () => {
      prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
      prisma.student.findUnique.mockResolvedValue(null);
      const buffer = buildExcelBuffer([
        ['VO', 'KIET', 'ititwe22055', 'ITITWE22055'],
        ['NGUYEN', 'AN', 'itit22001', 'ITIT22001'],
      ]);

      const result = await service.parseImport(buffer, undefined);

      expect(result.total).toBe(2);
      expect(result.valid).toBe(2);
      expect(result.invalid).toBe(0);
      expect(result.alreadyEnrolled).toBe(0);
      expect(result.semester).toEqual({ id: 1, code: 'HK1-2025', name: 'HK1' });
    });

    it('reports error for row missing last name', async () => {
      prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
      const buffer = buildExcelBuffer([['', 'KIET', 'u', 'S1']]);
      const result = await service.parseImport(buffer, undefined);
      expect(result.invalid).toBe(1);
      expect(result.errors[0]).toEqual({ row: 2, reason: 'Missing last name' });
    });

    it('reports error for row missing first name', async () => {
      prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
      const buffer = buildExcelBuffer([['VO', '', 'u', 'S1']]);
      const result = await service.parseImport(buffer, undefined);
      expect(result.errors[0]).toEqual({
        row: 2,
        reason: 'Missing first name',
      });
    });

    it('reports error for row missing username', async () => {
      prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
      const buffer = buildExcelBuffer([['VO', 'KIET', '', 'S1']]);
      const result = await service.parseImport(buffer, undefined);
      expect(result.errors[0]).toEqual({ row: 2, reason: 'Missing username' });
    });

    it('reports error for row missing studentId', async () => {
      prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
      const buffer = buildExcelBuffer([['VO', 'KIET', 'u', '']]);
      const result = await service.parseImport(buffer, undefined);
      expect(result.errors[0]).toEqual({ row: 2, reason: 'Missing studentId' });
    });

    it('detects duplicate studentId within file', async () => {
      prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
      prisma.student.findUnique.mockResolvedValue(null);
      const buffer = buildExcelBuffer([
        ['VO', 'KIET', 'u1', 'SAME'],
        ['NGUYEN', 'AN', 'u2', 'SAME'],
      ]);

      const result = await service.parseImport(buffer, undefined);

      expect(result.valid).toBe(1);
      expect(result.invalid).toBe(1);
      expect(result.errors[0]).toEqual({
        row: 3,
        reason: 'Duplicate studentId within file',
      });
    });

    it('detects already-enrolled students in target semester', async () => {
      prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
      prisma.student.findUnique.mockResolvedValue({
        id: 5,
        studentId: 'ITITIU20001',
        fullName: 'A',
        email: 'a@x',
        userId: null,
      });
      prisma.enrollment.findUnique.mockResolvedValue({
        id: 20,
        studentId: 5,
        semesterId: 1,
        status: 'AVAILABLE',
      });

      const buffer = buildExcelBuffer([['VO', 'KIET', 'u1', 'ITITIU20001']]);
      const result = await service.parseImport(buffer, undefined);

      expect(result.alreadyEnrolled).toBe(1);
      expect(result.alreadyEnrolledDetails[0]).toEqual({
        row: 2,
        studentId: 'ITITIU20001',
        reason: 'Already enrolled in target semester',
      });
    });

    it('accepts INACTIVE target semester', async () => {
      prisma.semester.findUnique.mockResolvedValue(mockInactiveSemester);
      prisma.student.findUnique.mockResolvedValue(null);
      const buffer = buildExcelBuffer([['VO', 'KIET', 'u1', 'S1']]);

      const result = await service.parseImport(buffer, 3);

      expect(result.valid).toBe(1);
      expect(result.semester.id).toBe(3);
    });
  });

  describe('importEnrollments', () => {
    it('throws 400 when target is CLOSED', async () => {
      prisma.semester.findUnique.mockResolvedValue(mockClosedSemester);
      const buffer = buildExcelBuffer([['A', 'B', 'u', 'S1']]);

      await expect(service.importEnrollments(buffer, 2)).rejects.toThrow(
        new BadRequestException('Cannot import into a closed semester'),
      );
    });

    it('creates student and enrollment for new row', async () => {
      prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
      prisma.student.upsert.mockResolvedValue({
        id: 100,
        studentId: 'ITITIU20002',
        fullName: 'VO KIET',
        email: 'u1@student.hcmiu.edu.vn',
        userId: null,
      });
      prisma.enrollment.findUnique.mockResolvedValue(null);
      prisma.enrollment.create.mockResolvedValue({
        id: 500,
        studentId: 100,
        semesterId: 1,
        status: 'AVAILABLE',
      });
      const buffer = buildExcelBuffer([['VO', 'KIET', 'u1', 'ITITIU20002']]);

      const result = await service.importEnrollments(buffer, undefined);

      expect(prisma.student.upsert).toHaveBeenCalledWith({
        where: { studentId: 'ITITIU20002' },
        update: {},
        create: {
          studentId: 'ITITIU20002',
          fullName: 'VO KIET',
          email: 'u1@student.hcmiu.edu.vn',
        },
      });
      expect(prisma.enrollment.create).toHaveBeenCalledWith({
        data: { studentId: 100, semesterId: 1 },
      });
      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.semester).toEqual({ id: 1, code: 'HK1-2025', name: 'HK1' });
    });

    it('skips existing student already enrolled in target semester', async () => {
      prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
      prisma.student.upsert.mockResolvedValue({
        id: 100,
        studentId: 'ITITIU20002',
        fullName: 'VO KIET',
        email: 'u1@student.hcmiu.edu.vn',
        userId: null,
      });
      prisma.enrollment.findUnique.mockResolvedValue({
        id: 500,
        studentId: 100,
        semesterId: 1,
        status: 'AVAILABLE',
      });
      const buffer = buildExcelBuffer([['VO', 'KIET', 'u1', 'ITITIU20002']]);

      const result = await service.importEnrollments(buffer, undefined);

      expect(prisma.enrollment.create).not.toHaveBeenCalled();
      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.skippedDetails[0]).toEqual({
        row: 2,
        studentId: 'ITITIU20002',
        reason: 'Already enrolled in target semester',
      });
    });

    it('skips row with validation error', async () => {
      prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
      const buffer = buildExcelBuffer([['', 'KIET', 'u1', 'S1']]);

      const result = await service.importEnrollments(buffer, undefined);

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.skippedDetails[0]).toEqual({
        row: 2,
        studentId: null,
        reason: 'Missing last name',
      });
    });

    it('mixed: some imported, some skipped', async () => {
      prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
      prisma.student.upsert
        .mockResolvedValueOnce({
          id: 1,
          studentId: 'S1',
          fullName: 'A B',
          email: 'a@x',
          userId: null,
        })
        .mockResolvedValueOnce({
          id: 2,
          studentId: 'S2',
          fullName: 'C D',
          email: 'c@x',
          userId: null,
        });
      prisma.enrollment.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 99,
          studentId: 2,
          semesterId: 1,
          status: 'AVAILABLE',
        });
      prisma.enrollment.create.mockResolvedValue({
        id: 10,
        studentId: 1,
        semesterId: 1,
        status: 'AVAILABLE',
      });

      const buffer = buildExcelBuffer([
        ['A', 'B', 'u1', 'S1'],
        ['C', 'D', 'u2', 'S2'],
      ]);
      const result = await service.importEnrollments(buffer, undefined);

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(1);
    });
  });
});
