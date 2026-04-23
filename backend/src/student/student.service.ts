import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { QueryStudentDto } from './dto/query-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Injectable()
export class StudentService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateStudentDto) {
    try {
      const student = await this.prisma.student.create({
        data: {
          studentId: dto.studentId,
          fullName: dto.fullName,
          email: dto.email,
        },
      });
      return {
        id: student.id,
        studentId: student.studentId,
        fullName: student.fullName,
        email: student.email,
        hasAccount: student.userId !== null,
      };
    } catch (e) {
      this.handleStudentP2002(e, dto.studentId, dto.email);
    }
  }

  async findAll(query: QueryStudentDto) {
    const { search, hasAccount, semesterId, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.StudentWhereInput = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { studentId: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (hasAccount === true) where.userId = { not: null };
    else if (hasAccount === false) where.userId = null;

    if (semesterId !== undefined) {
      where.enrollments = { some: { semesterId } };
    }

    const [students, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.student.count({ where }),
    ]);

    const enrollmentMap = new Map<number, string>();
    if (semesterId !== undefined && students.length > 0) {
      const enrollments = await this.prisma.enrollment.findMany({
        where: {
          semesterId,
          studentId: { in: students.map((s) => s.id) },
        },
        select: { studentId: true, status: true },
      });
      for (const e of enrollments) {
        enrollmentMap.set(e.studentId, e.status);
      }
    }

    const data = students.map((s) => {
      const base = {
        id: s.id,
        studentId: s.studentId,
        fullName: s.fullName,
        email: s.email,
        hasAccount: s.userId !== null,
      };
      if (semesterId !== undefined) {
        const status = enrollmentMap.get(s.id);
        return {
          ...base,
          semesterStudent: status !== undefined ? { status } : null,
        };
      }
      return base;
    });

    return { data, total, page, limit };
  }

  async remove(id: number) {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) throw new NotFoundException(`Student #${id} not found`);

    const thesisCount = await this.prisma.thesis.count({
      where: { enrollment: { studentId: id } },
    });

    if (thesisCount > 0) {
      throw new ConflictException(
        'Cannot delete student with active thesis work',
      );
    }

    await this.prisma.$transaction([
      this.prisma.enrollment.deleteMany({ where: { studentId: id } }),
      this.prisma.student.delete({ where: { id } }),
    ]);
  }

  async update(id: number, dto: UpdateStudentDto) {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) throw new NotFoundException(`Student #${id} not found`);

    if (
      dto.fullName === undefined &&
      dto.email === undefined &&
      dto.studentId === undefined
    ) {
      throw new BadRequestException('At least one field must be provided');
    }

    try {
      const updated = await this.prisma.student.update({
        where: { id },
        data: {
          ...(dto.fullName !== undefined && { fullName: dto.fullName }),
          ...(dto.email !== undefined && { email: dto.email }),
          ...(dto.studentId !== undefined && { studentId: dto.studentId }),
        },
      });
      return {
        id: updated.id,
        studentId: updated.studentId,
        fullName: updated.fullName,
        email: updated.email,
        hasAccount: updated.userId !== null,
      };
    } catch (e) {
      this.handleStudentP2002(e, dto.studentId, dto.email);
    }
  }

  private handleStudentP2002(
    e: unknown,
    studentId?: string,
    email?: string,
  ): never {
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
      if (target.includes('student_id') || target.includes('studentId')) {
        throw new BadRequestException(
          `Student ID '${studentId}' is already in use`,
        );
      }
      if (target.includes('email')) {
        throw new BadRequestException(`Email '${email}' is already in use`);
      }
      throw new BadRequestException(
        'A field conflicts with an existing record',
      );
    }
    throw e as Error;
  }
}
