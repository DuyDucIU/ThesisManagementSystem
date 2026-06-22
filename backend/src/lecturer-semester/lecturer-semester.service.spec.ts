import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LecturerSemesterService } from './lecturer-semester.service';
import { PrismaService } from '../prisma/prisma.service';

describe('LecturerSemesterService', () => {
  let service: LecturerSemesterService;
  let prisma: {
    lecturerSemester: { findUnique: jest.Mock; findFirst: jest.Mock; upsert: jest.Mock; findMany: jest.Mock };
    lecturer: { findUnique: jest.Mock };
    semester: { findFirst: jest.Mock; findUnique: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      lecturerSemester: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
      lecturer: { findUnique: jest.fn() },
      semester: { findFirst: jest.fn(), findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LecturerSemesterService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<LecturerSemesterService>(LecturerSemesterService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('resolveCapacity', () => {
    it('returns maxStudents from LecturerSemester when record exists for the target semester', async () => {
      prisma.lecturerSemester.findUnique.mockResolvedValue({ maxStudents: 8 });

      const result = await service.resolveCapacity(1, 3);

      expect(result).toBe(8);
      expect(prisma.lecturerSemester.findUnique).toHaveBeenCalledWith({
        where: { lecturerId_semesterId: { lecturerId: 1, semesterId: 3 } },
      });
    });

    it('falls back to most recent prior semester when no record for target semester', async () => {
      prisma.lecturerSemester.findUnique.mockResolvedValue(null);
      prisma.semester.findUnique.mockResolvedValue({ startDate: new Date('2026-06-01') });
      prisma.lecturerSemester.findFirst.mockResolvedValue({ maxStudents: 6 });

      const result = await service.resolveCapacity(1, 3);

      expect(result).toBe(6);
      expect(prisma.lecturerSemester.findFirst).toHaveBeenCalledWith({
        where: { lecturerId: 1, semester: { startDate: { lt: expect.any(Date) } } },
        orderBy: { semester: { startDate: 'desc' } },
      });
    });

    it('falls back to Lecturer.maxStudents when no LecturerSemester records exist', async () => {
      prisma.lecturerSemester.findUnique.mockResolvedValue(null);
      prisma.semester.findUnique.mockResolvedValue({ startDate: new Date('2026-06-01') });
      prisma.lecturerSemester.findFirst.mockResolvedValue(null);
      prisma.lecturer.findUnique.mockResolvedValue({ maxStudents: 5 });

      const result = await service.resolveCapacity(1, 3);

      expect(result).toBe(5);
    });
  });

  describe('upsert', () => {
    it('creates or updates a LecturerSemester record', async () => {
      prisma.lecturer.findUnique.mockResolvedValue({ id: 1 });
      prisma.lecturerSemester.upsert.mockResolvedValue({
        lecturerId: 1, semesterId: 3, maxStudents: 8,
      });

      const result = await service.upsert(1, { semesterId: 3, maxStudents: 8 });

      expect(result).toEqual({ lecturerId: 1, semesterId: 3, maxStudents: 8 });
      expect(prisma.lecturerSemester.upsert).toHaveBeenCalledWith({
        where: { lecturerId_semesterId: { lecturerId: 1, semesterId: 3 } },
        update: { maxStudents: 8 },
        create: { lecturerId: 1, semesterId: 3, maxStudents: 8 },
      });
    });

    it('throws NotFoundException when lecturer does not exist', async () => {
      prisma.lecturer.findUnique.mockResolvedValue(null);

      await expect(service.upsert(999, { semesterId: 3, maxStudents: 5 }))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('returns all records when no semesterId filter', async () => {
      prisma.lecturerSemester.findMany.mockResolvedValue([
        { lecturerId: 1, semesterId: 3, maxStudents: 8, lecturer: { id: 1, fullName: 'Dr. A', email: 'a@u.edu' } },
      ]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(prisma.lecturerSemester.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('filters by semesterId when provided', async () => {
      prisma.lecturerSemester.findMany.mockResolvedValue([]);

      await service.findAll(3);

      expect(prisma.lecturerSemester.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { semesterId: 3 } }),
      );
    });
  });
});
