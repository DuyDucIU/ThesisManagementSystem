import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TopicStatus, SemesterStatus } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { TopicService } from './topic.service';
import { PrismaService } from '../prisma/prisma.service';

const LECTURER_ID = '11111111-1111-1111-1111-111111111111';
const LECTURER_ID_2 = '22222222-2222-2222-2222-222222222222';
const OTHER_LECTURER_ID = '55555555-5555-5555-5555-555555555555';
const TOPIC_ID = '11111111-2222-3333-4444-555555555555';
const SEMESTER_ID = '33333333-3333-3333-3333-333333333333';
const OTHER_SEMESTER_ID = '55555555-5555-5555-5555-555555555550';
const NON_EXISTENT_ID = '99999999-9999-9999-9999-999999999999';

const mockLecturer = { id: LECTURER_ID, fullName: 'Dr. Nguyen Van A', email: 'nva@uni.edu', title: 'Dr.' };

const mockTopic = {
  id: TOPIC_ID,
  title: 'Deep Learning for Medical Imaging',
  description: 'Description text',
  requirements: 'Requirements text',
  note: 'Note text',
  status: TopicStatus.OPEN,
  createdAt: new Date('2026-05-01'),
  semesterId: SEMESTER_ID,
  lecturerId: LECTURER_ID,
  lecturer: mockLecturer,
};

const topicResponse = {
  id: TOPIC_ID,
  title: 'Deep Learning for Medical Imaging',
  description: 'Description text',
  requirements: 'Requirements text',
  note: 'Note text',
  status: TopicStatus.OPEN,
  createdAt: new Date('2026-05-01'),
  semesterId: SEMESTER_ID,
  lecturer: mockLecturer,
};

