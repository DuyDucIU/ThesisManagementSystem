import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertLecturerSemesterDto } from './dto/upsert-lecturer-semester.dto';

@Injectable()
export class LecturerSemesterService {
  constructor(private prisma: PrismaService) {}

  async resolveCapacity(lecturerId: number, semesterId: number): Promise<number> {
    const direct = await this.prisma.lecturerSemester.findUnique({
      where: { lecturerId_semesterId: { lecturerId, semesterId } },
    });
    if (direct) return direct.maxStudents;

    const targetSemester = await this.prisma.semester.findUnique({
      where: { id: semesterId },
      select: { startDate: true },
    });

    if (targetSemester) {
      const previous = await this.prisma.lecturerSemester.findFirst({
        where: {
          lecturerId,
          semester: { startDate: { lt: targetSemester.startDate } },
        },
        orderBy: { semester: { startDate: 'desc' } },
      });
      if (previous) return previous.maxStudents;
    }

    const lecturer = await this.prisma.lecturer.findUnique({
      where: { id: lecturerId },
      select: { maxStudents: true },
    });

    return lecturer?.maxStudents ?? 5;
  }

  async upsert(lecturerId: number, dto: UpsertLecturerSemesterDto) {
    const lecturer = await this.prisma.lecturer.findUnique({ where: { id: lecturerId } });
    if (!lecturer) throw new NotFoundException(`Lecturer #${lecturerId} not found`);

    const record = await this.prisma.lecturerSemester.upsert({
      where: { lecturerId_semesterId: { lecturerId, semesterId: dto.semesterId } },
      update: { maxStudents: dto.maxStudents },
      create: { lecturerId, semesterId: dto.semesterId, maxStudents: dto.maxStudents },
    });

    return { lecturerId: record.lecturerId, semesterId: record.semesterId, maxStudents: record.maxStudents };
  }

  async findAll(semesterId?: number) {
    const where = semesterId ? { semesterId } : {};
    const records = await this.prisma.lecturerSemester.findMany({
      where,
      include: { lecturer: { select: { id: true, fullName: true, email: true } } },
      orderBy: { lecturer: { fullName: 'asc' } },
    });

    return records.map((r) => ({
      lecturerId: r.lecturerId,
      semesterId: r.semesterId,
      maxStudents: r.maxStudents,
      lecturer: r.lecturer,
    }));
  }
}
