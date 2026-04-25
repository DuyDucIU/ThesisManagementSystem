import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLecturerDto } from './dto/create-lecturer.dto';
import { UpdateLecturerDto } from './dto/update-lecturer.dto';
import { QueryLecturerDto } from './dto/query-lecturer.dto';

type LecturerRow = {
  id: number;
  lecturerId: string;
  fullName: string;
  email: string;
  title: string | null;
  maxStudents: number;
};

@Injectable()
export class LecturerService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateLecturerDto) {
    const passwordHash = await bcrypt.hash(dto.lecturerId, 10);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            username: dto.lecturerId,
            passwordHash,
            role: Role.LECTURER,
            isActive: true,
          },
        });
        const lecturer = await tx.lecturer.create({
          data: {
            lecturerId: dto.lecturerId,
            fullName: dto.fullName,
            email: dto.email,
            title: dto.title,
            maxStudents: dto.maxStudents ?? 5,
            userId: user.id,
          },
        });
        return this.toResponse(lecturer);
      });
    } catch (e) {
      return this.handleP2002(e, dto.lecturerId, dto.email);
    }
  }

  async findAll(query: QueryLecturerDto) {
    const { search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.LecturerWhereInput = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { lecturerId: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [lecturers, total] = await Promise.all([
      this.prisma.lecturer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.lecturer.count({ where }),
    ]);

    return {
      data: lecturers.map((l) => this.toResponse(l)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: number) {
    const lecturer = await this.prisma.lecturer.findUnique({ where: { id } });
    if (!lecturer) throw new NotFoundException(`Lecturer #${id} not found`);
    return this.toResponse(lecturer);
  }

  async update(id: number, dto: UpdateLecturerDto) {
    const lecturer = await this.prisma.lecturer.findUnique({ where: { id } });
    if (!lecturer) throw new NotFoundException(`Lecturer #${id} not found`);

    if (
      dto.fullName === undefined &&
      dto.email === undefined &&
      dto.title === undefined &&
      dto.maxStudents === undefined
    ) {
      throw new BadRequestException('At least one field must be provided');
    }

    try {
      const updated = await this.prisma.lecturer.update({
        where: { id },
        data: {
          ...(dto.fullName !== undefined && { fullName: dto.fullName }),
          ...(dto.email !== undefined && { email: dto.email }),
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.maxStudents !== undefined && { maxStudents: dto.maxStudents }),
        },
      });
      return this.toResponse(updated);
    } catch (e) {
      return this.handleP2002(e, undefined, dto.email);
    }
  }

  async remove(id: number): Promise<void> {
    const lecturer = await this.prisma.lecturer.findUnique({ where: { id } });
    if (!lecturer) throw new NotFoundException(`Lecturer #${id} not found`);

    const [topicCount, reviewerCount, thesisReviewCount, reviewedDocCount] =
      await Promise.all([
        this.prisma.topic.count({ where: { lecturerId: id } }),
        this.prisma.thesis.count({ where: { reviewerId: id } }),
        this.prisma.thesisReview.count({ where: { reviewerId: id } }),
        this.prisma.document.count({ where: { lecturerReviewedBy: id } }),
      ]);

    if (topicCount > 0)
      throw new ConflictException('Cannot delete lecturer with existing topics');
    if (reviewerCount > 0)
      throw new ConflictException('Cannot delete lecturer assigned as thesis reviewer');
    if (thesisReviewCount > 0)
      throw new ConflictException('Cannot delete lecturer with existing thesis reviews');
    if (reviewedDocCount > 0)
      throw new ConflictException('Cannot delete lecturer who has reviewed documents');

    await this.prisma.$transaction([
      this.prisma.lecturer.delete({ where: { id } }),
      this.prisma.user.delete({ where: { id: lecturer.userId } }),
    ]);
  }

  private toResponse(lecturer: LecturerRow) {
    return {
      id: lecturer.id,
      lecturerId: lecturer.lecturerId,
      fullName: lecturer.fullName,
      email: lecturer.email,
      title: lecturer.title,
      maxStudents: lecturer.maxStudents,
    };
  }

  private handleP2002(e: unknown, lecturerId?: string, email?: string): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      const rawTarget = e.meta?.target;
      const target = Array.isArray(rawTarget)
        ? rawTarget.join(',')
        : typeof rawTarget === 'string'
          ? rawTarget
          : '';
      if (target.includes('username') || target.includes('lecturer_id') || target.includes('lecturerId')) {
        throw new ConflictException(
          `Lecturer ID '${lecturerId}' is already in use`,
        );
      }
      if (target.includes('email')) {
        throw new ConflictException(`Email '${email}' is already in use`);
      }
      throw new ConflictException('A field conflicts with an existing record');
    }
    throw e;
  }
}
