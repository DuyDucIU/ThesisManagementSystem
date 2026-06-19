import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TopicStatus, SemesterStatus } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { TopicService } from './topic.service';
import { PrismaService } from '../prisma/prisma.service';

const mockLecturer = { id: 1, fullName: 'Dr. Nguyen Van A', email: 'nva@uni.edu', title: 'Dr.' };

const mockTopic = {
  id: 1,
  title: 'Deep Learning for Medical Imaging',
  description: 'Description text',
  requirements: 'Requirements text',
  note: 'Note text',
  status: TopicStatus.OPEN,
  createdAt: new Date('2026-05-01'),
  semesterId: 3,
  lecturerId: 1,
  lecturer: mockLecturer,
};

const topicResponse = {
  id: 1,
  title: 'Deep Learning for Medical Imaging',
  description: 'Description text',
  requirements: 'Requirements text',
  note: 'Note text',
  status: TopicStatus.OPEN,
  createdAt: new Date('2026-05-01'),
  semesterId: 3,
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
      prisma.semester.findFirst.mockResolvedValue({ id: 3, status: SemesterStatus.ACTIVE });
      prisma.topic.findMany.mockResolvedValue([mockTopic]);

      await service.findAll({});

      expect(prisma.semester.findFirst).toHaveBeenCalledWith({
        where: { status: SemesterStatus.ACTIVE },
      });
      expect(prisma.topic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ semesterId: 3 }) }),
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

      await service.findAll({ semesterId: 5 });

      expect(prisma.semester.findFirst).not.toHaveBeenCalled();
      expect(prisma.topic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ semesterId: 5 }) }),
      );
    });

    it('applies status filter', async () => {
      prisma.topic.findMany.mockResolvedValue([]);

      await service.findAll({ semesterId: 3, status: TopicStatus.OPEN });

      expect(prisma.topic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: TopicStatus.OPEN }) }),
      );
    });

    it('applies lecturerId filter', async () => {
      prisma.topic.findMany.mockResolvedValue([]);

      await service.findAll({ semesterId: 3, lecturerId: 2 });

      expect(prisma.topic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ lecturerId: 2 }) }),
      );
    });

    it('applies title search filter', async () => {
      prisma.topic.findMany.mockResolvedValue([]);

      await service.findAll({ semesterId: 3, search: 'neural' });

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

      const result = await service.findAll({ semesterId: 3 });

      expect(result).toEqual([topicResponse]);
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns the topic response when found', async () => {
      prisma.topic.findUnique.mockResolvedValue(mockTopic);

      const result = await service.findOne(1);

      expect(prisma.topic.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: expect.objectContaining({ lecturer: expect.anything() }),
      });
      expect(result).toEqual(topicResponse);
    });

    it('throws NotFoundException when topic does not exist', async () => {
      prisma.topic.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
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
      prisma.semester.findFirst.mockResolvedValue({ id: 3, status: SemesterStatus.ACTIVE });
      prisma.topic.create.mockResolvedValue({ ...mockTopic, ...dto, semesterId: 3, lecturerId: 1 });

      const result = await service.create(dto, 1);

      expect(prisma.semester.findFirst).toHaveBeenCalledWith({
        where: { status: SemesterStatus.ACTIVE },
      });
      expect(prisma.topic.create).toHaveBeenCalledWith({
        data: {
          title: 'New Topic',
          description: 'Desc',
          requirements: 'Req',
          note: 'Note',
          semesterId: 3,
          lecturerId: 1,
        },
        include: expect.objectContaining({ lecturer: expect.anything() }),
      });
      expect(result).toHaveProperty('id');
    });

    it('throws BadRequestException when no active semester exists', async () => {
      prisma.semester.findFirst.mockResolvedValue(null);

      await expect(service.create(dto, 1)).rejects.toThrow(
        new BadRequestException('No active semester found'),
      );
      expect(prisma.topic.create).not.toHaveBeenCalled();
    });

    it('omits undefined optional fields from the create data', async () => {
      prisma.semester.findFirst.mockResolvedValue({ id: 3 });
      prisma.topic.create.mockResolvedValue({
        ...mockTopic,
        title: 'Title Only',
        description: null,
        requirements: null,
        note: null,
        semesterId: 3,
      });

      await service.create({ title: 'Title Only' }, 2);

      expect(prisma.topic.create).toHaveBeenCalledWith({
        data: { title: 'Title Only', semesterId: 3, lecturerId: 2 },
        include: expect.objectContaining({ lecturer: expect.anything() }),
      });
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('throws NotFoundException when topic does not exist', async () => {
      prisma.topic.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { title: 'New' }, 1)).rejects.toThrow(NotFoundException);
      expect(prisma.topic.update).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when lecturer does not own the topic', async () => {
      prisma.topic.findUnique.mockResolvedValue({ ...mockTopic, lecturerId: 5 });

      await expect(service.update(1, { title: 'New' }, 1)).rejects.toThrow(ForbiddenException);
      expect(prisma.topic.update).not.toHaveBeenCalled();
    });

    it('updates only provided fields and returns response', async () => {
      prisma.topic.findUnique.mockResolvedValue(mockTopic);
      prisma.topic.update.mockResolvedValue({ ...mockTopic, title: 'Updated Title' });

      const result = await service.update(1, { title: 'Updated Title' }, 1);

      expect(prisma.topic.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { title: 'Updated Title' },
        include: expect.objectContaining({ lecturer: expect.anything() }),
      });
      expect(result.title).toBe('Updated Title');
    });

    it('does not include status in the update data even if status is somehow passed', async () => {
      prisma.topic.findUnique.mockResolvedValue(mockTopic);
      prisma.topic.update.mockResolvedValue({ ...mockTopic, note: 'updated note' });

      await service.update(1, { note: 'updated note' }, 1);

      const callData = prisma.topic.update.mock.calls[0][0].data;
      expect(callData).not.toHaveProperty('status');
    });

    it('throws BadRequestException when no fields are provided', async () => {
      prisma.topic.findUnique.mockResolvedValue(mockTopic);

      await expect(service.update(1, {}, 1)).rejects.toThrow(BadRequestException);
      expect(prisma.topic.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when topic is deleted between check and update (P2025)', async () => {
      prisma.topic.findUnique.mockResolvedValue(mockTopic);
      prisma.topic.update.mockRejectedValue(
        new PrismaClientKnownRequestError('Record not found', { code: 'P2025', clientVersion: '6.0.0' }),
      );

      await expect(service.update(1, { title: 'New' }, 1)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── remove ──────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('throws NotFoundException when topic does not exist', async () => {
      prisma.topic.findUnique.mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
      expect(prisma.topic.delete).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when lecturer does not own the topic', async () => {
      prisma.topic.findUnique.mockResolvedValue({ ...mockTopic, lecturerId: 5 });

      await expect(service.remove(1, 1)).rejects.toThrow(ForbiddenException);
      expect(prisma.topic.delete).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when topic has theses assigned', async () => {
      prisma.topic.findUnique.mockResolvedValue(mockTopic);
      prisma.thesis.count.mockResolvedValue(2);

      await expect(service.remove(1, 1)).rejects.toThrow(
        new BadRequestException('Cannot delete a topic with assigned theses'),
      );
      expect(prisma.topic.delete).not.toHaveBeenCalled();
    });

    it('deletes the topic when owned and no theses assigned', async () => {
      prisma.topic.findUnique.mockResolvedValue(mockTopic);
      prisma.thesis.count.mockResolvedValue(0);
      prisma.topic.delete.mockResolvedValue(mockTopic);

      await service.remove(1, 1);

      expect(prisma.topic.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('throws NotFoundException when topic is deleted between check and delete (P2025)', async () => {
      prisma.topic.findUnique.mockResolvedValue(mockTopic);
      prisma.thesis.count.mockResolvedValue(0);
      prisma.topic.delete.mockRejectedValue(
        new PrismaClientKnownRequestError('Record not found', { code: 'P2025', clientVersion: '6.0.0' }),
      );

      await expect(service.remove(1, 1)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when thesis is assigned between count and delete (P2003)', async () => {
      prisma.topic.findUnique.mockResolvedValue(mockTopic);
      prisma.thesis.count.mockResolvedValue(0);
      prisma.topic.delete.mockRejectedValue(
        new PrismaClientKnownRequestError('Foreign key constraint failed', { code: 'P2003', clientVersion: '6.0.0' }),
      );

      await expect(service.remove(1, 1)).rejects.toThrow(BadRequestException);
    });
  });
});
