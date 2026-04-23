# Enrollment Module Split — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tách `SemesterStudent` (và toàn bộ logic import + list per-semester) ra khỏi `StudentModule` thành `EnrollmentModule` độc lập; rename Prisma model/table/column/enum cho nhất quán code ↔ DB.

**Architecture:** Full rename ở 3 layer Prisma (model `Enrollment`, table `enrollments`, column `enrollment_id`). `EnrollmentModule` mới có service/controller riêng, inject `PrismaService` trực tiếp, không phụ thuộc `StudentModule`. Import nhận optional `semesterId` param (default active, reject CLOSED).

**Tech Stack:** NestJS 11, Prisma 6 (MySQL), class-validator, xlsx, Jest 30.

**Spec:** [docs/superpowers/specs/2026-04-22-enrollment-module-split-design.md](../specs/2026-04-22-enrollment-module-split-design.md)

---

## File Structure

### Files to create

- `backend/src/enrollment/enrollment.module.ts` — NestJS module declaration
- `backend/src/enrollment/enrollment.controller.ts` — `/enrollments` routes
- `backend/src/enrollment/enrollment.service.ts` — list + import business logic
- `backend/src/enrollment/enrollment.service.spec.ts` — unit tests
- `backend/src/enrollment/dto/query-enrollment.dto.ts` — list query DTO
- `backend/src/enrollment/dto/import-enrollment.dto.ts` — import result types
- `backend/prisma/migrations/<timestamp>_rename_semester_student_to_enrollment/migration.sql` — schema rename

### Files to modify

- `backend/prisma/schema.prisma` — rename model, enum, field, table, column
- `backend/src/student/student.service.ts` — remove import methods, remove `semesterId` filter, update relation names
- `backend/src/student/student.service.spec.ts` — remove import tests, update prisma mock
- `backend/src/student/student.controller.ts` — remove `importStudents` endpoint
- `backend/src/student/dto/query-student.dto.ts` — remove `semesterId` field
- `backend/src/app.module.ts` — register `EnrollmentModule`

### Files to delete

- `backend/src/student/dto/import-student.dto.ts` (content moves to `enrollment/dto/import-enrollment.dto.ts`)

---

## Task 1: Rename Prisma schema + generate migration

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/<timestamp>_rename_semester_student_to_enrollment/migration.sql`

- [ ] **Step 1: Edit `schema.prisma`** — apply all rename diffs

Replace the enum block:
```prisma
enum EnrollmentStatus {
  AVAILABLE
  ASSIGNED
  COMPLETED
  FAILED
}
```
(Delete old `enum SemesterStudentStatus`.)

Replace the model block:
```prisma
model Enrollment {
  id         Int              @id @default(autoincrement())
  studentId  Int              @map("student_id")
  semesterId Int              @map("semester_id")
  status     EnrollmentStatus @default(AVAILABLE)

  student  Student  @relation(fields: [studentId], references: [id])
  semester Semester @relation(fields: [semesterId], references: [id])

  thesis Thesis?

  @@unique([studentId, semesterId])
  @@map("enrollments")
}
```
(Delete old `model SemesterStudent`.)

Update `Student` model — change relation:
```prisma
enrollments Enrollment[]
```
(Was `semesterStudents SemesterStudent[]`.)

Update `Semester` model — change relation:
```prisma
enrollments Enrollment[]
```
(Was `semesterStudents SemesterStudent[]`.)

Update `Thesis` model — change field + relation:
```prisma
enrollmentId Int @unique @map("enrollment_id")
...
enrollment Enrollment @relation(fields: [enrollmentId], references: [id])
```
(Was `semesterStudentId Int @unique @map("semester_student_id")` and `semesterStudent SemesterStudent @relation(...)`.)

- [ ] **Step 2: Generate migration (create-only to inspect first)**

Run from `backend/`:
```bash
npx prisma migrate dev --create-only --name rename_semester_student_to_enrollment
```

Expected: Prisma creates a folder `prisma/migrations/<timestamp>_rename_semester_student_to_enrollment/` with `migration.sql` inside. Does NOT apply yet.

- [ ] **Step 3: Inspect generated SQL**

Open the new `migration.sql`. If it contains `DROP TABLE` + `CREATE TABLE` (which loses data), replace its entire content with the hand-written rename SQL:

```sql
-- Drop FK from theses pointing at semester_students
ALTER TABLE `theses` DROP FOREIGN KEY `theses_semester_student_id_fkey`;

-- Rename column on theses
ALTER TABLE `theses` RENAME COLUMN `semester_student_id` TO `enrollment_id`;

-- Rename table
ALTER TABLE `semester_students` RENAME TO `enrollments`;

-- Re-add FK with new name
ALTER TABLE `theses`
  ADD CONSTRAINT `theses_enrollment_id_fkey`
  FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Rename indexes
ALTER TABLE `enrollments`
  RENAME INDEX `semester_students_student_id_semester_id_key`
  TO `enrollments_student_id_semester_id_key`;
ALTER TABLE `theses`
  RENAME INDEX `theses_semester_student_id_key`
  TO `theses_enrollment_id_key`;
