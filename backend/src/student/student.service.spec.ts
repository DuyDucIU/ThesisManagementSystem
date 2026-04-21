import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SemesterStatus } from '@prisma/client';
import * as XLSX from 'xlsx';
import { StudentService } from './student.service';
import { PrismaService } from '../prisma/prisma.service';

function buildExcelBuffer(dataRows: string[][]): Buffer {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Last Name', 'First Name', 'Username', 'StudentID'],
    ...dataRows,
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

const mockActiveSemester = {
  id: 1,
  code: 'HK1-2025',
  name: 'HK1',
  startDate: new Date('2025-09-01'),
  endDate: new Date('2026-01-15'),
  status: SemesterStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('StudentService', () => {
  let service: StudentService;
  let prisma: {
    semester: { findFirst: jest.Mock };
    student: { findUnique: jest.Mock; upsert: jest.Mock };
    semesterStudent: { findUnique: jest.Mock; create: jest.Mock };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentService,
        {
          provide: PrismaService,
          useValue: {
            semester: { findFirst: jest.fn() },
            student: { findUnique: jest.fn(), upsert: jest.fn() },
            semesterStudent: { findUnique: jest.fn(), create: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<StudentService>(StudentService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── parseImport ────────────────────────────────────────────────────────────

  describe('parseImport', () => {
    it('throws BadRequestException when no active semester exists', async () => {
      prisma.semester.findFirst.mockResolvedValue(null);
      const buffer = buildExcelBuffer([['VO GIA', 'KIET', 'ititwe22055', 'ITITWE22055']]);

      await expect(service.parseImport(buffer)).rejects.toThrow(
        new BadRequestException('No active semester found'),
      );
    });

    it('throws BadRequestException when file has no data rows', async () => {
      prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
      const buffer = buildExcelBuffer([]);

      await expect(service.parseImport(buffer)).rejects.toThrow(
        new BadRequestException('File has no data rows'),
      );
    });

    it('returns all valid when every row is new and clean', async () => {
      prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
      prisma.student.findUnique.mockResolvedValue(null);

      const buffer = buildExcelBuffer([
        ['VO GIA', 'KIET', 'ititwe22055', 'ITITWE22055'],
        ['NGUYEN VAN', 'AN', 'itit22001', 'ITIT22001'],
      ]);

      const result = await service.parseImport(buffer);

      expect(result.total).toBe(2);
      expect(result.valid).toBe(2);
      expect(result.invalid).toBe(0);
      expect(result.alreadyEnrolled).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.alreadyEnrolledDetails).toHaveLength(0);
    });

    it('reports error for row missing studentId', async () => {
      prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);

      const buffer = buildExcelBuffer([
        ['VO GIA', 'KIET', 'ititwe22055', ''],
      ]);

      const result = await service.parseImport(buffer);

      expect(result.total).toBe(1);
      expect(result.invalid).toBe(1);
      expect(result.valid).toBe(0);
      expect(result.errors[0]).toEqual({ row: 2, reason: 'Missing studentId' });
    });

    it('reports error for row missing last name', async () => {
      prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);

      const buffer = buildExcelBuffer([
        ['', 'KIET', 'ititwe22055', 'ITITWE22055'],
      ]);

      const result = await service.parseImport(buffer);

      expect(result.invalid).toBe(1);
      expect(result.errors[0]).toEqual({ row: 2, reason: 'Missing last name' });
    });

    it('reports error for row missing first name', async () => {
      prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);

      const buffer = buildExcelBuffer([
        ['VO GIA', '', 'ititwe22055', 'ITITWE22055'],
      ]);

      const result = await service.parseImport(buffer);

      expect(result.invalid).toBe(1);
      expect(result.errors[0]).toEqual({ row: 2, reason: 'Missing first name' });
    });

    it('reports error for row missing username', async () => {
      prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);

      const buffer = buildExcelBuffer([
        ['VO GIA', 'KIET', '', 'ITITWE22055'],
      ]);

      const result = await service.parseImport(buffer);

      expect(result.invalid).toBe(1);
      expect(result.errors[0]).toEqual({ row: 2, reason: 'Missing username' });
    });

    it('reports error for duplicate studentId within the file', async () => {
      prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
      prisma.student.findUnique.mockResolvedValue(null);

      const buffer = buildExcelBuffer([
        ['VO GIA', 'KIET', 'ititwe22055', 'ITITWE22055'],
        ['VO GIA', 'KIET', 'ititwe22055', 'ITITWE22055'],
      ]);

      const result = await service.parseImport(buffer);

      expect(result.total).toBe(2);
      expect(result.valid).toBe(1);
      expect(result.invalid).toBe(1);
      expect(result.errors[0]).toEqual({
        row: 3,
        reason: 'Duplicate studentId within file',
      });
    });

    it('flags already-enrolled students in alreadyEnrolledDetails', async () => {
      prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
      prisma.student.findUnique.mockResolvedValue({ id: 10, studentId: 'ITITWE22055' });
      prisma.semesterStudent.findUnique.mockResolvedValue({ id: 5 });

      const buffer = buildExcelBuffer([
        ['VO GIA', 'KIET', 'ititwe22055', 'ITITWE22055'],
      ]);

      const result = await service.parseImport(buffer);

      expect(result.total).toBe(1);
      expect(result.valid).toBe(0);
      expect(result.alreadyEnrolled).toBe(1);
      expect(result.alreadyEnrolledDetails[0]).toEqual({
        row: 2,
        studentId: 'ITITWE22055',
        reason: 'Already enrolled in active semester',
      });
    });

    it('does not write to the database', async () => {
      prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
      prisma.student.findUnique.mockResolvedValue(null);

      const buffer = buildExcelBuffer([
        ['VO GIA', 'KIET', 'ititwe22055', 'ITITWE22055'],
      ]);

      await service.parseImport(buffer);

      expect(prisma.student.upsert).not.toHaveBeenCalled();
      expect(prisma.semesterStudent.create).not.toHaveBeenCalled();
    });
  });

  // ─── importStudents ─────────────────────────────────────────────────────────

  describe('importStudents', () => {
    it('throws BadRequestException when no active semester exists', async () => {
      prisma.semester.findFirst.mockResolvedValue(null);
      const buffer = buildExcelBuffer([['VO GIA', 'KIET', 'ititwe22055', 'ITITWE22055']]);

      await expect(service.importStudents(buffer)).rejects.toThrow(
        new BadRequestException('No active semester found'),
      );
    });

    it('throws BadRequestException when file has no data rows', async () => {
      prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
      const buffer = buildExcelBuffer([]);

      await expect(service.importStudents(buffer)).rejects.toThrow(
        new BadRequestException('File has no data rows'),
      );
    });

    it('creates student and semesterStudent for a new valid row', async () => {
      prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
      const createdStudent = { id: 1, studentId: 'ITITWE22055', fullName: 'VO GIA KIET', email: 'ititwe22055@student.hcmiu.edu.vn' };
      prisma.student.upsert.mockResolvedValue(createdStudent);
      prisma.semesterStudent.findUnique.mockResolvedValue(null);
      prisma.semesterStudent.create.mockResolvedValue({ id: 1 });

      const buffer = buildExcelBuffer([
        ['VO GIA', 'KIET', 'ititwe22055', 'ITITWE22055'],
      ]);

      const result = await service.importStudents(buffer);

      expect(prisma.student.upsert).toHaveBeenCalledWith({
        where: { studentId: 'ITITWE22055' },
        update: {},
        create: {
          studentId: 'ITITWE22055',
          fullName: 'VO GIA KIET',
          email: 'ititwe22055@student.hcmiu.edu.vn',
        },
      });
      expect(prisma.semesterStudent.create).toHaveBeenCalledWith({
        data: { studentId: 1, semesterId: 1 },
      });
      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(0);
    });

    it('skips already-enrolled student and adds to skippedDetails', async () => {
      prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
      prisma.student.upsert.mockResolvedValue({ id: 10, studentId: 'ITITWE22055' });
      prisma.semesterStudent.findUnique.mockResolvedValue({ id: 5 });

      const buffer = buildExcelBuffer([
        ['VO GIA', 'KIET', 'ititwe22055', 'ITITWE22055'],
      ]);

      const result = await service.importStudents(buffer);

      expect(prisma.semesterStudent.create).not.toHaveBeenCalled();
      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.skippedDetails[0]).toEqual({
        row: 2,
        studentId: 'ITITWE22055',
        reason: 'Already enrolled in active semester',
      });
    });

    it('skips invalid row and adds to skippedDetails with null studentId', async () => {
      prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);

      const buffer = buildExcelBuffer([
        ['VO GIA', 'KIET', 'ititwe22055', ''],
      ]);

      const result = await service.importStudents(buffer);

      expect(prisma.student.upsert).not.toHaveBeenCalled();
      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.skippedDetails[0]).toEqual({
        row: 2,
        studentId: null,
        reason: 'Missing studentId',
      });
    });

    it('handles mixed valid, invalid, and already-enrolled rows', async () => {
      prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);

      prisma.student.upsert
        .mockResolvedValueOnce({ id: 1, studentId: 'ITITWE22055' })
        .mockResolvedValueOnce({ id: 2, studentId: 'ITIT22001' });

      prisma.semesterStudent.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 5 });

      prisma.semesterStudent.create.mockResolvedValue({ id: 10 });

      const buffer = buildExcelBuffer([
        ['VO GIA', 'KIET', 'ititwe22055', 'ITITWE22055'],
        ['NGUYEN VAN', 'AN', 'itit22001', 'ITIT22001'],
        ['', 'HUNG', 'itit22002', 'ITIT22002'],
      ]);

      const result = await service.importStudents(buffer);

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(2);
      expect(result.skippedDetails).toHaveLength(2);
    });
  });
});
