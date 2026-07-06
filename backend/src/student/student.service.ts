import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AccountActionDto } from './dto/account-action.dto';
import { ActivateBulkDto } from './dto/activate-bulk.dto';
import { AccountBulkDto } from './dto/account-bulk.dto';
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
    const { search, hasAccount, accountStatus, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.StudentWhereInput = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { studentId: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (accountStatus === 'no-account') {
      where.userId = null;
    } else if (accountStatus === 'active') {
      where.user = { isActive: true };
    } else if (accountStatus === 'inactive') {
      where.user = { isActive: false };
    } else if (hasAccount === true) {
      where.userId = { not: null };
    } else if (hasAccount === false) {
      where.userId = null;
    }

    const [students, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        include: { user: { select: { isActive: true } } },
        skip,
        take: limit,
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.student.count({ where }),
    ]);

    const data = students.map((s) => ({
      id: s.id,
      studentId: s.studentId,
      fullName: s.fullName,
      email: s.email,
      hasAccount: s.userId !== null,
      isActive: s.user?.isActive ?? null,
    }));

    return { data, total, page, limit };
  }

  async activateAccount(id: string) {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) throw new NotFoundException(`Student #${id} not found`);
    if (student.userId !== null)
      throw new ConflictException('Student already has an account');

    const passwordHash = await bcrypt.hash(student.studentId, 10);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            username: student.studentId,
            passwordHash,
            role: Role.STUDENT,
            isActive: true,
          },
        });
        await tx.student.update({
          where: { id },
          data: { userId: user.id },
        });
        return {
          id: student.id,
          studentId: student.studentId,
          fullName: student.fullName,
          email: student.email,
          hasAccount: true,
          isActive: true,
        };
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Student already has an account');
      }
      throw e;
    }
  }

  async toggleAccount(id: string, dto: AccountActionDto) {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) throw new NotFoundException(`Student #${id} not found`);
    if (student.userId === null)
      throw new ConflictException('Student has no account to modify');

    const userId = student.userId;
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isActive: dto.isActive },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new ConflictException('Account record is missing; try re-activating the student');
      }
      throw e;
    }

    return {
      id: student.id,
      studentId: student.studentId,
      fullName: student.fullName,
      email: student.email,
      hasAccount: true,
      isActive: dto.isActive,
    };
  }

  async activateBulk(dto: ActivateBulkDto) {
    const students = await this.prisma.student.findMany({
      where: { id: { in: dto.ids }, userId: null },
    });
    const skipped = dto.ids.length - students.length;

    if (students.length === 0) return { activated: 0, skipped };

    const hashed = await Promise.all(
      students.map((s) => bcrypt.hash(s.studentId, 10)),
    );

    try {
      await this.prisma.$transaction(async (tx) => {
        for (let i = 0; i < students.length; i++) {
          const user = await tx.user.create({
            data: {
              username: students[i].studentId,
              passwordHash: hashed[i],
              role: Role.STUDENT,
              isActive: true,
            },
          });
          await tx.student.update({
            where: { id: students[i].id },
            data: { userId: user.id },
          });
        }
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('One or more student accounts already exist; retry with a smaller batch');
      }
      throw e;
    }

    return { activated: students.length, skipped };
  }

  async toggleAccountBulk(dto: AccountBulkDto) {
    const students = await this.prisma.student.findMany({
      where: { id: { in: dto.ids }, userId: { not: null } },
      select: { userId: true },
    });
    const skipped = dto.ids.length - students.length;
    const userIds = students.map((s) => s.userId).filter((id): id is string => id !== null);

    if (userIds.length > 0) {
      await this.prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: { isActive: dto.isActive },
      });
    }

    return { updated: students.length, skipped };
  }

  async remove(id: string) {
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

  async update(id: string, dto: UpdateStudentDto) {
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