```

If the SQL Prisma generated already uses `RENAME TABLE` + `RENAME COLUMN`, leave it as-is.

- [ ] **Step 4: Apply migration**

Run:
```bash
npx prisma migrate dev
```

Expected: Migration applied successfully. `npx prisma generate` runs automatically, regenerating client with `prisma.enrollment` accessor.

- [ ] **Step 5: Verify DB state**

Run:
```bash
npx prisma db pull --print
```

Expected: Output shows model `Enrollment` mapped to table `enrollments`, model `Thesis` has `enrollmentId` field mapped to column `enrollment_id`.

- [ ] **Step 6: Do NOT commit yet** — TypeScript compilation will fail in student.service.ts (fixed in Task 2). Commit at end of Task 2 to keep the branch buildable.

---

## Task 2: Fix StudentService + spec references post-rename

After Task 1, `backend/src/student/student.service.ts` and `student.service.spec.ts` will have TypeScript errors because `prisma.semesterStudent` no longer exists.

**Files:**
- Modify: `backend/src/student/student.service.ts`
- Modify: `backend/src/student/student.service.spec.ts`

- [ ] **Step 1: Update `student.service.ts` prisma accessor names**

Replace all occurrences of `this.prisma.semesterStudent` with `this.prisma.enrollment` (4 current call sites: in `parseImport`, `importStudents`, `findAll`, `remove`).

Specifically:
- Line ~116 (`parseImport`): `this.prisma.semesterStudent.findUnique(...)` → `this.prisma.enrollment.findUnique(...)`
- Line ~182 (`importStudents`): `this.prisma.semesterStudent.findUnique(...)` → `this.prisma.enrollment.findUnique(...)`
- Line ~200 (`importStudents`): `this.prisma.semesterStudent.create(...)` → `this.prisma.enrollment.create(...)`
- Line ~241 (`findAll`): `this.prisma.semesterStudent.findMany(...)` → `this.prisma.enrollment.findMany(...)`
- Line ~289 (`remove`): `this.prisma.semesterStudent.deleteMany(...)` → `this.prisma.enrollment.deleteMany(...)`

- [ ] **Step 2: Update relation name in `findAll`**

Line ~226 `where.semesterStudents = { some: { semesterId } }` → `where.enrollments = { some: { semesterId } }`.

- [ ] **Step 3: Update relation name in `remove` thesis check**

Line ~279 `where: { semesterStudent: { studentId: id } }` → `where: { enrollment: { studentId: id } }`.

- [ ] **Step 4: Update `student.service.spec.ts` prisma mock shape**

Lines ~46-51 replace:
```typescript
semesterStudent: {
  findUnique: jest.Mock;
  create: jest.Mock;
  findMany: jest.Mock;
  deleteMany: jest.Mock;
};
```
with:
```typescript
enrollment: {
  findUnique: jest.Mock;
  create: jest.Mock;
  findMany: jest.Mock;
  deleteMany: jest.Mock;
};
```

Lines ~73-78 replace `semesterStudent: { ... }` in `useValue` with the same shape renamed to `enrollment`.

- [ ] **Step 5: Update spec test bodies referencing old mock**

Grep inside `student.service.spec.ts` for `prisma.semesterStudent` and rename each to `prisma.enrollment`.

- [ ] **Step 6: Verify backend compiles**

Run from `backend/`:
```bash
pnpm run build
```

Expected: No TypeScript errors.

- [ ] **Step 7: Run tests**

Run:
```bash
pnpm run test
```

Expected: All existing StudentService tests still pass.

- [ ] **Step 8: Commit**

```bash
git add backend/prisma/schema.prisma \
  backend/prisma/migrations/ \
  backend/src/student/student.service.ts \
  backend/src/student/student.service.spec.ts
git commit -m "Rename SemesterStudent to Enrollment in schema and student module

- Rename Prisma model SemesterStudent -> Enrollment
- Rename table semester_students -> enrollments, column
  semester_student_id -> enrollment_id in theses
- Rename enum SemesterStudentStatus -> EnrollmentStatus
- Update StudentService prisma calls and relation names
- Update StudentService spec mock"
```

---

## Task 3: Create EnrollmentModule skeleton

**Files:**
- Create: `backend/src/enrollment/enrollment.module.ts`
- Create: `backend/src/enrollment/enrollment.controller.ts`
- Create: `backend/src/enrollment/enrollment.service.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Create `enrollment.service.ts` stub**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EnrollmentService {
  constructor(private prisma: PrismaService) {}
}
```

- [ ] **Step 2: Create `enrollment.controller.ts` stub**

```typescript
import { Controller } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { EnrollmentService } from './enrollment.service';

@Controller('enrollments')
@Roles(Role.ADMIN)
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}
}
```

- [ ] **Step 3: Create `enrollment.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { EnrollmentController } from './enrollment.controller';

