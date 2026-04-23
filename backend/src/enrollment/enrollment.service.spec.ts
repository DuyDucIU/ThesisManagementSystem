import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { SemesterStatus } from '@prisma/client';
import { EnrollmentService } from './enrollment.service';
import { PrismaService } from '../prisma/prisma.service';

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

const mockClosedSemester = { ...mockActiveSemester, id: 2, status: SemesterStatus.CLOSED };
const mockInactiveSemester = { ...mockActiveSemester, id: 3, status: SemesterStatus.INACTIVE };

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
            id: 1, studentId: 'ITITIU20001', fullName: 'Nguyen Van A',
            email: 'a@student.hcmiu.edu.vn', userId: 42,
          },
        },
      ]);
      prisma.enrollment.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(prisma.semester.findFirst).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
      });
      expect(result.semester).toEqual({
        id: 1, code: 'HK1-2025', name: 'HK1',
      });
      expect(result.data).toEqual([
        {
          enrollmentId: 10,
          status: 'ASSIGNED',
          student: {
            id: 1, studentId: 'ITITIU20001', fullName: 'Nguyen Van A',
            email: 'a@student.hcmiu.edu.vn', hasAccount: true,
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

      expect(prisma.semester.findUnique).toHaveBeenCalledWith({ where: { id: 2 } });
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
        new BadRequestException('No active semester — please specify semesterId'),
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

      await service.findAll({ status: 'ASSIGNED' as any });

      expect(prisma.enrollment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
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
          id: 10, status: 'AVAILABLE',
          student: { id: 1, studentId: 'X', fullName: 'X', email: 'x@x', userId: null },
        },
      ]);
      prisma.enrollment.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result.data[0].student.hasAccount).toBe(false);
    });
  });
});
