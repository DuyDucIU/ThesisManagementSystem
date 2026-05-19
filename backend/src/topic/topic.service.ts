import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, TopicStatus, SemesterStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { QueryTopicDto } from './dto/query-topic.dto';

type TopicWithLecturer = Prisma.TopicGetPayload<{
  include: {
    lecturer: { select: { id: true; fullName: true; email: true; title: true } };
  };
}>;

@Injectable()
export class TopicService {
  constructor(private prisma: PrismaService) {}

  private toResponse(topic: TopicWithLecturer) {
    return {
      id: topic.id,
      title: topic.title,
      description: topic.description,
      requirements: topic.requirements,
      note: topic.note,
      status: topic.status,
      createdAt: topic.createdAt,
      semesterId: topic.semesterId,
      lecturer: {
        id: topic.lecturer.id,
        fullName: topic.lecturer.fullName,
        email: topic.lecturer.email,
        title: topic.lecturer.title,
      },
    };
  }

  private get includeClause() {
    return {
      lecturer: { select: { id: true, fullName: true, email: true, title: true } },
    } as const;
  }

  async findAll(query: QueryTopicDto) {
    let effectiveSemesterId = query.semesterId;

    if (!effectiveSemesterId) {
      const active = await this.prisma.semester.findFirst({
        where: { status: SemesterStatus.ACTIVE },
      });
      if (!active) return [];
      effectiveSemesterId = active.id;
    }

    const where: Prisma.TopicWhereInput = { semesterId: effectiveSemesterId };

    if (query.status) where.status = query.status;
    if (query.lecturerId) where.lecturerId = query.lecturerId;
    if (query.search) where.title = { contains: query.search };

    const topics = await this.prisma.topic.findMany({
      where,
      include: this.includeClause,
      orderBy: { createdAt: 'desc' },
    });

    return topics.map((t) => this.toResponse(t));
  }

  async findOne(id: number) {
    const topic = await this.prisma.topic.findUnique({
      where: { id },
      include: this.includeClause,
    });
    if (!topic) throw new NotFoundException(`Topic #${id} not found`);
    return this.toResponse(topic);
  }

  async create(dto: CreateTopicDto, lecturerId: number) {
    const active = await this.prisma.semester.findFirst({
      where: { status: SemesterStatus.ACTIVE },
    });
    if (!active) throw new BadRequestException('No active semester found');

    const topic = await this.prisma.topic.create({
      data: {
        title: dto.title,
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.requirements !== undefined && { requirements: dto.requirements }),
        ...(dto.note !== undefined && { note: dto.note }),
        semesterId: active.id,
        lecturerId,
      },
      include: this.includeClause,
    });

    return this.toResponse(topic);
  }

  async update(id: number, dto: UpdateTopicDto, lecturerId: number) {
    // placeholder
    return null as any;
  }

  async remove(id: number, lecturerId: number): Promise<void> {
    // placeholder
  }
}