@Module({
  controllers: [EnrollmentController],
  providers: [EnrollmentService],
})
export class EnrollmentModule {}
```

- [ ] **Step 4: Register in `app.module.ts`**

Add import and include in `imports` array:
```typescript
import { EnrollmentModule } from './enrollment/enrollment.module';
// ...
imports: [
  ConfigModule.forRoot({ isGlobal: true }),
  PrismaModule,
  AuthModule,
  SemesterModule,
  StudentModule,
  EnrollmentModule,
],
```

- [ ] **Step 5: Verify boot**

Run from `backend/`:
```bash
pnpm run build
```

Expected: No errors.

```bash
pnpm run start:dev
```

Expected: Server starts, logs `Nest application successfully started`. Kill with Ctrl+C.

- [ ] **Step 6: Commit**

```bash
git add backend/src/enrollment/ backend/src/app.module.ts
git commit -m "Scaffold EnrollmentModule with empty service and controller"
```

---

## Task 4: Create Enrollment DTOs

**Files:**
- Create: `backend/src/enrollment/dto/query-enrollment.dto.ts`
- Create: `backend/src/enrollment/dto/import-enrollment.dto.ts`

- [ ] **Step 1: Create `query-enrollment.dto.ts`**

```typescript
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from 'class-validator';
import { EnrollmentStatus } from '@prisma/client';

export class QueryEnrollmentDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  semesterId?: number;

  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
```

- [ ] **Step 2: Create `import-enrollment.dto.ts`**

```typescript
export interface SemesterSummary {
  id: number;
  code: string;
  name: string;
}

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
  semester: SemesterSummary;
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

export interface ImportEnrollmentsResult {
  semester: SemesterSummary;
  imported: number;
  skipped: number;
  skippedDetails: SkippedDetail[];
}
```

- [ ] **Step 3: Verify compile**

Run:
```bash
pnpm run build
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/enrollment/dto/
git commit -m "Add Enrollment DTOs for query and import"
```

---

## Task 5: Implement `resolveTargetSemester` helper (TDD)

**Files:**
- Modify: `backend/src/enrollment/enrollment.service.ts`
- Create: `backend/src/enrollment/enrollment.service.spec.ts`

- [ ] **Step 1: Create spec file with failing tests**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { SemesterStatus } from '@prisma/client';
import { EnrollmentService } from './enrollment.service';
import { PrismaService } from '../prisma/prisma.service';

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

const mockClosedSemester = { ...mockActiveSemester, id: 2, status: SemesterStatus.CLOSED };
const mockInactiveSemester = { ...mockActiveSemester, id: 3, status: SemesterStatus.INACTIVE };

describe('EnrollmentService', () => {
  let service: EnrollmentService;
  let prisma: {
    semester: { findFirst: jest.Mock; findUnique: jest.Mock };
    student: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
    enrollment: {
      findUnique: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentService,
        {
          provide: PrismaService,
          useValue: {
            semester: { findFirst: jest.fn(), findUnique: jest.fn() },
            student: { findUnique: jest.fn(), upsert: jest.fn() },
            enrollment: {
              findUnique: jest.fn(),
              create: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<EnrollmentService>(EnrollmentService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('resolveTargetSemester (internal, tested via parseImport integration later)', () => {
    // Placeholder — we will exercise the helper through findAll and parseImport tests.
    it('placeholder', () => {
      expect(service).toBeDefined();
    });
  });
});
```

- [ ] **Step 2: Run spec to verify it passes (sanity check)**

Run from `backend/`:
```bash
pnpm run test -- enrollment.service.spec
```

Expected: 1 test passes (placeholder). No compile errors.

- [ ] **Step 3: Implement helper in `enrollment.service.ts`**

```typescript
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Semester, SemesterStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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
}
```

- [ ] **Step 4: Verify compile and test still passes**

Run:
```bash
pnpm run build && pnpm run test -- enrollment.service.spec
```

Expected: Build passes, placeholder test passes.

- [ ] **Step 5: Commit**

```bash
git add backend/src/enrollment/enrollment.service.ts \
  backend/src/enrollment/enrollment.service.spec.ts
git commit -m "Add resolveTargetSemester helper on EnrollmentService"
```

---

## Task 6: Implement EnrollmentService.findAll (TDD)

**Files:**
- Modify: `backend/src/enrollment/enrollment.service.ts`
- Modify: `backend/src/enrollment/enrollment.service.spec.ts`

- [ ] **Step 1: Add failing findAll tests**

Add to `enrollment.service.spec.ts` (replace the placeholder describe block):

