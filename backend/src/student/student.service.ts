import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { Prisma, SemesterStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ParseImportResult,
  ImportStudentsResult,
  ParseRowError,
  AlreadyEnrolledDetail,
  SkippedDetail,
} from './dto/import-student.dto';
import { QueryStudentDto } from './dto/query-student.dto';

const EMAIL_DOMAIN = 'student.hcmiu.edu.vn';

interface RawRow {
  index: number;
  lastName: string;
  firstName: string;
  username: string;
  studentId: string;
}

@Injectable()
export class StudentService {
  constructor(private prisma: PrismaService) {}

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
      .filter(
        (r) => r.lastName || r.firstName || r.username || r.studentId,
      );
  }

  private validateRow(row: RawRow, seenIds: Set<string>): string | null {
    if (!row.lastName) return 'Missing last name';
    if (!row.firstName) return 'Missing first name';
    if (!row.username) return 'Missing username';
    if (!row.studentId) return 'Missing studentId';
    if (seenIds.has(row.studentId)) return 'Duplicate studentId within file';
    return null;
  }

  async parseImport(buffer: Buffer): Promise<ParseImportResult> {
    const activeSemester = await this.prisma.semester.findFirst({
      where: { status: SemesterStatus.ACTIVE },
    });
    if (!activeSemester) {
      throw new BadRequestException('No active semester found');
    }

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
        const enrolled = await this.prisma.semesterStudent.findUnique({
          where: {
            studentId_semesterId: {
              studentId: existingStudent.id,
              semesterId: activeSemester.id,
            },
          },
        });
        if (enrolled) {
          alreadyEnrolledDetails.push({
            row: row.index,
            studentId: row.studentId,
            reason: 'Already enrolled in active semester',
          });
          continue;
        }
      }

      valid++;
    }

    return {
      total: rows.length,
      valid,
      alreadyEnrolled: alreadyEnrolledDetails.length,
      invalid: errors.length,
      errors,
      alreadyEnrolledDetails,
    };
  }

  async importStudents(buffer: Buffer): Promise<ImportStudentsResult> {
    const activeSemester = await this.prisma.semester.findFirst({
      where: { status: SemesterStatus.ACTIVE },
    });
    if (!activeSemester) {
      throw new BadRequestException('No active semester found');
    }

    const rows = this.extractRows(buffer);
    if (rows.length === 0) {
      throw new BadRequestException('File has no data rows');
    }

    const seenIds = new Set<string>();
    const skippedDetails: SkippedDetail[] = [];
    let imported = 0;

    for (const row of rows) {
      const error = this.validateRow(row, seenIds);
      if (error) {
        skippedDetails.push({ row: row.index, studentId: null, reason: error });
        continue;
      }
      seenIds.add(row.studentId);

      const student = await this.prisma.student.upsert({
        where: { studentId: row.studentId },
        update: {},
        create: {
          studentId: row.studentId,
          fullName: `${row.lastName} ${row.firstName}`,
          email: `${row.username}@${EMAIL_DOMAIN}`,
        },
      });

      const existing = await this.prisma.semesterStudent.findUnique({
        where: {
          studentId_semesterId: {
            studentId: student.id,
            semesterId: activeSemester.id,
          },
        },
      });

      if (existing) {
        skippedDetails.push({
          row: row.index,
          studentId: row.studentId,
          reason: 'Already enrolled in active semester',
        });
        continue;
      }

      await this.prisma.semesterStudent.create({
        data: { studentId: student.id, semesterId: activeSemester.id },
      });
      imported++;
    }

    return { imported, skipped: skippedDetails.length, skippedDetails };
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
      where.semesterStudents = { some: { semesterId } };
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
      const enrollments = await this.prisma.semesterStudent.findMany({
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
}
