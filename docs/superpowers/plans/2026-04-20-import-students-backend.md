# Import Students — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `POST /students/import?action=parse|import` endpoint that parses an Excel file and bulk-imports students into the active semester.

**Architecture:** A new `student` NestJS module with one controller action handling both phases via an `action` query param. Shared row-extraction and validation logic is reused by both phases. Parse is read-only; import writes `Student` and `SemesterStudent` records.

**Tech Stack:** `xlsx` (SheetJS) for Excel parsing, `multer` (memory storage) for file upload via `@nestjs/platform-express`, Prisma for DB access, Jest for unit tests.

---

## File Map

| Action | File |
|--------|------|
| Create | `backend/src/student/dto/import-student.dto.ts` |
| Create | `backend/src/student/student.service.ts` |
| Create | `backend/src/student/student.service.spec.ts` |
| Create | `backend/src/student/student.controller.ts` |
| Create | `backend/src/student/student.controller.spec.ts` |
| Create | `backend/src/student/student.module.ts` |
| Modify | `backend/src/app.module.ts` |

---

### Task 1: Install dependencies

**Files:**
- Modify: `backend/package.json` (via pnpm)

- [ ] **Step 1: Install runtime and type packages**

```bash
cd backend && pnpm add xlsx && pnpm add -D @types/multer
```

Expected: both packages appear in `package.json`. No errors.

- [ ] **Step 2: Verify xlsx import resolves**

```bash
cd backend && node -e "const XLSX = require('xlsx'); console.log(XLSX.version)"
```

Expected: prints a version string like `0.20.x`.

- [ ] **Step 3: Commit**

```bash
cd backend
git add package.json pnpm-lock.yaml
git commit -m "Add xlsx and @types/multer dependencies"
```

---

### Task 2: Create response type interfaces

**Files:**
- Create: `backend/src/student/dto/import-student.dto.ts`

- [ ] **Step 1: Create the DTO file**

```typescript
// backend/src/student/dto/import-student.dto.ts

export interface ParseRowError {
  row: number;
  reason: string;
}

export interface AlreadyEnrolledDetail {
  row: number;
  studentId: string;
  reason: string;
}

export interface ParseImportResult {
  total: number;
  valid: number;
  alreadyEnrolled: number;
  invalid: number;
  errors: ParseRowError[];
  alreadyEnrolledDetails: AlreadyEnrolledDetail[];
}

export interface SkippedDetail {
  row: number;
  studentId: string | null;
  reason: string;
}

export interface ImportStudentsResult {
  imported: number;
  skipped: number;
  skippedDetails: SkippedDetail[];
}
```

- [ ] **Step 2: Commit**

```bash
cd backend
git add src/student/dto/import-student.dto.ts
git commit -m "Add import student response type interfaces"
```

---

### Task 3: TDD — parseImport service method

**Files:**
- Create: `backend/src/student/student.service.ts`
- Create: `backend/src/student/student.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// backend/src/student/student.service.spec.ts
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
        ['VO GIA', 'KIET', 'ititwe22055', ''], // empty studentId
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
        ['VO GIA', 'KIET', 'ititwe22055', 'ITITWE22055'], // duplicate
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
      prisma.semesterStudent.findUnique.mockResolvedValue({ id: 5 }); // already enrolled

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
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && pnpm run test --testPathPattern=student.service.spec
```

Expected: FAIL — `StudentService` not found / not implemented.

- [ ] **Step 3: Implement the service**

```typescript
// backend/src/student/student.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { SemesterStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ParseImportResult,
  ImportStudentsResult,
} from './dto/import-student.dto';

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
    const errors: { row: number; reason: string }[] = [];
    const alreadyEnrolledDetails: {
      row: number;
      studentId: string;
      reason: string;
    }[] = [];
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
    const skippedDetails: {
      row: number;
      studentId: string | null;
      reason: string;
    }[] = [];
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
}
```

- [ ] **Step 4: Run parseImport tests to verify they pass**

```bash
cd backend && pnpm run test --testPathPattern=student.service.spec
```

Expected: all `parseImport` tests PASS.

