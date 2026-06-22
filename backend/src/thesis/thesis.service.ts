import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, Role, EnrollmentStatus, TopicStatus, ThesisStatus } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { LecturerSemesterService } from '../lecturer-semester/lecturer-semester.service';
import { CreateThesisDto } from './dto/create-thesis.dto';
import { QueryThesisDto } from './dto/query-thesis.dto';

type AuthUser = { role: Role; lecturer: { id: number } | null };

type ThesisWithRelations = Prisma.ThesisGetPayload<{
  include: {
    topic: { select: { id: true; title: true; lecturerId: true; semesterId: true } };
    enrollment: { include: { student: { select: { id: true; studentId: true; fullName: true } } } };
  };
}>;

@Injectable()
export class ThesisService {
  constructor(
    private prisma: PrismaService,
    private lecturerSemesterService: LecturerSemesterService,
  ) {}

  private get includeClause() {
    return {
      topic: { select: { id: true, title: true, lecturerId: true, semesterId: true } },
      enrollment: {
        include: { student: { select: { id: true, studentId: true, fullName: true } } },
      },
    } as const;
  }

  private toResponse(thesis: ThesisWithRelations) {
    return {
      id: thesis.id,
      title: thesis.title,
      status: thesis.status,
      createdAt: thesis.createdAt,
      topic: { id: thesis.topic.id, title: thesis.topic.title },
      student: thesis.enrollment.student,
      enrollment: {
        id: thesis.enrollmentId,
        semesterId: thesis.topic.semesterId,
      },
    };
  }

  private async recomputeTopicStatuses(
    tx: Prisma.TransactionClient,
    lecturerId: number,
    semesterId: number,
  ) {
    const assignedCount = await tx.thesis.count({
      where: { topic: { lecturerId, semesterId } },
    });
    const capacity = await this.lecturerSemesterService.resolveCapacity(lecturerId, semesterId);

    if (assignedCount >= capacity) {
      await tx.topic.updateMany({
        where: { lecturerId, semesterId, status: TopicStatus.OPEN },
        data: { status: TopicStatus.FULL },
      });
    } else {
      await tx.topic.updateMany({
        where: { lecturerId, semesterId, status: TopicStatus.FULL },
        data: { status: TopicStatus.OPEN },
      });
    }
  }

  async assign(dto: CreateThesisDto, currentUser: AuthUser) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: dto.enrollmentId },
      include: { student: { select: { id: true, studentId: true, fullName: true } } },
    });
    if (!enrollment) throw new NotFoundException(`Enrollment #${dto.enrollmentId} not found`);
    if (enrollment.status !== EnrollmentStatus.AVAILABLE) {
      throw new BadRequestException('Student is not available for assignment');
    }

    const topic = await this.prisma.topic.findUnique({ where: { id: dto.topicId } });
    if (!topic) throw new NotFoundException(`Topic #${dto.topicId} not found`);
    if (topic.status !== TopicStatus.OPEN) {
      throw new BadRequestException('Topic is not open for assignment');
    }
    if (topic.semesterId !== enrollment.semesterId) {
      throw new BadRequestException('Topic and enrollment must be in the same semester');
    }

    if (currentUser.role === Role.LECTURER) {
      if (currentUser.lecturer!.id !== topic.lecturerId) {
        throw new ForbiddenException('You do not own this topic');
      }
    }

    const capacity = await this.lecturerSemesterService.resolveCapacity(topic.lecturerId, topic.semesterId);
    const currentCount = await this.prisma.thesis.count({
      where: { topic: { lecturerId: topic.lecturerId, semesterId: topic.semesterId } },
    });
    if (currentCount >= capacity) {
      throw new BadRequestException('Lecturer has reached maximum student capacity for this semester');
    }

    try {
      const thesis = await this.prisma.$transaction(async (tx) => {
        const created = await tx.thesis.create({
          data: {
            enrollmentId: dto.enrollmentId,
            topicId: dto.topicId,
            title: topic.title,
          },
          include: this.includeClause,
        });

        await tx.enrollment.update({
          where: { id: dto.enrollmentId },
          data: { status: EnrollmentStatus.ASSIGNED },
        });

        await this.recomputeTopicStatuses(tx, topic.lecturerId, topic.semesterId);

        return created;
      });

      return this.toResponse(thesis);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Student already has a thesis this semester');
      }
      throw error;
    }
  }

  async unassign(id: number, currentUser: AuthUser): Promise<void> {
    const thesis = await this.prisma.thesis.findUnique({
      where: { id },
      include: { topic: { select: { lecturerId: true, semesterId: true } } },
    });
    if (!thesis) throw new NotFoundException(`Thesis #${id} not found`);

    if (thesis.status !== ThesisStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot unassign — thesis has progressed beyond initial stage');
    }

    if (currentUser.role === Role.LECTURER) {
      if (currentUser.lecturer!.id !== thesis.topic.lecturerId) {
        throw new ForbiddenException('You do not own this topic');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.thesis.delete({ where: { id } });

      await tx.enrollment.update({
        where: { id: thesis.enrollmentId },
        data: { status: EnrollmentStatus.AVAILABLE },
      });

      await this.recomputeTopicStatuses(tx, thesis.topic.lecturerId, thesis.topic.semesterId);
    });
  }

  async findAll(query: QueryThesisDto, currentUser: AuthUser) {
    let effectiveSemesterId = query.semesterId;

    if (!effectiveSemesterId) {
      const active = await this.prisma.semester.findFirst({
        where: { status: 'ACTIVE' },
      });
      if (!active) return [];
      effectiveSemesterId = active.id;
    }

    const where: Prisma.ThesisWhereInput = {
      topic: { semesterId: effectiveSemesterId },
    };

    if (currentUser.role === Role.LECTURER) {
      where.topic = { ...where.topic as object, lecturerId: currentUser.lecturer!.id };
    } else if (query.lecturerId) {
      where.topic = { ...where.topic as object, lecturerId: query.lecturerId };
    }

    if (query.status) where.status = query.status;
    if (query.topicId) where.topicId = query.topicId;

    const theses = await this.prisma.thesis.findMany({
      where,
      include: this.includeClause,
      orderBy: { createdAt: 'desc' },
    });

    return theses.map((t) => this.toResponse(t));
  }

  async findOne(id: number, currentUser: AuthUser) {
    const thesis = await this.prisma.thesis.findUnique({
      where: { id },
      include: this.includeClause,
    });
    if (!thesis) throw new NotFoundException(`Thesis #${id} not found`);

    if (currentUser.role === Role.LECTURER) {
      if (currentUser.lecturer!.id !== thesis.topic.lecturerId) {
        throw new ForbiddenException('You do not own this topic');
      }
    }

    return this.toResponse(thesis);
  }
}
