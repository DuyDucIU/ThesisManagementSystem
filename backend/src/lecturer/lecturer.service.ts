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
      this.handleP2002(e, dto.lecturerId, dto.email);
    }
  }

  async findAll(query: QueryLecturerDto) {
    return { data: [], total: 0, page: 1, limit: 20 };
  }

  async findOne(id: number) {
    return null as any;
  }

  async update(id: number, dto: UpdateLecturerDto) {
    return null as any;
  }

  async remove(id: number): Promise<void> {
    return;
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