- [ ] **Step 5: Commit**

```bash
cd backend
git add src/student/student.service.ts src/student/student.service.spec.ts
git commit -m "Add StudentService parseImport with tests"
```

---

### Task 4: TDD — importStudents service method

**Files:**
- Modify: `backend/src/student/student.service.spec.ts`

- [ ] **Step 1: Add importStudents tests to the spec file (inside the same `describe('StudentService')` block)**

```typescript
// Add this block after the closing brace of the parseImport describe block

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
      prisma.semesterStudent.findUnique.mockResolvedValue({ id: 5 }); // enrolled

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
        ['VO GIA', 'KIET', 'ititwe22055', ''], // missing studentId
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
        .mockResolvedValueOnce({ id: 1, studentId: 'ITITWE22055' }) // new student
        .mockResolvedValueOnce({ id: 2, studentId: 'ITIT22001' });   // existing student

      prisma.semesterStudent.findUnique
        .mockResolvedValueOnce(null)       // ITITWE22055 not enrolled
        .mockResolvedValueOnce({ id: 5 }); // ITIT22001 already enrolled

      prisma.semesterStudent.create.mockResolvedValue({ id: 10 });

      const buffer = buildExcelBuffer([
        ['VO GIA', 'KIET', 'ititwe22055', 'ITITWE22055'],  // valid → imported
        ['NGUYEN VAN', 'AN', 'itit22001', 'ITIT22001'],    // already enrolled → skipped
        ['', 'HUNG', 'itit22002', 'ITIT22002'],            // missing last name → skipped
      ]);

      const result = await service.importStudents(buffer);

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(2);
      expect(result.skippedDetails).toHaveLength(2);
    });
  });
```

- [ ] **Step 2: Run all service tests — they should pass immediately**

`importStudents` was already implemented in Task 3 Step 3. Adding the tests here follows the spec, not a new red/green cycle.

```bash
cd backend && pnpm run test --testPathPattern=student.service.spec
```

Expected: ALL tests PASS.

- [ ] **Step 4: Commit**

```bash
cd backend
git add src/student/student.service.spec.ts
git commit -m "Add importStudents tests to StudentService spec"
```

---

### Task 5: Create controller + module + register in AppModule

**Files:**
- Create: `backend/src/student/student.controller.ts`
- Create: `backend/src/student/student.controller.spec.ts`
- Create: `backend/src/student/student.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Write the controller spec**

```typescript
// backend/src/student/student.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';

const mockParseResult = {
  total: 1, valid: 1, alreadyEnrolled: 0, invalid: 0, errors: [], alreadyEnrolledDetails: [],
};
const mockImportResult = { imported: 1, skipped: 0, skippedDetails: [] };

