import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertLecturerSemesterDto } from './dto/upsert-lecturer-semester.dto';

@Injectable()
export class LecturerSemesterService {
  constructor(private prisma: PrismaService) {}

  async resolveCapacity(lecturerId: string, semesterId: string): Promise<number> {
    const direct = await this.prisma.lecturerSemester.findUnique({
      where: { lecturerId_semesterId: { lecturerId, semesterId } },
    });
    if (direct) return direct.maxStudents;

    const targetSemester = await this.prisma.semester.findUnique({
      where: { id: semesterId },
      select: { startDate: true },
    });
    if (!targetSemester) throw new NotFoundException(`Semester #${semesterId} not found`);

    const previous = await this.prisma.lecturerSemester.findFirst({
      where: {
        lecturerId,
        semester: { startDate: { lt: targetSemester.startDate } },
      },
      orderBy: { semester: { startDate: 'desc' } },
    });
    if (previous) return previous.maxStudents;

    const lecturer = await this.prisma.lecturer.findUnique({
      where: { id: lecturerId },
      select: { maxStudents: true },
    });
    if (!lecturer) throw new NotFoundException(`Lecturer #${lecturerId} not found`);

    return lecturer.maxStudents;
  }

  async upsert(lecturerId: string, dto: UpsertLecturerSemesterDto) {
    const lecturer = await this.prisma.lecturer.findUnique({ where: { id: lecturerId } });
    if (!lecturer) throw new NotFoundException(`Lecturer #${lecturerId} not found`);

    const record = await this.prisma.lecturerSemester.upsert({
      where: { lecturerId_semesterId: { lecturerId, semesterId: dto.semesterId } },
      update: { maxStudents: dto.maxStudents },
      create: { lecturerId, semesterId: dto.semesterId, maxStudents: dto.maxStudents },
    });

    return { lecturerId: record.lecturerId, semesterId: record.semesterId, maxStudents: record.maxStudents };
  }

  async findAll(semesterId?: string) {
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

  async resolveActiveSemesterId(): Promise<string> {
    const active = await this.prisma.semester.findFirst({
      where: { status: 'ACTIVE' },
    });
    if (!active) throw new BadRequestException('No active semester found');
    return active.id;
  }
}
