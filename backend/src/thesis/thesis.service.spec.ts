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

const STUDENT_ID = '11111111-1111-1111-1111-111111111111';
const ENROLLMENT_ID = '10101010-1010-1010-1010-101010101010';
const LECTURER_ID = '22222222-2222-2222-2222-222222222222';
const OTHER_LECTURER_ID = '99999999-9999-9999-9999-999999999999';
const ADMIN_FILTER_LECTURER_ID = '77777777-7777-7777-7777-777777777777';
const TOPIC_ID = '55555555-5555-5555-5555-555555555555';
const THESIS_ID = '11111111-2222-3333-4444-555555555555';
const SEMESTER_ID = '33333333-3333-3333-3333-333333333333';
const OTHER_SEMESTER_ID = '99999999-9999-9999-9999-999999999998';
const NON_EXISTENT_ID = '99999999-9999-9999-9999-999999999997';

const mockStudent = { id: STUDENT_ID, studentId: '2021001', fullName: 'Nguyen Van A' };
const mockEnrollment = {
  id: ENROLLMENT_ID,
  studentId: STUDENT_ID,
  semesterId: SEMESTER_ID,
  status: EnrollmentStatus.AVAILABLE,
  student: mockStudent,
};
const mockLecturer = { id: LECTURER_ID, fullName: 'Dr. Tran', email: 'tran@u.edu', title: 'Dr.' };
const mockTopic = {
  id: TOPIC_ID,
  title: 'AI in Healthcare',
  description: 'desc',
  semesterId: SEMESTER_ID,
  lecturerId: LECTURER_ID,
  status: TopicStatus.OPEN,
  lecturer: mockLecturer,
};

const lecturerUser = { role: Role.LECTURER, lecturer: { id: LECTURER_ID } };
const adminUser = { role: Role.ADMIN, lecturer: null };

