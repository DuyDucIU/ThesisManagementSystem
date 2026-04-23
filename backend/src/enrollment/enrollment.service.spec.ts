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

  describe('resolveTargetSemester (internal, tested via parseImport integration later)', () => {
    // Placeholder — we will exercise the helper through findAll and parseImport tests.
    it('placeholder', () => {
      expect(service).toBeDefined();
    });
  });
});