describe('TopicService', () => {
  let service: TopicService;
  let prisma: {
    topic: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
    semester: { findFirst: jest.Mock };
    thesis: { count: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      topic: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      semester: { findFirst: jest.fn() },
      thesis: { count: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TopicService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TopicService>(TopicService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── findAll ─────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('defaults to the active semester when semesterId is not provided', async () => {
      prisma.semester.findFirst.mockResolvedValue({ id: SEMESTER_ID, status: SemesterStatus.ACTIVE });
      prisma.topic.findMany.mockResolvedValue([mockTopic]);

      await service.findAll({});

      expect(prisma.semester.findFirst).toHaveBeenCalledWith({
        where: { status: SemesterStatus.ACTIVE },
      });
      expect(prisma.topic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ semesterId: SEMESTER_ID }) }),
      );
    });

    it('returns empty array when no semesterId given and no active semester', async () => {
      prisma.semester.findFirst.mockResolvedValue(null);

      const result = await service.findAll({});

      expect(prisma.topic.findMany).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('uses the provided semesterId directly without querying for active semester', async () => {
      prisma.topic.findMany.mockResolvedValue([mockTopic]);

      await service.findAll({ semesterId: OTHER_SEMESTER_ID });

      expect(prisma.semester.findFirst).not.toHaveBeenCalled();
      expect(prisma.topic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ semesterId: OTHER_SEMESTER_ID }) }),
      );
    });

    it('applies status filter', async () => {
      prisma.topic.findMany.mockResolvedValue([]);

      await service.findAll({ semesterId: SEMESTER_ID, status: TopicStatus.OPEN });

      expect(prisma.topic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: TopicStatus.OPEN }) }),
      );
    });

    it('applies lecturerId filter', async () => {
      prisma.topic.findMany.mockResolvedValue([]);

      await service.findAll({ semesterId: SEMESTER_ID, lecturerId: LECTURER_ID_2 });

      expect(prisma.topic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ lecturerId: LECTURER_ID_2 }) }),
      );
    });

    it('applies title search filter', async () => {
      prisma.topic.findMany.mockResolvedValue([]);

      await service.findAll({ semesterId: SEMESTER_ID, search: 'neural' });

      expect(prisma.topic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            title: { contains: 'neural' },
          }),
        }),
      );
    });

    it('returns mapped topic responses including lecturer info', async () => {
      prisma.topic.findMany.mockResolvedValue([mockTopic]);

      const result = await service.findAll({ semesterId: SEMESTER_ID });

      expect(result).toEqual([topicResponse]);
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns the topic response when found', async () => {
      prisma.topic.findUnique.mockResolvedValue(mockTopic);

      const result = await service.findOne(TOPIC_ID);

      expect(prisma.topic.findUnique).toHaveBeenCalledWith({
        where: { id: TOPIC_ID },
        include: expect.objectContaining({ lecturer: expect.anything() }),
      });
      expect(result).toEqual(topicResponse);
    });

    it('throws NotFoundException when topic does not exist', async () => {
      prisma.topic.findUnique.mockResolvedValue(null);

      await expect(service.findOne(NON_EXISTENT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto = {
      title: 'New Topic',
      description: 'Desc',
      requirements: 'Req',
      note: 'Note',
    };

    it('creates topic in the active semester with the given lecturerId', async () => {
      prisma.semester.findFirst.mockResolvedValue({ id: SEMESTER_ID, status: SemesterStatus.ACTIVE });
      prisma.topic.create.mockResolvedValue({ ...mockTopic, ...dto, semesterId: SEMESTER_ID, lecturerId: LECTURER_ID });

      const result = await service.create(dto, LECTURER_ID);

      expect(prisma.semester.findFirst).toHaveBeenCalledWith({
        where: { status: SemesterStatus.ACTIVE },
      });
      expect(prisma.topic.create).toHaveBeenCalledWith({
        data: {
          title: 'New Topic',
          description: 'Desc',
          requirements: 'Req',
          note: 'Note',
          semesterId: SEMESTER_ID,
          lecturerId: LECTURER_ID,
        },
        include: expect.objectContaining({ lecturer: expect.anything() }),
      });
      expect(result).toHaveProperty('id');
    });

    it('throws BadRequestException when no active semester exists', async () => {
      prisma.semester.findFirst.mockResolvedValue(null);

      await expect(service.create(dto, LECTURER_ID)).rejects.toThrow(
        new BadRequestException('No active semester found'),
      );
      expect(prisma.topic.create).not.toHaveBeenCalled();
    });

    it('omits undefined optional fields from the create data', async () => {
      prisma.semester.findFirst.mockResolvedValue({ id: SEMESTER_ID });
      prisma.topic.create.mockResolvedValue({
        ...mockTopic,
        title: 'Title Only',
        description: null,
        requirements: null,
        note: null,
        semesterId: SEMESTER_ID,
      });

      await service.create({ title: 'Title Only' }, LECTURER_ID_2);

      expect(prisma.topic.create).toHaveBeenCalledWith({
        data: { title: 'Title Only', semesterId: SEMESTER_ID, lecturerId: LECTURER_ID_2 },
        include: expect.objectContaining({ lecturer: expect.anything() }),
      });
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('throws NotFoundException when topic does not exist', async () => {
      prisma.topic.findUnique.mockResolvedValue(null);

      await expect(service.update(NON_EXISTENT_ID, { title: 'New' }, LECTURER_ID)).rejects.toThrow(NotFoundException);
      expect(prisma.topic.update).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when lecturer does not own the topic', async () => {
      prisma.topic.findUnique.mockResolvedValue({ ...mockTopic, lecturerId: OTHER_LECTURER_ID });

      await expect(service.update(TOPIC_ID, { title: 'New' }, LECTURER_ID)).rejects.toThrow(ForbiddenException);
      expect(prisma.topic.update).not.toHaveBeenCalled();
    });

    it('updates only provided fields and returns response', async () => {
      prisma.topic.findUnique.mockResolvedValue(mockTopic);
      prisma.topic.update.mockResolvedValue({ ...mockTopic, title: 'Updated Title' });

      const result = await service.update(TOPIC_ID, { title: 'Updated Title' }, LECTURER_ID);

      expect(prisma.topic.update).toHaveBeenCalledWith({
        where: { id: TOPIC_ID },
        data: { title: 'Updated Title' },
        include: expect.objectContaining({ lecturer: expect.anything() }),
      });
      expect(result.title).toBe('Updated Title');
    });

    it('does not include status in the update data even if status is somehow passed', async () => {
      prisma.topic.findUnique.mockResolvedValue(mockTopic);
      prisma.topic.update.mockResolvedValue({ ...mockTopic, note: 'updated note' });

      await service.update(TOPIC_ID, { note: 'updated note' }, LECTURER_ID);

      const callData = prisma.topic.update.mock.calls[0][0].data;
      expect(callData).not.toHaveProperty('status');
    });

    it('throws BadRequestException when no fields are provided', async () => {
      prisma.topic.findUnique.mockResolvedValue(mockTopic);

      await expect(service.update(TOPIC_ID, {}, LECTURER_ID)).rejects.toThrow(BadRequestException);
      expect(prisma.topic.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when topic is deleted between check and update (P2025)', async () => {
      prisma.topic.findUnique.mockResolvedValue(mockTopic);
      prisma.topic.update.mockRejectedValue(
        new PrismaClientKnownRequestError('Record not found', { code: 'P2025', clientVersion: '6.0.0' }),
      );

      await expect(service.update(TOPIC_ID, { title: 'New' }, LECTURER_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── remove ──────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('throws NotFoundException when topic does not exist', async () => {
      prisma.topic.findUnique.mockResolvedValue(null);

      await expect(service.remove(NON_EXISTENT_ID, LECTURER_ID)).rejects.toThrow(NotFoundException);
      expect(prisma.topic.delete).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when lecturer does not own the topic', async () => {
      prisma.topic.findUnique.mockResolvedValue({ ...mockTopic, lecturerId: OTHER_LECTURER_ID });

      await expect(service.remove(TOPIC_ID, LECTURER_ID)).rejects.toThrow(ForbiddenException);
      expect(prisma.topic.delete).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when topic has theses assigned', async () => {
      prisma.topic.findUnique.mockResolvedValue(mockTopic);
      prisma.thesis.count.mockResolvedValue(2);

      await expect(service.remove(TOPIC_ID, LECTURER_ID)).rejects.toThrow(
        new BadRequestException('Cannot delete a topic with assigned theses'),
      );
      expect(prisma.topic.delete).not.toHaveBeenCalled();
    });

    it('deletes the topic when owned and no theses assigned', async () => {
      prisma.topic.findUnique.mockResolvedValue(mockTopic);
      prisma.thesis.count.mockResolvedValue(0);
      prisma.topic.delete.mockResolvedValue(mockTopic);

      await service.remove(TOPIC_ID, LECTURER_ID);

      expect(prisma.topic.delete).toHaveBeenCalledWith({ where: { id: TOPIC_ID } });
    });

    it('throws NotFoundException when topic is deleted between check and delete (P2025)', async () => {
      prisma.topic.findUnique.mockResolvedValue(mockTopic);
      prisma.thesis.count.mockResolvedValue(0);
      prisma.topic.delete.mockRejectedValue(
        new PrismaClientKnownRequestError('Record not found', { code: 'P2025', clientVersion: '6.0.0' }),
      );

      await expect(service.remove(TOPIC_ID, LECTURER_ID)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when thesis is assigned between count and delete (P2003)', async () => {
      prisma.topic.findUnique.mockResolvedValue(mockTopic);
      prisma.thesis.count.mockResolvedValue(0);
      prisma.topic.delete.mockRejectedValue(
        new PrismaClientKnownRequestError('Foreign key constraint failed', { code: 'P2003', clientVersion: '6.0.0' }),
      );

      await expect(service.remove(TOPIC_ID, LECTURER_ID)).rejects.toThrow(BadRequestException);
    });
  });
});