```typescript
describe('findAll', () => {
  it('returns enrollments for active semester when semesterId omitted', async () => {
    prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
    prisma.enrollment.findMany.mockResolvedValue([
      {
        id: 10,
        status: 'ASSIGNED',
        student: {
          id: 1, studentId: 'ITITIU20001', fullName: 'Nguyen Van A',
          email: 'a@student.hcmiu.edu.vn', userId: 42,
        },
      },
    ]);
    prisma.enrollment.count.mockResolvedValue(1);

    const result = await service.findAll({});

    expect(prisma.semester.findFirst).toHaveBeenCalledWith({
      where: { status: 'ACTIVE' },
    });
    expect(result.semester).toEqual({
      id: 1, code: 'HK1-2025', name: 'HK1',
    });
    expect(result.data).toEqual([
      {
        enrollmentId: 10,
        status: 'ASSIGNED',
        student: {
          id: 1, studentId: 'ITITIU20001', fullName: 'Nguyen Van A',
          email: 'a@student.hcmiu.edu.vn', hasAccount: true,
        },
      },
    ]);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('uses explicit semesterId when provided', async () => {
    prisma.semester.findUnique.mockResolvedValue(mockClosedSemester);
    prisma.enrollment.findMany.mockResolvedValue([]);
    prisma.enrollment.count.mockResolvedValue(0);

    await service.findAll({ semesterId: 2 });

    expect(prisma.semester.findUnique).toHaveBeenCalledWith({ where: { id: 2 } });
    expect(prisma.semester.findFirst).not.toHaveBeenCalled();
  });

  it('allows reading from CLOSED semester (unlike import)', async () => {
    prisma.semester.findUnique.mockResolvedValue(mockClosedSemester);
    prisma.enrollment.findMany.mockResolvedValue([]);
    prisma.enrollment.count.mockResolvedValue(0);

    await expect(service.findAll({ semesterId: 2 })).resolves.toBeDefined();
  });

  it('throws 400 when no active and no semesterId', async () => {
    prisma.semester.findFirst.mockResolvedValue(null);

    await expect(service.findAll({})).rejects.toThrow(
      new BadRequestException('No active semester — please specify semesterId'),
    );
  });

  it('throws 404 when semesterId not found', async () => {
    prisma.semester.findUnique.mockResolvedValue(null);

    await expect(service.findAll({ semesterId: 999 })).rejects.toThrow(
      new NotFoundException('Semester #999 not found'),
    );
  });

  it('applies status filter', async () => {
    prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
    prisma.enrollment.findMany.mockResolvedValue([]);
    prisma.enrollment.count.mockResolvedValue(0);

    await service.findAll({ status: 'ASSIGNED' });

    expect(prisma.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          semesterId: 1,
          status: 'ASSIGNED',
        }),
      }),
    );
  });

  it('applies search filter on student fields', async () => {
    prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
    prisma.enrollment.findMany.mockResolvedValue([]);
    prisma.enrollment.count.mockResolvedValue(0);

    await service.findAll({ search: 'Nguyen' });

    expect(prisma.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          semesterId: 1,
          student: {
            OR: [
              { fullName: { contains: 'Nguyen' } },
              { studentId: { contains: 'Nguyen' } },
              { email: { contains: 'Nguyen' } },
            ],
          },
        }),
      }),
    );
  });

  it('returns hasAccount=false when student.userId is null', async () => {
    prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
    prisma.enrollment.findMany.mockResolvedValue([
      {
        id: 10, status: 'AVAILABLE',
        student: { id: 1, studentId: 'X', fullName: 'X', email: 'x@x', userId: null },
      },
    ]);
    prisma.enrollment.count.mockResolvedValue(1);

    const result = await service.findAll({});

    expect(result.data[0].student.hasAccount).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
pnpm run test -- enrollment.service.spec
```

Expected: Tests fail with "findAll is not a function" or similar.

- [ ] **Step 3: Implement `findAll` method**

Add to `enrollment.service.ts` (inside the class):

```typescript
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
```

Add necessary imports at top of file:
```typescript
import { Prisma } from '@prisma/client';
import { QueryEnrollmentDto } from './dto/query-enrollment.dto';
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
pnpm run test -- enrollment.service.spec
```

Expected: All `findAll` tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/enrollment/enrollment.service.ts \
  backend/src/enrollment/enrollment.service.spec.ts
git commit -m "Implement EnrollmentService.findAll with semester + status + search filters"
```

---

## Task 7: Implement EnrollmentService.parseImport (TDD)

**Files:**
- Modify: `backend/src/enrollment/enrollment.service.ts`
- Modify: `backend/src/enrollment/enrollment.service.spec.ts`

- [ ] **Step 1: Add test helper for building Excel buffer**

At top of `enrollment.service.spec.ts`, add:

```typescript
import * as XLSX from 'xlsx';