describe('StudentController', () => {
  let controller: StudentController;
  let service: { parseImport: jest.Mock; importStudents: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentController],
      providers: [
        {
          provide: StudentService,
          useValue: {
            parseImport: jest.fn().mockResolvedValue(mockParseResult),
            importStudents: jest.fn().mockResolvedValue(mockImportResult),
          },
        },
      ],
    }).compile();

    controller = module.get<StudentController>(StudentController);
    service = module.get(StudentService);
  });

  afterEach(() => jest.clearAllMocks());

  const mockFile = {
    originalname: 'students.xlsx',
    buffer: Buffer.from(''),
  } as Express.Multer.File;

  it('calls parseImport when action=parse', async () => {
    const result = await controller.importStudents(mockFile, 'parse');

    expect(service.parseImport).toHaveBeenCalledWith(mockFile.buffer);
    expect(result).toEqual(mockParseResult);
  });

  it('calls importStudents when action=import', async () => {
    const result = await controller.importStudents(mockFile, 'import');

    expect(service.importStudents).toHaveBeenCalledWith(mockFile.buffer);
    expect(result).toEqual(mockImportResult);
  });

  it('throws BadRequestException when file is missing', async () => {
    await expect(
      controller.importStudents(undefined as any, 'parse'),
    ).rejects.toThrow(new BadRequestException('Please select a file before parsing.'));
  });

  it('throws BadRequestException for unsupported file extension', async () => {
    const csvFile = { ...mockFile, originalname: 'students.csv' } as Express.Multer.File;

    await expect(
      controller.importStudents(csvFile, 'parse'),
    ).rejects.toThrow(new BadRequestException('Only .xlsx and .xls files are accepted'));
  });

  it('throws BadRequestException for unknown action', async () => {
    await expect(
      controller.importStudents(mockFile, 'unknown' as any),
    ).rejects.toThrow(new BadRequestException('action must be "parse" or "import"'));
  });
});
```

- [ ] **Step 2: Run controller tests to verify they fail**

```bash
cd backend && pnpm run test --testPathPattern=student.controller.spec
```

Expected: FAIL — `StudentController` not found.

- [ ] **Step 3: Implement the controller**

```typescript
// backend/src/student/student.controller.ts
import {
  Controller,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { StudentService } from './student.service';

@Controller('students')
@Roles(Role.ADMIN)
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Post('import')
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async importStudents(
    @UploadedFile() file: Express.Multer.File,
    @Query('action') action: 'parse' | 'import',
  ) {
    if (!file) {
      throw new BadRequestException('Please select a file before parsing.');
    }

    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      throw new BadRequestException('Only .xlsx and .xls files are accepted');
    }

    if (action === 'parse') {
      return this.studentService.parseImport(file.buffer);
    }
    if (action === 'import') {
      return this.studentService.importStudents(file.buffer);
    }
    throw new BadRequestException('action must be "parse" or "import"');
  }
}
```

- [ ] **Step 4: Create the module**

```typescript
// backend/src/student/student.module.ts
import { Module } from '@nestjs/common';
import { StudentService } from './student.service';
import { StudentController } from './student.controller';

@Module({
  controllers: [StudentController],
  providers: [StudentService],
})
export class StudentModule {}
```

- [ ] **Step 5: Register StudentModule in AppModule**

In `backend/src/app.module.ts`, add the import:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { SemesterModule } from './semester/semester.module';
import { StudentModule } from './student/student.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    SemesterModule,
    StudentModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
```

- [ ] **Step 6: Run all tests to verify everything passes**

```bash
cd backend && pnpm run test --testPathPattern=student
```

Expected: ALL student tests PASS.

- [ ] **Step 7: Run the full test suite to check for regressions**

```bash
cd backend && pnpm run test
```

Expected: ALL tests PASS. No regressions.

- [ ] **Step 8: Commit**

```bash
cd backend
git add src/student/student.controller.ts src/student/student.controller.spec.ts src/student/student.module.ts src/app.module.ts
git commit -m "Add StudentController, StudentModule, register in AppModule"
```

---

### Task 6: Smoke test the running API

**Files:** None

- [ ] **Step 1: Start the backend**

```bash
cd backend && pnpm run start:dev
```

Expected: server starts on port 3000, no errors in console.

- [ ] **Step 2: Verify the endpoint rejects unauthenticated requests**

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/students/import?action=parse
```

Expected: `401`

- [ ] **Step 3: Verify the endpoint rejects wrong role (get a STUDENT token from /auth/login and test)**

Use Postman or curl to login as a student and send the request with the student JWT. Expected: `403`.

- [ ] **Step 4: Verify parse returns 400 when no active semester**

Login as admin, get JWT, then:

```bash
curl -s -X POST http://localhost:3000/students/import?action=parse \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -F "file=@path/to/students.xlsx"
```

Expected (if no active semester in DB):
```json
{ "statusCode": 400, "message": "No active semester found", "error": "Bad Request" }
```

- [ ] **Step 5: Full happy path — parse then import**

With an active semester in DB and a valid Excel file:

1. `POST /students/import?action=parse` → verify response has `total`, `valid`, `alreadyEnrolled`, `invalid`, `errors`, `alreadyEnrolledDetails`
2. `POST /students/import?action=import` → verify response has `imported`, `skipped`, `skippedDetails`
3. Re-run import with same file → verify all rows appear in `skippedDetails` with "Already enrolled in active semester"
