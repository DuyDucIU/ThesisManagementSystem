import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { SemesterStatus, Prisma } from '@prisma/client';
import { SemesterService } from './semester.service';
import { PrismaService } from '../prisma/prisma.service';

const mockSemester = {
  id: 1,
  code: 'HK1-2025',
  name: 'Học kỳ 1 năm 2025-2026',
  startDate: new Date('2025-09-01'),
  endDate: new Date('2026-01-15'),
  status: SemesterStatus.INACTIVE,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('SemesterService', () => {
  let service: SemesterService;
  let prisma: {
    semester: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    semesterStudent: { count: jest.Mock };
    topic: { count: jest.Mock };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SemesterService,
        {
          provide: PrismaService,
          useValue: {
            semester: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            semesterStudent: { count: jest.fn() },
            topic: { count: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<SemesterService>(SemesterService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns all semesters when no filters', async () => {
      prisma.semester.findMany.mockResolvedValue([mockSemester]);

      const result = await service.findAll({});

      expect(prisma.semester.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([mockSemester]);
    });

    it('filters by search term on name and code', async () => {
      prisma.semester.findMany.mockResolvedValue([mockSemester]);

      await service.findAll({ search: 'HK1' });

      expect(prisma.semester.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ name: { contains: 'HK1' } }, { code: { contains: 'HK1' } }],
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('filters by status', async () => {
      prisma.semester.findMany.mockResolvedValue([mockSemester]);

      await service.findAll({ status: SemesterStatus.ACTIVE });

      expect(prisma.semester.findMany).toHaveBeenCalledWith({
        where: { status: SemesterStatus.ACTIVE },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('filters by startDateFrom and startDateTo', async () => {
      prisma.semester.findMany.mockResolvedValue([mockSemester]);

      await service.findAll({
        startDateFrom: '2025-01-01',
        startDateTo: '2025-12-31',
      });

      expect(prisma.semester.findMany).toHaveBeenCalledWith({
        where: {
          startDate: {
            gte: new Date('2025-01-01'),
            lte: new Date('2025-12-31'),
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  // ─── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns the semester when found', async () => {
      prisma.semester.findUnique.mockResolvedValue(mockSemester);

      const result = await service.findOne(1);

      expect(result).toEqual(mockSemester);
    });

    it('throws NotFoundException when semester does not exist', async () => {
      prisma.semester.findUnique.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(
        new NotFoundException('Semester #99 not found'),
      );
    });
  });

  // ─── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto = {
      code: 'HK1-2025',
      name: 'Học kỳ 1',
      startDate: '2025-09-01',
      endDate: '2026-01-15',
    };

    it('creates a semester with INACTIVE status', async () => {
      prisma.semester.create.mockResolvedValue(mockSemester);

      const result = await service.create(dto);

      expect(prisma.semester.create).toHaveBeenCalledWith({
        data: {
          code: 'HK1-2025',
          name: 'Học kỳ 1',
          startDate: new Date('2025-09-01'),
          endDate: new Date('2026-01-15'),
        },
      });
      expect(result).toEqual(mockSemester);
    });

    it('throws BadRequestException when endDate is not after startDate', async () => {
      await expect(
        service.create({ ...dto, endDate: '2025-09-01' }),
      ).rejects.toThrow(
        new BadRequestException('endDate must be after startDate'),
      );
    });

    it('throws ConflictException on duplicate code (Prisma P2002)', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint',
        {
          code: 'P2002',
          clientVersion: '6.0.0',
        },
      );
      prisma.semester.create.mockRejectedValue(prismaError);

      await expect(service.create(dto)).rejects.toThrow(
        new ConflictException("Semester code 'HK1-2025' already exists"),
      );
    });
  });

  // ─── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates an INACTIVE semester', async () => {
      prisma.semester.findUnique.mockResolvedValue(mockSemester);
      prisma.semester.update.mockResolvedValue({
        ...mockSemester,
        name: 'Updated',
      });

      const result = await service.update(1, { name: 'Updated' });

      expect(prisma.semester.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Updated' },
      });
      expect(result.name).toBe('Updated');
    });

    it('updates multiple fields simultaneously', async () => {
      prisma.semester.findUnique.mockResolvedValue(mockSemester);
      prisma.semester.update.mockResolvedValue({
        ...mockSemester,
        name: 'Updated Name',
        code: 'HK2-2025',
      });

      const result = await service.update(1, {
        name: 'Updated Name',
        code: 'HK2-2025',
      });

      expect(prisma.semester.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Updated Name', code: 'HK2-2025' },
      });
      expect(result.name).toBe('Updated Name');
      expect(result.code).toBe('HK2-2025');
    });

    it('throws ConflictException when semester is ACTIVE', async () => {
      prisma.semester.findUnique.mockResolvedValue({
        ...mockSemester,
        status: SemesterStatus.ACTIVE,
      });

      await expect(service.update(1, { name: 'x' })).rejects.toThrow(
        new ConflictException('Only INACTIVE semesters can be edited'),
      );
    });

    it('throws ConflictException when semester is CLOSED', async () => {
      prisma.semester.findUnique.mockResolvedValue({
        ...mockSemester,
        status: SemesterStatus.CLOSED,
      });

      await expect(service.update(1, { name: 'x' })).rejects.toThrow(
        new ConflictException('Only INACTIVE semesters can be edited'),
      );
    });

    it('throws BadRequestException when body is empty', async () => {
      prisma.semester.findUnique.mockResolvedValue(mockSemester);

      await expect(service.update(1, {})).rejects.toThrow(
        new BadRequestException(
          'At least one field must be provided for update',
        ),
      );
    });

    it('throws BadRequestException when updated dates result in endDate <= startDate', async () => {
      prisma.semester.findUnique.mockResolvedValue(mockSemester);

      await expect(
        service.update(1, { endDate: '2025-08-31' }),
      ).rejects.toThrow(
        new BadRequestException('endDate must be after startDate'),
      );
    });

    it('throws ConflictException on duplicate code (Prisma P2002)', async () => {
      prisma.semester.findUnique.mockResolvedValue(mockSemester);
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint',
        {
          code: 'P2002',
          clientVersion: '6.0.0',
        },
      );
      prisma.semester.update.mockRejectedValue(prismaError);

      await expect(service.update(1, { code: 'DUPLICATE' })).rejects.toThrow(
        new ConflictException('Semester code already exists'),
      );
    });
  });

  // ─── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('deletes an INACTIVE semester with no linked data', async () => {
      prisma.semester.findUnique.mockResolvedValue(mockSemester);
      prisma.semesterStudent.count.mockResolvedValue(0);
      prisma.topic.count.mockResolvedValue(0);
      prisma.semester.delete.mockResolvedValue(mockSemester);

      const result = await service.remove(1);

      expect(prisma.semester.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(mockSemester);
    });

    it('throws ConflictException when semester is not INACTIVE', async () => {
      prisma.semester.findUnique.mockResolvedValue({
        ...mockSemester,
        status: SemesterStatus.ACTIVE,
      });

      await expect(service.remove(1)).rejects.toThrow(
        new ConflictException('Only INACTIVE semesters can be deleted'),
      );
      expect(prisma.semesterStudent.count).not.toHaveBeenCalled();
      expect(prisma.topic.count).not.toHaveBeenCalled();
    });

    it('throws ConflictException when semester is CLOSED', async () => {
      prisma.semester.findUnique.mockResolvedValue({
        ...mockSemester,
        status: SemesterStatus.CLOSED,
      });

      await expect(service.remove(1)).rejects.toThrow(
        new ConflictException('Only INACTIVE semesters can be deleted'),
      );
      expect(prisma.semesterStudent.count).not.toHaveBeenCalled();
      expect(prisma.topic.count).not.toHaveBeenCalled();
    });

    it('throws ConflictException when semester has linked students', async () => {
      prisma.semester.findUnique.mockResolvedValue(mockSemester);
      prisma.semesterStudent.count.mockResolvedValue(3);
      prisma.topic.count.mockResolvedValue(0);

      await expect(service.remove(1)).rejects.toThrow(
        new ConflictException(
          'Cannot delete a semester with associated students or topics',
        ),
      );
    });

    it('throws ConflictException when semester has linked topics', async () => {
      prisma.semester.findUnique.mockResolvedValue(mockSemester);
      prisma.semesterStudent.count.mockResolvedValue(0);
      prisma.topic.count.mockResolvedValue(2);

      await expect(service.remove(1)).rejects.toThrow(
        new ConflictException(
          'Cannot delete a semester with associated students or topics',
        ),
      );
    });
  });

  // ─── activate ───────────────────────────────────────────────────────────────

  describe('activate', () => {
    it('transitions INACTIVE semester to ACTIVE when no other is active', async () => {
      prisma.semester.findUnique.mockResolvedValue(mockSemester);
      prisma.semester.findFirst.mockResolvedValue(null);
      prisma.semester.update.mockResolvedValue({
        ...mockSemester,
        status: SemesterStatus.ACTIVE,
      });

      const result = await service.activate(1);

      expect(prisma.semester.findFirst).toHaveBeenCalledWith({
        where: { status: SemesterStatus.ACTIVE },
      });
      expect(prisma.semester.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: SemesterStatus.ACTIVE },
      });
      expect(result.status).toBe(SemesterStatus.ACTIVE);
    });

    it('throws ConflictException when another semester is already ACTIVE', async () => {
      prisma.semester.findUnique.mockResolvedValue(mockSemester);
      prisma.semester.findFirst.mockResolvedValue({
        ...mockSemester,
        id: 2,
        status: SemesterStatus.ACTIVE,
      });

      await expect(service.activate(1)).rejects.toThrow(
        new ConflictException('Another semester is already active'),
      );
    });

    it('throws ConflictException when semester is not INACTIVE', async () => {
      prisma.semester.findUnique.mockResolvedValue({
        ...mockSemester,
        status: SemesterStatus.CLOSED,
      });

      await expect(service.activate(1)).rejects.toThrow(
        new ConflictException('Only INACTIVE semesters can be activated'),
      );
    });

    it('throws NotFoundException when semester does not exist', async () => {
      prisma.semester.findUnique.mockResolvedValue(null);

      await expect(service.activate(99)).rejects.toThrow(
        new NotFoundException('Semester #99 not found'),
      );
    });
  });

  // ─── deactivate ─────────────────────────────────────────────────────────────

  describe('deactivate', () => {
    it('transitions ACTIVE semester to INACTIVE', async () => {
      prisma.semester.findUnique.mockResolvedValue({
        ...mockSemester,
        status: SemesterStatus.ACTIVE,
      });
      prisma.semester.update.mockResolvedValue(mockSemester);

      const result = await service.deactivate(1);

      expect(prisma.semester.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: SemesterStatus.INACTIVE },
      });
      expect(result.status).toBe(SemesterStatus.INACTIVE);
    });

    it('throws ConflictException when semester is not ACTIVE', async () => {
      prisma.semester.findUnique.mockResolvedValue(mockSemester); // INACTIVE

      await expect(service.deactivate(1)).rejects.toThrow(
        new ConflictException('Only ACTIVE semesters can be deactivated'),
      );
    });

    it('throws NotFoundException when semester does not exist', async () => {
      prisma.semester.findUnique.mockResolvedValue(null);

      await expect(service.deactivate(99)).rejects.toThrow(
        new NotFoundException('Semester #99 not found'),
      );
    });
  });

  // ─── close ──────────────────────────────────────────────────────────────────

  describe('close', () => {
    it('transitions ACTIVE semester to CLOSED', async () => {
      prisma.semester.findUnique.mockResolvedValue({
        ...mockSemester,
        status: SemesterStatus.ACTIVE,
      });
      prisma.semester.update.mockResolvedValue({
        ...mockSemester,
        status: SemesterStatus.CLOSED,
      });

      const result = await service.close(1);

      expect(prisma.semester.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: SemesterStatus.CLOSED },
      });
      expect(result.status).toBe(SemesterStatus.CLOSED);
    });

    it('throws ConflictException when semester is not ACTIVE', async () => {
      prisma.semester.findUnique.mockResolvedValue(mockSemester); // INACTIVE

      await expect(service.close(1)).rejects.toThrow(
        new ConflictException('Only ACTIVE semesters can be closed'),
      );
    });

    it('throws NotFoundException when semester does not exist', async () => {
      prisma.semester.findUnique.mockResolvedValue(null);

      await expect(service.close(99)).rejects.toThrow(
        new NotFoundException('Semester #99 not found'),
      );
    });
  });
});