describe('ThesisService', () => {
  let service: ThesisService;
  let prisma: any;
  let lecturerSemesterService: { resolveCapacity: jest.Mock };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn((fn) => fn(prisma)),
      $queryRaw: jest.fn().mockResolvedValue([{ id: LECTURER_ID }]),
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
    const dto = { enrollmentId: ENROLLMENT_ID, topicId: TOPIC_ID };

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
      prisma.topic.findUnique.mockResolvedValue({ ...mockTopic, semesterId: OTHER_SEMESTER_ID });

      await expect(service.assign(dto, lecturerUser))
        .rejects.toThrow(new BadRequestException('Topic and enrollment must be in the same semester'));
    });

    it('throws ForbiddenException when lecturer does not own the topic', async () => {
      const otherLecturer = { role: Role.LECTURER, lecturer: { id: OTHER_LECTURER_ID } };
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
        id: THESIS_ID, title: 'AI in Healthcare', status: ThesisStatus.IN_PROGRESS,
        createdAt: new Date(), enrollmentId: ENROLLMENT_ID, topicId: TOPIC_ID,
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
        .mockResolvedValueOnce(1)   // capacity check inside tx
        .mockResolvedValueOnce(2);  // post-assign recompute
      prisma.thesis.create.mockResolvedValue({
        id: THESIS_ID, title: 'AI in Healthcare', status: ThesisStatus.IN_PROGRESS,
        createdAt: new Date(), enrollmentId: ENROLLMENT_ID, topicId: TOPIC_ID,
        enrollment: { ...mockEnrollment, student: mockStudent },
        topic: mockTopic,
      });
      prisma.enrollment.update.mockResolvedValue({});
      prisma.topic.updateMany.mockResolvedValue({});

      const result = await service.assign(dto, lecturerUser);

      expect(result).toHaveProperty('id', THESIS_ID);
      expect(prisma.enrollment.update).toHaveBeenCalledWith({
        where: { id: ENROLLMENT_ID },
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

    it('maps P2034 (serialization failure) to 400 BadRequest', async () => {
      prisma.enrollment.findUnique.mockResolvedValue(mockEnrollment);
      prisma.topic.findUnique.mockResolvedValue(mockTopic);
      lecturerSemesterService.resolveCapacity.mockResolvedValue(5);
      prisma.$transaction.mockRejectedValue(
        new PrismaClientKnownRequestError('Transaction failed due to write conflict', {
          code: 'P2034', clientVersion: '6.0.0',
        }),
      );

      await expect(service.assign(dto, lecturerUser))
        .rejects.toThrow(new BadRequestException('Assignment failed due to a concurrent conflict — please try again'));
    });

    it('throws ForbiddenException when LECTURER has no linked lecturer profile', async () => {
      const orphanUser = { role: Role.LECTURER, lecturer: null };
      prisma.enrollment.findUnique.mockResolvedValue(mockEnrollment);
      prisma.topic.findUnique.mockResolvedValue(mockTopic);

      await expect(service.assign(dto, orphanUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('unassign', () => {
    it('throws NotFoundException when thesis does not exist', async () => {
      prisma.thesis.findUnique.mockResolvedValue(null);

      await expect(service.unassign(NON_EXISTENT_ID, lecturerUser)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when thesis status is not IN_PROGRESS', async () => {
      prisma.thesis.findUnique.mockResolvedValue({
        id: THESIS_ID, status: ThesisStatus.SUBMITTED, enrollmentId: ENROLLMENT_ID,
        topic: { lecturerId: LECTURER_ID, semesterId: SEMESTER_ID },
      });

      await expect(service.unassign(THESIS_ID, lecturerUser))
        .rejects.toThrow(new BadRequestException('Cannot unassign — thesis has progressed beyond initial stage'));
    });

    it('throws ForbiddenException when lecturer does not own the topic', async () => {
      prisma.thesis.findUnique.mockResolvedValue({
        id: THESIS_ID, status: ThesisStatus.IN_PROGRESS, enrollmentId: ENROLLMENT_ID,
        topic: { lecturerId: OTHER_LECTURER_ID, semesterId: SEMESTER_ID },
      });

      await expect(service.unassign(THESIS_ID, lecturerUser)).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when LECTURER has no linked lecturer profile', async () => {
      const orphanUser = { role: Role.LECTURER, lecturer: null };
      prisma.thesis.findUnique.mockResolvedValue({
        id: THESIS_ID, status: ThesisStatus.IN_PROGRESS, enrollmentId: ENROLLMENT_ID,
        topic: { lecturerId: LECTURER_ID, semesterId: SEMESTER_ID },
      });

      await expect(service.unassign(THESIS_ID, orphanUser)).rejects.toThrow(ForbiddenException);
    });

    it('allows admin to unassign from any topic', async () => {
      prisma.thesis.findUnique.mockResolvedValue({
        id: THESIS_ID, status: ThesisStatus.IN_PROGRESS, enrollmentId: ENROLLMENT_ID,
        topic: { lecturerId: OTHER_LECTURER_ID, semesterId: SEMESTER_ID },
      });
      prisma.thesis.delete.mockResolvedValue({});
      prisma.enrollment.update.mockResolvedValue({});
      prisma.thesis.count.mockResolvedValue(0);
      lecturerSemesterService.resolveCapacity.mockResolvedValue(5);
      prisma.topic.updateMany.mockResolvedValue({});

      await expect(service.unassign(THESIS_ID, adminUser)).resolves.toBeUndefined();
    });

    it('deletes thesis, reverts enrollment, and recomputes topic statuses', async () => {
      prisma.thesis.findUnique.mockResolvedValue({
        id: THESIS_ID, status: ThesisStatus.IN_PROGRESS, enrollmentId: ENROLLMENT_ID,
        topic: { lecturerId: LECTURER_ID, semesterId: SEMESTER_ID },
      });
      prisma.thesis.delete.mockResolvedValue({});
      prisma.enrollment.update.mockResolvedValue({});
      prisma.thesis.count.mockResolvedValue(2);
      lecturerSemesterService.resolveCapacity.mockResolvedValue(5);
      prisma.topic.updateMany.mockResolvedValue({});

      await service.unassign(THESIS_ID, lecturerUser);

      expect(prisma.thesis.delete).toHaveBeenCalledWith({ where: { id: THESIS_ID } });
      expect(prisma.enrollment.update).toHaveBeenCalledWith({
        where: { id: ENROLLMENT_ID },
        data: { status: EnrollmentStatus.AVAILABLE },
      });
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    const mockThesisWithRelations = {
      id: THESIS_ID, title: 'AI in Healthcare', status: ThesisStatus.IN_PROGRESS,
      createdAt: new Date(), enrollmentId: ENROLLMENT_ID, topicId: TOPIC_ID,
      topic: { id: TOPIC_ID, title: 'AI in Healthcare', lecturerId: LECTURER_ID, semesterId: SEMESTER_ID },
      enrollment: { student: mockStudent },
    };

    it('defaults to active semester when semesterId not provided', async () => {
      prisma.semester.findFirst.mockResolvedValue({ id: SEMESTER_ID });
      prisma.thesis.findMany.mockResolvedValue([mockThesisWithRelations]);

      await service.findAll({}, lecturerUser);

      expect(prisma.thesis.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            topic: expect.objectContaining({ semesterId: SEMESTER_ID }),
          }),
        }),
      );
    });

    it('scopes to lecturer own topics when role is LECTURER', async () => {
      prisma.thesis.findMany.mockResolvedValue([]);

      await service.findAll({ semesterId: SEMESTER_ID }, lecturerUser);

      expect(prisma.thesis.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            topic: expect.objectContaining({ lecturerId: LECTURER_ID }),
          }),
        }),
      );
    });

    it('allows admin to filter by lecturerId', async () => {
      prisma.thesis.findMany.mockResolvedValue([]);

      await service.findAll({ semesterId: SEMESTER_ID, lecturerId: ADMIN_FILTER_LECTURER_ID }, adminUser);

      expect(prisma.thesis.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            topic: expect.objectContaining({ lecturerId: ADMIN_FILTER_LECTURER_ID }),
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
      id: THESIS_ID, title: 'AI in Healthcare', status: ThesisStatus.IN_PROGRESS,
      createdAt: new Date(), enrollmentId: ENROLLMENT_ID, topicId: TOPIC_ID,
      topic: { id: TOPIC_ID, title: 'AI in Healthcare', lecturerId: LECTURER_ID, semesterId: SEMESTER_ID },
      enrollment: { student: mockStudent },
    };

    it('returns thesis detail when found', async () => {
      prisma.thesis.findUnique.mockResolvedValue(mockThesisWithRelations);

      const result = await service.findOne(THESIS_ID, lecturerUser);

      expect(result).toHaveProperty('id', THESIS_ID);
      expect(result).toHaveProperty('student');
      expect(result).toHaveProperty('topic');
    });

    it('throws NotFoundException when thesis does not exist', async () => {
      prisma.thesis.findUnique.mockResolvedValue(null);

      await expect(service.findOne(NON_EXISTENT_ID, adminUser)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when lecturer does not own the topic', async () => {
      prisma.thesis.findUnique.mockResolvedValue({
        ...mockThesisWithRelations,
        topic: { ...mockThesisWithRelations.topic, lecturerId: OTHER_LECTURER_ID },
      });

      await expect(service.findOne(THESIS_ID, lecturerUser)).rejects.toThrow(ForbiddenException);
    });
  });
});
