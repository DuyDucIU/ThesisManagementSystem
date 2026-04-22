import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, SemesterStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSemesterDto } from './dto/create-semester.dto';
import { UpdateSemesterDto } from './dto/update-semester.dto';
import { QuerySemesterDto } from './dto/query-semester.dto';

@Injectable()
export class SemesterService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QuerySemesterDto) {
    const { search, status, startDateFrom, startDateTo } = query;
    const where: Prisma.SemesterWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (startDateFrom || startDateTo) {
      where.startDate = {};
      if (startDateFrom) where.startDate.gte = new Date(startDateFrom);
      if (startDateTo) where.startDate.lte = new Date(startDateTo);
    }

    return this.prisma.semester.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const semester = await this.prisma.semester.findUnique({ where: { id } });
    if (!semester) throw new NotFoundException(`Semester #${id} not found`);
    return semester;
  }

  async create(dto: CreateSemesterDto) {
    if (new Date(dto.endDate) <= new Date(dto.startDate)) {
      throw new BadRequestException('endDate must be after startDate');
    }

    try {
      return await this.prisma.semester.create({
        data: {
          code: dto.code,
          name: dto.name,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          `Semester code '${dto.code}' already exists`,
        );
      }
      throw e;
    }
  }

  async update(id: number, dto: UpdateSemesterDto) {
    const semester = await this.findOne(id);

    if (semester.status !== SemesterStatus.INACTIVE) {
      throw new ConflictException('Only INACTIVE semesters can be edited');
    }

    if (!dto.code && !dto.name && !dto.startDate && !dto.endDate) {
      throw new BadRequestException(
        'At least one field must be provided for update',
      );
    }

    const startDate = dto.startDate
      ? new Date(dto.startDate)
      : semester.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : semester.endDate;

    if (endDate <= startDate) {
      throw new BadRequestException('endDate must be after startDate');
    }

    try {
      return await this.prisma.semester.update({
        where: { id },
        data: {
          ...(dto.code !== undefined && { code: dto.code }),
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.startDate !== undefined && {
            startDate: new Date(dto.startDate),
          }),
          ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Semester code already exists');
      }
      throw e;
    }
  }

  async remove(id: number) {
    const semester = await this.findOne(id);

    if (semester.status !== SemesterStatus.INACTIVE) {
      throw new ConflictException('Only INACTIVE semesters can be deleted');
    }

    const [studentCount, topicCount] = await Promise.all([
      this.prisma.semesterStudent.count({ where: { semesterId: id } }),
      this.prisma.topic.count({ where: { semesterId: id } }),
    ]);

    if (studentCount > 0 || topicCount > 0) {
      throw new ConflictException(
        'Cannot delete a semester with associated students or topics',
      );
    }

    return this.prisma.semester.delete({ where: { id } });
  }

  async activate(id: number) {
    const semester = await this.findOne(id);

    if (semester.status !== SemesterStatus.INACTIVE) {
      throw new ConflictException('Only INACTIVE semesters can be activated');
    }

    const activeSemester = await this.prisma.semester.findFirst({
      where: { status: SemesterStatus.ACTIVE },
    });

    if (activeSemester) {
      throw new ConflictException('Another semester is already active');
    }

    return this.prisma.semester.update({
      where: { id },
      data: { status: SemesterStatus.ACTIVE },
    });
  }

  async deactivate(id: number) {
    const semester = await this.findOne(id);

    if (semester.status !== SemesterStatus.ACTIVE) {
      throw new ConflictException('Only ACTIVE semesters can be deactivated');
    }

    return this.prisma.semester.update({
      where: { id },
      data: { status: SemesterStatus.INACTIVE },
    });
  }

  async close(id: number) {
    const semester = await this.findOne(id);

    if (semester.status !== SemesterStatus.ACTIVE) {
      throw new ConflictException('Only ACTIVE semesters can be closed');
    }

    return this.prisma.semester.update({
      where: { id },
      data: { status: SemesterStatus.CLOSED },
    });
  }
}
