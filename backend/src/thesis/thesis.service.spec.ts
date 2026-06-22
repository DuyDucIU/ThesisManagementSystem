import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role, EnrollmentStatus, TopicStatus, ThesisStatus } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ThesisService } from './thesis.service';
import { PrismaService } from '../prisma/prisma.service';
import { LecturerSemesterService } from '../lecturer-semester/lecturer-semester.service';

const mockStudent = { id: 1, studentId: '2021001', fullName: 'Nguyen Van A' };
const mockEnrollment = {
  id: 10,
  studentId: 1,
  semesterId: 3,
  status: EnrollmentStatus.AVAILABLE,
  student: mockStudent,
};
const mockLecturer = { id: 2, fullName: 'Dr. Tran', email: 'tran@u.edu', title: 'Dr.' };
const mockTopic = {
  id: 5,
  title: 'AI in Healthcare',
  description: 'desc',
  semesterId: 3,
  lecturerId: 2,
  status: TopicStatus.OPEN,
  lecturer: mockLecturer,
};

const lecturerUser = { role: Role.LECTURER, lecturer: { id: 2 } };
const adminUser = { role: Role.ADMIN, lecturer: null };

describe('ThesisService', () => {
  let service: ThesisService;
  let prisma: any;
  let lecturerSemesterService: { resolveCapacity: jest.Mock };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn((fn) => fn(prisma)),
      enrollment: { findUnique: jest.fn(), update: jest.fn() },
      topic: { findUnique: jest.fn(), updateMany: jest.fn() },
      thesis: {
        create: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      semester: { findFirst: jest.fn() },
    };

    lecturerSemesterService = { resolveCapacity: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThesisService,
        { provide: PrismaService, useValue: prisma },
        { provide: LecturerSemesterService, useValue: lecturerSemesterService },
      ],
    }).compile();

    service = module.get<ThesisService>(ThesisService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('assign', () => {
    const dto = { enrollmentId: 10, topicId: 5 };

    it('throws NotFoundException when enrollment does not exist', async () => {
      prisma.enrollment.findUnique.mockResolvedValue(null);

      await expect(service.assign(dto, lecturerUser)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when enrollment is not AVAILABLE', async () => {
      prisma.enrollment.findUnique.mockResolvedValue({
        ...mockEnrollment, status: EnrollmentStatus.ASSIGNED,
      });

      await expect(service.assign(dto, lecturerUser))
        .rejects.toThrow(new BadRequestException('Student is not available for assignment'));
    });

    it('throws NotFoundException when topic does not exist', async () => {
      prisma.enrollment.findUnique.mockResolvedValue(mockEnrollment);
      prisma.topic.findUnique.mockResolvedValue(null);

      await expect(service.assign(dto, lecturerUser)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when topic is not OPEN', async () => {
      prisma.enrollment.findUnique.mockResolvedValue(mockEnrollment);
      prisma.topic.findUnique.mockResolvedValue({ ...mockTopic, status: TopicStatus.FULL });

      await expect(service.assign(dto, lecturerUser))
        .rejects.toThrow(new BadRequestException('Topic is not open for assignment'));
    });

    it('throws BadRequestException when topic and enrollment are in different semesters', async () => {
      prisma.enrollment.findUnique.mockResolvedValue(mockEnrollment);
      prisma.topic.findUnique.mockResolvedValue({ ...mockTopic, semesterId: 99 });

      await expect(service.assign(dto, lecturerUser))
        .rejects.toThrow(new BadRequestException('Topic and enrollment must be in the same semester'));
    });

    it('throws ForbiddenException when lecturer does not own the topic', async () => {
      const otherLecturer = { role: Role.LECTURER, lecturer: { id: 999 } };
      prisma.enrollment.findUnique.mockResolvedValue(mockEnrollment);
      prisma.topic.findUnique.mockResolvedValue(mockTopic);

      await expect(service.assign(dto, otherLecturer)).rejects.toThrow(ForbiddenException);
    });

    it('allows admin to assign to any topic', async () => {
      prisma.enrollment.findUnique.mockResolvedValue(mockEnrollment);
      prisma.topic.findUnique.mockResolvedValue(mockTopic);
      lecturerSemesterService.resolveCapacity.mockResolvedValue(5);
      prisma.thesis.count.mockResolvedValue(0);
      prisma.thesis.create.mockResolvedValue({
        id: 1, title: 'AI in Healthcare', status: ThesisStatus.IN_PROGRESS,
        createdAt: new Date(), enrollmentId: 10, topicId: 5,
        enrollment: { ...mockEnrollment, student: mockStudent },
        topic: mockTopic,
      });

      await expect(service.assign(dto, adminUser)).resolves.toBeDefined();
    });

    it('throws BadRequestException when lecturer is at capacity', async () => {
      prisma.enrollment.findUnique.mockResolvedValue(mockEnrollment);
      prisma.topic.findUnique.mockResolvedValue(mockTopic);
      lecturerSemesterService.resolveCapacity.mockResolvedValue(3);
      prisma.thesis.count.mockResolvedValue(3);

      await expect(service.assign(dto, lecturerUser))
        .rejects.toThrow(new BadRequestException('Lecturer has reached maximum student capacity for this semester'));
    });

    it('creates thesis, updates enrollment, and recomputes topic statuses on success', async () => {
      prisma.enrollment.findUnique.mockResolvedValue(mockEnrollment);
      prisma.topic.findUnique.mockResolvedValue(mockTopic);
      lecturerSemesterService.resolveCapacity.mockResolvedValue(5);
      prisma.thesis.count
        .mockResolvedValueOnce(1)   // pre-assign capacity check
        .mockResolvedValueOnce(2);  // post-assign recompute
      prisma.thesis.create.mockResolvedValue({
        id: 1, title: 'AI in Healthcare', status: ThesisStatus.IN_PROGRESS,
        createdAt: new Date(), enrollmentId: 10, topicId: 5,
        enrollment: { ...mockEnrollment, student: mockStudent },
        topic: mockTopic,
      });
      prisma.enrollment.update.mockResolvedValue({});
      prisma.topic.updateMany.mockResolvedValue({});

      const result = await service.assign(dto, lecturerUser);

      expect(result).toHaveProperty('id', 1);
      expect(prisma.enrollment.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { status: EnrollmentStatus.ASSIGNED },
      });
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('maps P2002 on enrollmentId to 409 Conflict', async () => {
      prisma.enrollment.findUnique.mockResolvedValue(mockEnrollment);
      prisma.topic.findUnique.mockResolvedValue(mockTopic);
      lecturerSemesterService.resolveCapacity.mockResolvedValue(5);
      prisma.thesis.count.mockResolvedValue(0);
      prisma.$transaction.mockRejectedValue(
        new PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002', clientVersion: '6.0.0', meta: { target: ['enrollment_id'] },
        }),
      );

      await expect(service.assign(dto, lecturerUser))
        .rejects.toThrow(ConflictException);
    });
  });

  describe('unassign', () => {
    it('throws NotFoundException when thesis does not exist', async () => {
      prisma.thesis.findUnique.mockResolvedValue(null);

      await expect(service.unassign(999, lecturerUser)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when thesis status is not IN_PROGRESS', async () => {
      prisma.thesis.findUnique.mockResolvedValue({
        id: 1, status: ThesisStatus.SUBMITTED, enrollmentId: 10,
        topic: { lecturerId: 2, semesterId: 3 },
      });

      await expect(service.unassign(1, lecturerUser))
        .rejects.toThrow(new BadRequestException('Cannot unassign — thesis has progressed beyond initial stage'));
    });

    it('throws ForbiddenException when lecturer does not own the topic', async () => {
      prisma.thesis.findUnique.mockResolvedValue({
        id: 1, status: ThesisStatus.IN_PROGRESS, enrollmentId: 10,
        topic: { lecturerId: 999, semesterId: 3 },
      });

      await expect(service.unassign(1, lecturerUser)).rejects.toThrow(ForbiddenException);
    });

    it('allows admin to unassign from any topic', async () => {
      prisma.thesis.findUnique.mockResolvedValue({
        id: 1, status: ThesisStatus.IN_PROGRESS, enrollmentId: 10,
        topic: { lecturerId: 999, semesterId: 3 },
      });
      prisma.thesis.delete.mockResolvedValue({});
      prisma.enrollment.update.mockResolvedValue({});
      prisma.thesis.count.mockResolvedValue(0);
      lecturerSemesterService.resolveCapacity.mockResolvedValue(5);
      prisma.topic.updateMany.mockResolvedValue({});

      await expect(service.unassign(1, adminUser)).resolves.toBeUndefined();
    });

    it('deletes thesis, reverts enrollment, and recomputes topic statuses', async () => {
      prisma.thesis.findUnique.mockResolvedValue({
        id: 1, status: ThesisStatus.IN_PROGRESS, enrollmentId: 10,
        topic: { lecturerId: 2, semesterId: 3 },
      });
      prisma.thesis.delete.mockResolvedValue({});
      prisma.enrollment.update.mockResolvedValue({});
      prisma.thesis.count.mockResolvedValue(2);
      lecturerSemesterService.resolveCapacity.mockResolvedValue(5);
      prisma.topic.updateMany.mockResolvedValue({});

      await service.unassign(1, lecturerUser);

      expect(prisma.thesis.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(prisma.enrollment.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { status: EnrollmentStatus.AVAILABLE },
      });
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    const mockThesisWithRelations = {
      id: 1, title: 'AI in Healthcare', status: ThesisStatus.IN_PROGRESS,
      createdAt: new Date(), enrollmentId: 10, topicId: 5,
      topic: { id: 5, title: 'AI in Healthcare', lecturerId: 2, semesterId: 3 },
      enrollment: { student: mockStudent },
    };

    it('defaults to active semester when semesterId not provided', async () => {
      prisma.semester.findFirst.mockResolvedValue({ id: 3 });
      prisma.thesis.findMany.mockResolvedValue([mockThesisWithRelations]);

      await service.findAll({}, lecturerUser);

      expect(prisma.thesis.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            topic: expect.objectContaining({ semesterId: 3 }),
          }),
        }),
      );
    });

    it('scopes to lecturer own topics when role is LECTURER', async () => {
      prisma.thesis.findMany.mockResolvedValue([]);

      await service.findAll({ semesterId: 3 }, lecturerUser);

      expect(prisma.thesis.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            topic: expect.objectContaining({ lecturerId: 2 }),
          }),
        }),
      );
    });

    it('allows admin to filter by lecturerId', async () => {
      prisma.thesis.findMany.mockResolvedValue([]);

      await service.findAll({ semesterId: 3, lecturerId: 7 }, adminUser);

      expect(prisma.thesis.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            topic: expect.objectContaining({ lecturerId: 7 }),
          }),
        }),
      );
    });

    it('returns empty array when no active semester and semesterId not provided', async () => {
      prisma.semester.findFirst.mockResolvedValue(null);

      const result = await service.findAll({}, adminUser);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    const mockThesisWithRelations = {
      id: 1, title: 'AI in Healthcare', status: ThesisStatus.IN_PROGRESS,
      createdAt: new Date(), enrollmentId: 10, topicId: 5,
      topic: { id: 5, title: 'AI in Healthcare', lecturerId: 2, semesterId: 3 },
      enrollment: { student: mockStudent },
    };

    it('returns thesis detail when found', async () => {
      prisma.thesis.findUnique.mockResolvedValue(mockThesisWithRelations);

      const result = await service.findOne(1, lecturerUser);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('student');
      expect(result).toHaveProperty('topic');
    });

    it('throws NotFoundException when thesis does not exist', async () => {
      prisma.thesis.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999, adminUser)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when lecturer does not own the topic', async () => {
      prisma.thesis.findUnique.mockResolvedValue({
        ...mockThesisWithRelations,
        topic: { ...mockThesisWithRelations.topic, lecturerId: 999 },
      });

      await expect(service.findOne(1, lecturerUser)).rejects.toThrow(ForbiddenException);
    });
  });
});
