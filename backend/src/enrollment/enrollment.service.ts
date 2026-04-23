import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Semester, SemesterStatus } from '@prisma/client';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';
import { QueryEnrollmentDto } from './dto/query-enrollment.dto';
import {
  ParseImportResult,
  ParseRowError,
  AlreadyEnrolledDetail,
} from './dto/import-enrollment.dto';

interface RawRow {
  index: number;
  lastName: string;
  firstName: string;
  username: string;
  studentId: string;
}

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

  private extractRows(buffer: Buffer): RawRow[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      defval: '',
    });

    return raw
      .slice(1)
      .map((row, i) => ({
        index: i + 2,
        lastName: String(row[0] ?? '').trim(),
        firstName: String(row[1] ?? '').trim(),
        username: String(row[2] ?? '').trim(),
        studentId: String(row[3] ?? '').trim(),
      }))
      .filter((r) => r.lastName || r.firstName || r.username || r.studentId);
  }

  private validateRow(row: RawRow, seenIds: Set<string>): string | null {
    if (!row.lastName) return 'Missing last name';
    if (!row.firstName) return 'Missing first name';
    if (!row.username) return 'Missing username';
    if (!row.studentId) return 'Missing studentId';
    if (seenIds.has(row.studentId)) return 'Duplicate studentId within file';
    return null;
  }

  async parseImport(
    buffer: Buffer,
    semesterId: number | undefined,
  ): Promise<ParseImportResult> {
    const target = await this.resolveTargetSemester(semesterId, {
      allowClosed: false,
    });

    const rows = this.extractRows(buffer);
    if (rows.length === 0) {
      throw new BadRequestException('File has no data rows');
    }

    const seenIds = new Set<string>();
    const errors: ParseRowError[] = [];
    const alreadyEnrolledDetails: AlreadyEnrolledDetail[] = [];
    let valid = 0;

    for (const row of rows) {
      const error = this.validateRow(row, seenIds);
      if (error) {
        errors.push({ row: row.index, reason: error });
        continue;
      }
      seenIds.add(row.studentId);

      const existingStudent = await this.prisma.student.findUnique({
        where: { studentId: row.studentId },
      });

      if (existingStudent) {
        const enrolled = await this.prisma.enrollment.findUnique({
          where: {
            studentId_semesterId: {
              studentId: existingStudent.id,
              semesterId: target.id,
            },
          },
        });
        if (enrolled) {
          alreadyEnrolledDetails.push({
            row: row.index,
            studentId: row.studentId,
            reason: 'Already enrolled in target semester',
          });
          continue;
        }
      }

      valid++;
    }

    return {
      semester: { id: target.id, code: target.code, name: target.name },
      total: rows.length,
      valid,
      alreadyEnrolled: alreadyEnrolledDetails.length,
      invalid: errors.length,
      errors,
      alreadyEnrolledDetails,
    };
  }
}