function buildExcelBuffer(dataRows: string[][]): Buffer {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Last Name', 'First Name', 'Username', 'StudentID'],
    ...dataRows,
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}
```

- [ ] **Step 2: Add failing parseImport tests**

Add this describe block after `findAll`:

```typescript
describe('parseImport', () => {
  it('throws 400 when no active and no semesterId', async () => {
    prisma.semester.findFirst.mockResolvedValue(null);
    const buffer = buildExcelBuffer([['A', 'B', 'u1', 'S1']]);

    await expect(service.parseImport(buffer, undefined)).rejects.toThrow(
      new BadRequestException('No active semester — please specify semesterId'),
    );
  });

  it('throws 400 when target semester is CLOSED', async () => {
    prisma.semester.findUnique.mockResolvedValue(mockClosedSemester);
    const buffer = buildExcelBuffer([['A', 'B', 'u1', 'S1']]);

    await expect(service.parseImport(buffer, 2)).rejects.toThrow(
      new BadRequestException('Cannot import into a closed semester'),
    );
  });

  it('throws 404 when semester not found', async () => {
    prisma.semester.findUnique.mockResolvedValue(null);
    const buffer = buildExcelBuffer([['A', 'B', 'u1', 'S1']]);

    await expect(service.parseImport(buffer, 999)).rejects.toThrow(
      new NotFoundException('Semester #999 not found'),
    );
  });

  it('throws 400 when file has no data rows', async () => {
    prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
    const buffer = buildExcelBuffer([]);

    await expect(service.parseImport(buffer, undefined)).rejects.toThrow(
      new BadRequestException('File has no data rows'),
    );
  });

  it('returns all valid for clean new rows', async () => {
    prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
    prisma.student.findUnique.mockResolvedValue(null);
    const buffer = buildExcelBuffer([
      ['VO', 'KIET', 'ititwe22055', 'ITITWE22055'],
      ['NGUYEN', 'AN', 'itit22001', 'ITIT22001'],
    ]);

    const result = await service.parseImport(buffer, undefined);

    expect(result.total).toBe(2);
    expect(result.valid).toBe(2);
    expect(result.invalid).toBe(0);
    expect(result.alreadyEnrolled).toBe(0);
    expect(result.semester).toEqual({ id: 1, code: 'HK1-2025', name: 'HK1' });
  });

  it('reports error for row missing last name', async () => {
    prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
    const buffer = buildExcelBuffer([['', 'KIET', 'u', 'S1']]);
    const result = await service.parseImport(buffer, undefined);
    expect(result.invalid).toBe(1);
    expect(result.errors[0]).toEqual({ row: 2, reason: 'Missing last name' });
  });

  it('reports error for row missing first name', async () => {
    prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
    const buffer = buildExcelBuffer([['VO', '', 'u', 'S1']]);
    const result = await service.parseImport(buffer, undefined);
    expect(result.errors[0]).toEqual({ row: 2, reason: 'Missing first name' });
  });

  it('reports error for row missing username', async () => {
    prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
    const buffer = buildExcelBuffer([['VO', 'KIET', '', 'S1']]);
    const result = await service.parseImport(buffer, undefined);
    expect(result.errors[0]).toEqual({ row: 2, reason: 'Missing username' });
  });

  it('reports error for row missing studentId', async () => {
    prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
    const buffer = buildExcelBuffer([['VO', 'KIET', 'u', '']]);
    const result = await service.parseImport(buffer, undefined);
    expect(result.errors[0]).toEqual({ row: 2, reason: 'Missing studentId' });
  });

  it('detects duplicate studentId within file', async () => {
    prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
    prisma.student.findUnique.mockResolvedValue(null);
    const buffer = buildExcelBuffer([
      ['VO', 'KIET', 'u1', 'SAME'],
      ['NGUYEN', 'AN', 'u2', 'SAME'],
    ]);

    const result = await service.parseImport(buffer, undefined);

    expect(result.valid).toBe(1);
    expect(result.invalid).toBe(1);
    expect(result.errors[0]).toEqual({
      row: 3, reason: 'Duplicate studentId within file',
    });
  });

  it('detects already-enrolled students in target semester', async () => {
    prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
    prisma.student.findUnique.mockResolvedValue({
      id: 5, studentId: 'ITITIU20001',
      fullName: 'A', email: 'a@x', userId: null,
    });
    prisma.enrollment.findUnique.mockResolvedValue({
      id: 20, studentId: 5, semesterId: 1, status: 'AVAILABLE',
    });

    const buffer = buildExcelBuffer([['VO', 'KIET', 'u1', 'ITITIU20001']]);
    const result = await service.parseImport(buffer, undefined);

    expect(result.alreadyEnrolled).toBe(1);
    expect(result.alreadyEnrolledDetails[0]).toEqual({
      row: 2, studentId: 'ITITIU20001',
      reason: 'Already enrolled in target semester',
    });
  });

  it('accepts INACTIVE target semester', async () => {
    prisma.semester.findUnique.mockResolvedValue(mockInactiveSemester);
    prisma.student.findUnique.mockResolvedValue(null);
    const buffer = buildExcelBuffer([['VO', 'KIET', 'u1', 'S1']]);

    const result = await service.parseImport(buffer, 3);

    expect(result.valid).toBe(1);
    expect(result.semester.id).toBe(3);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:
```bash
pnpm run test -- enrollment.service.spec
```

Expected: parseImport tests fail with "parseImport is not a function".

- [ ] **Step 4: Implement `parseImport`**

Add imports and body to `enrollment.service.ts`:

```typescript
import * as XLSX from 'xlsx';
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
```

Add private helpers and `parseImport` method inside the class:

```typescript
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run:
```bash
pnpm run test -- enrollment.service.spec
```

Expected: All parseImport tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/src/enrollment/enrollment.service.ts \
  backend/src/enrollment/enrollment.service.spec.ts
git commit -m "Implement EnrollmentService.parseImport with semester-aware validation"
```

---

## Task 8: Implement EnrollmentService.importEnrollments (TDD)

**Files:**
- Modify: `backend/src/enrollment/enrollment.service.ts`
- Modify: `backend/src/enrollment/enrollment.service.spec.ts`

- [ ] **Step 1: Add failing tests**

Append to `enrollment.service.spec.ts`:

```typescript
describe('importEnrollments', () => {
  it('throws 400 when target is CLOSED', async () => {
    prisma.semester.findUnique.mockResolvedValue(mockClosedSemester);
    const buffer = buildExcelBuffer([['A', 'B', 'u', 'S1']]);

    await expect(
      service.importEnrollments(buffer, 2),
    ).rejects.toThrow(new BadRequestException('Cannot import into a closed semester'));
  });

  it('creates student and enrollment for new row', async () => {
    prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
    prisma.student.upsert.mockResolvedValue({
      id: 100, studentId: 'ITITIU20002',
      fullName: 'VO KIET', email: 'u1@student.hcmiu.edu.vn', userId: null,
    });
    prisma.enrollment.findUnique.mockResolvedValue(null);
    prisma.enrollment.create.mockResolvedValue({
      id: 500, studentId: 100, semesterId: 1, status: 'AVAILABLE',
    });
    const buffer = buildExcelBuffer([['VO', 'KIET', 'u1', 'ITITIU20002']]);

    const result = await service.importEnrollments(buffer, undefined);

    expect(prisma.student.upsert).toHaveBeenCalledWith({
      where: { studentId: 'ITITIU20002' },
      update: {},
      create: {
        studentId: 'ITITIU20002',
        fullName: 'VO KIET',
        email: 'u1@student.hcmiu.edu.vn',
      },
    });
    expect(prisma.enrollment.create).toHaveBeenCalledWith({
      data: { studentId: 100, semesterId: 1 },
    });
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.semester).toEqual({ id: 1, code: 'HK1-2025', name: 'HK1' });
  });

  it('skips existing student already enrolled in target semester', async () => {
    prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
    prisma.student.upsert.mockResolvedValue({
      id: 100, studentId: 'ITITIU20002',
      fullName: 'VO KIET', email: 'u1@student.hcmiu.edu.vn', userId: null,
    });
    prisma.enrollment.findUnique.mockResolvedValue({
      id: 500, studentId: 100, semesterId: 1, status: 'AVAILABLE',
    });
    const buffer = buildExcelBuffer([['VO', 'KIET', 'u1', 'ITITIU20002']]);

    const result = await service.importEnrollments(buffer, undefined);

    expect(prisma.enrollment.create).not.toHaveBeenCalled();
    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.skippedDetails[0]).toEqual({
      row: 2, studentId: 'ITITIU20002',
      reason: 'Already enrolled in target semester',
    });
  });

  it('skips row with validation error', async () => {
    prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
    const buffer = buildExcelBuffer([['', 'KIET', 'u1', 'S1']]);

    const result = await service.importEnrollments(buffer, undefined);

    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.skippedDetails[0]).toEqual({
      row: 2, studentId: null, reason: 'Missing last name',
    });
  });

  it('mixed: some imported, some skipped', async () => {
    prisma.semester.findFirst.mockResolvedValue(mockActiveSemester);
    prisma.student.upsert
      .mockResolvedValueOnce({
        id: 1, studentId: 'S1', fullName: 'A B', email: 'a@x', userId: null,
      })
      .mockResolvedValueOnce({
        id: 2, studentId: 'S2', fullName: 'C D', email: 'c@x', userId: null,
      });
    prisma.enrollment.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 99, studentId: 2, semesterId: 1, status: 'AVAILABLE' });
    prisma.enrollment.create.mockResolvedValue({
      id: 10, studentId: 1, semesterId: 1, status: 'AVAILABLE',
    });

    const buffer = buildExcelBuffer([
      ['A', 'B', 'u1', 'S1'],
      ['C', 'D', 'u2', 'S2'],
    ]);
    const result = await service.importEnrollments(buffer, undefined);

    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm run test -- enrollment.service.spec
```

Expected: importEnrollments tests fail.

- [ ] **Step 3: Implement `importEnrollments`**

Add imports in `enrollment.service.ts`:
```typescript
import {
  ImportEnrollmentsResult,
  SkippedDetail,
} from './dto/import-enrollment.dto';

const EMAIL_DOMAIN = 'student.hcmiu.edu.vn';
```

Add method to class:

```typescript
async importEnrollments(
  buffer: Buffer,
  semesterId: number | undefined,
): Promise<ImportEnrollmentsResult> {
  const target = await this.resolveTargetSemester(semesterId, {
    allowClosed: false,
  });

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

    const existing = await this.prisma.enrollment.findUnique({
      where: {
        studentId_semesterId: {
          studentId: student.id,
          semesterId: target.id,
        },
      },
    });

    if (existing) {
      skippedDetails.push({
        row: row.index,
        studentId: row.studentId,
        reason: 'Already enrolled in target semester',
      });
      continue;
    }

    await this.prisma.enrollment.create({
      data: { studentId: student.id, semesterId: target.id },
    });
    imported++;
  }

  return {
    semester: { id: target.id, code: target.code, name: target.name },
    imported,
    skipped: skippedDetails.length,
    skippedDetails,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm run test -- enrollment.service.spec
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/enrollment/enrollment.service.ts \
  backend/src/enrollment/enrollment.service.spec.ts
git commit -m "Implement EnrollmentService.importEnrollments with semester-aware logic"
```

---

## Task 9: Implement EnrollmentController

**Files:**
- Modify: `backend/src/enrollment/enrollment.controller.ts`

- [ ] **Step 1: Replace controller stub with full implementation**

```typescript
import {
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { EnrollmentService } from './enrollment.service';
import { QueryEnrollmentDto } from './dto/query-enrollment.dto';

@Controller('enrollments')
@Roles(Role.ADMIN)
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Get()
  findAll(@Query() query: QueryEnrollmentDto) {
    return this.enrollmentService.findAll(query);
  }

  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async importEnrollments(
    @UploadedFile() file: Express.Multer.File,
    @Query('action') action: 'parse' | 'import',
    @Query('semesterId', new ParseIntPipe({ optional: true }))
    semesterId?: number,
  ) {
    if (!file) {
      throw new BadRequestException('Please select a file before parsing.');
    }

    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      throw new BadRequestException('Only .xlsx and .xls files are accepted');
    }

    if (action === 'parse') {
      return this.enrollmentService.parseImport(file.buffer, semesterId);
    }
    if (action === 'import') {
      return this.enrollmentService.importEnrollments(file.buffer, semesterId);
    }
    throw new BadRequestException('action must be "parse" or "import"');
  }
}
```

- [ ] **Step 2: Verify compile**

```bash
pnpm run build
```

Expected: No errors.

- [ ] **Step 3: Manual smoke test with server**

Run:
```bash
pnpm run start:dev
```

With an admin JWT token, use Postman or curl to hit:
- `GET http://localhost:3000/enrollments` → expect 200 with active semester's enrollments (or 400 if no active semester exists in DB).
- `GET http://localhost:3000/enrollments?semesterId=999` → expect 404.

Kill server (Ctrl+C).

- [ ] **Step 4: Commit**

```bash
git add backend/src/enrollment/enrollment.controller.ts
git commit -m "Implement EnrollmentController with list and import endpoints"
```

---

## Task 10: Remove import logic from StudentModule

**Files:**
- Modify: `backend/src/student/student.service.ts`
- Modify: `backend/src/student/student.service.spec.ts`
- Modify: `backend/src/student/student.controller.ts`
- Delete: `backend/src/student/dto/import-student.dto.ts`

- [ ] **Step 1: Remove `parseImport` and `importStudents` methods from `student.service.ts`**

Delete the entire `parseImport` method body and the entire `importStudents` method body. Also remove:
- The `import` of `SemesterStatus` if no longer used
- The `import` of `ParseImportResult`, `ImportStudentsResult`, `ParseRowError`, `AlreadyEnrolledDetail`, `SkippedDetail` from `./dto/import-student.dto`
- The `RawRow` interface
- The `EMAIL_DOMAIN` constant
- The `extractRows` and `validateRow` private helpers
- The `import * as XLSX from 'xlsx'` line

Keep: `create`, `findAll`, `remove`, `update`, `handleStudentP2002`.

- [ ] **Step 2: Remove import endpoint from `student.controller.ts`**

Delete the `importStudents` handler method (the `@Post('import')` block). Also remove imports that are now unused:
- `FileInterceptor` from `@nestjs/platform-express`
- `multer`
- `UploadedFile`, `UseInterceptors` from `@nestjs/common`
- `Post`, `HttpCode`, `HttpStatus` if no longer needed (they ARE still used by `create`, so keep those)
- `BadRequestException` if no longer used

Verify: `create` still uses `@Post()`, `@HttpCode(HttpStatus.CREATED)`. Keep those imports.

- [ ] **Step 3: Delete `backend/src/student/dto/import-student.dto.ts`**

```bash
rm backend/src/student/dto/import-student.dto.ts
```

- [ ] **Step 4: Remove import tests from `student.service.spec.ts`**

Delete the entire `describe('parseImport', ...)` block and `describe('importStudents', ...)` block.

Also from the prisma mock (lines ~35-80):
- Remove `semester: { findFirst: jest.fn() }` from the mock (StudentService no longer queries semester)
- Remove `upsert: jest.fn()` from the `student` mock (no longer used; student.create is kept)
- Remove the `enrollment: { ... }` entries for `findUnique` and `create` (only `findMany` and `deleteMany` are used by `findAll` and `remove`)

Remaining prisma mock after cleanup:
```typescript
let prisma: {
  student: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    create: jest.Mock;
  };
  enrollment: {
    findMany: jest.Mock;
    deleteMany: jest.Mock;
  };
  thesis: { count: jest.Mock };
  $transaction: jest.Mock;
};
```

Update the `useValue` block similarly.

Remove the `buildExcelBuffer` function and `XLSX` import — no longer needed in student spec.

Remove `mockActiveSemester` if no remaining test uses it.

- [ ] **Step 5: Run tests**

```bash
pnpm run test
```

Expected: All remaining StudentService tests pass; no orphan references.

- [ ] **Step 6: Build**

```bash
pnpm run build
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add backend/src/student/
git commit -m "Remove import logic from StudentModule (moved to EnrollmentModule)"
```

---

## Task 11: Remove `semesterId` filter from StudentService.findAll

**Files:**
- Modify: `backend/src/student/student.service.ts`
- Modify: `backend/src/student/dto/query-student.dto.ts`
- Modify: `backend/src/student/student.service.spec.ts`

- [ ] **Step 1: Remove `semesterId` from `QueryStudentDto`**

In `query-student.dto.ts`, delete the field:
```typescript
@IsOptional()
@Type(() => Number)
@IsInt()
@Min(1)
semesterId?: number;
```

Also remove the unused `Type` import if it's not used elsewhere in the file (check: only `page` and `limit` still use it, so keep).

- [ ] **Step 2: Simplify `findAll` in `student.service.ts`**

Replace the `findAll` method with:

```typescript
async findAll(query: QueryStudentDto) {
  const { search, hasAccount, page = 1, limit = 20 } = query;
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

  const [students, total] = await Promise.all([
    this.prisma.student.findMany({
      where,
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
  }));

  return { data, total, page, limit };
}
```

This removes the `enrollmentMap` logic entirely. Also remove the now-unused `prisma.enrollment` call — but note `remove` still uses `prisma.enrollment.deleteMany`, so keep the `enrollment` key in the prisma mock.

Re-check imports: `Prisma` still imported; ok to keep. If `SemesterStatus` import was kept from Task 10, remove it now — no longer needed.

- [ ] **Step 3: Update spec — remove `findAll with semesterId` tests**

In `student.service.spec.ts`, inside `describe('findAll', ...)`, remove any test that references `semesterId` in its query arg or asserts on `semesterStudent`/`enrollment` status in response.

- [ ] **Step 4: Run tests**

```bash
pnpm run test
```

Expected: All pass.

- [ ] **Step 5: Build**

```bash
pnpm run build
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add backend/src/student/
git commit -m "Remove semesterId filter from Student list endpoint"
```

---

## Task 12: End-to-end smoke test

**Files:** None

- [ ] **Step 1: Start backend**

```bash
cd backend && pnpm run start:dev
```

- [ ] **Step 2: Use Postman or curl to verify all endpoints** (admin JWT required)

Run these scenarios against `http://localhost:3000`:

1. `GET /students` → 200, list without `semesterStudent` field
2. `GET /students?semesterId=1` → 200, param ignored (no error)
3. `POST /students` with `{ studentId, fullName, email }` → 201
4. `PATCH /students/:id` with `{ fullName: 'X' }` → 200
5. `DELETE /students/:id` (no thesis) → 204
6. `POST /students/import` → 404 Not Found (endpoint removed)
7. `GET /enrollments` (no param, assume active semester exists) → 200 with `semester` field
8. `GET /enrollments` (no active semester in DB) → 400
9. `GET /enrollments?semesterId=<active id>` → 200
10. `GET /enrollments?semesterId=999` → 404
11. `GET /enrollments?status=ASSIGNED` → 200, filtered
12. `GET /enrollments?search=Nguyen` → 200, filtered
13. `POST /enrollments/import?action=parse` with valid xlsx → 200, includes `semester` field
14. `POST /enrollments/import?action=import` → 200, records created
15. `POST /enrollments/import?action=parse&semesterId=<CLOSED id>` → 400
16. `POST /enrollments/import?action=parse&semesterId=<INACTIVE id>` → 200
17. `POST /enrollments/import?action=parse` without file → 400
18. `POST /enrollments/import?action=parse` with `.txt` file → 400

- [ ] **Step 3: Kill server, verify no regressions**

```bash
pnpm run test
pnpm run lint
```

Expected: All tests pass, lint clean.

- [ ] **Step 4: No commit (verification only)**

## Self-Review Notes

Completed against spec [docs/superpowers/specs/2026-04-22-enrollment-module-split-design.md](../specs/2026-04-22-enrollment-module-split-design.md):

- §4 Architecture — Tasks 3, 9, 11 split concerns; boundary enforced (no Student→Enrollment dependency)
- §5 API Contract — Task 9 matches endpoint list; Task 11 removes `semesterId` filter from `/students`
- §6 Schema — Task 1 covers full rename at 3 layers
- §7 Backend Logic — Task 5 `resolveTargetSemester`; Tasks 6, 7, 8 use it
- §9 Edge Cases — Tasks 6, 7, 8 tests cover all listed cases
- §10 Validation — Task 4 DTOs include class-validator decorators
- §11 Test Plan §11.1 — Tasks 6, 7, 8 cover unit tests
- §11 Test Plan §11.2 — Task 12 covers Postman E2E
- §12 Rollout Order — Tasks follow the sequence (schema → service → new module → cleanup)
