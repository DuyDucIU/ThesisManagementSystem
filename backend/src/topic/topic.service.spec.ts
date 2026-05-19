import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TopicStatus, SemesterStatus } from '@prisma/client';
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
});
