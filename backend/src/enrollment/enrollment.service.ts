import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Semester, SemesterStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryEnrollmentDto } from './dto/query-enrollment.dto';

@Injectable()
export class EnrollmentService {
  constructor(private prisma: PrismaService) {}

  private async resolveTargetSemester(
    semesterId: number | undefined,
    { allowClosed }: { allowClosed: boolean },
  ): Promise<Semester> {
    if (semesterId != null) {
      const semester = await this.prisma.semester.findUnique({
        where: { id: semesterId },
      });
      if (!semester) {
        throw new NotFoundException(`Semester #${semesterId} not found`);
      }
      if (!allowClosed && semester.status === SemesterStatus.CLOSED) {
        throw new BadRequestException('Cannot import into a closed semester');
      }
      return semester;
    }

    const active = await this.prisma.semester.findFirst({
      where: { status: SemesterStatus.ACTIVE },
    });
    if (!active) {
      throw new BadRequestException(
        'No active semester — please specify semesterId',
      );
    }
    return active;
  }

  async findAll(query: QueryEnrollmentDto) {
    const { semesterId, status, search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const semester = await this.resolveTargetSemester(semesterId, {
      allowClosed: true,
    });

    const where: Prisma.EnrollmentWhereInput = {
      semesterId: semester.id,
    };
    if (status) where.status = status;
    if (search) {
      where.student = {
        OR: [
          { fullName: { contains: search } },
          { studentId: { contains: search } },
          { email: { contains: search } },
        ],
      };
    }

    const [enrollments, total] = await Promise.all([
      this.prisma.enrollment.findMany({
        where,
        skip,
        take: limit,
        include: { student: true },
        orderBy: { student: { fullName: 'asc' } },
      }),
      this.prisma.enrollment.count({ where }),
    ]);

    const data = enrollments.map((e) => ({
      enrollmentId: e.id,
      status: e.status,
      student: {
        id: e.student.id,
        studentId: e.student.studentId,
        fullName: e.student.fullName,
        email: e.student.email,
        hasAccount: e.student.userId !== null,
      },
    }));

    return {
      data,
      total,
      page,
      limit,
      semester: {
        id: semester.id,
        code: semester.code,
        name: semester.name,
      },
    };
  }
}
