# Topic Assignment — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the backend API for assigning students to thesis topics — including the LecturerSemester capacity model, thesis CRUD (assign/unassign/list/detail), and idempotent topic-status recomputation.

**Architecture:** Two new NestJS modules — `lecturer-semester` for capacity configuration and `thesis` for assignment management. Assignment creates a `Thesis` record linking an `Enrollment` to a `Topic`. All mutations run inside `prisma.$transaction` for atomicity. An idempotent recompute function keeps topic statuses (OPEN/FULL) in sync with lecturer capacity.

**Tech Stack:** NestJS 11, Prisma 6 (MySQL), Jest 30, class-validator, class-transformer

## Global Constraints

- Follow existing module conventions: controller → service → DTOs with class-validator
- Mock `PrismaService` in unit tests — never hit real DB
- Use `@Type(() => Number)` for numeric query params (not `@Transform`)
- Declare static routes before parametric routes in controllers
- Use `Prisma.<Model>GetPayload<{ include: ... }>` for typed relation results
- Migration names: descriptive kebab-case
- Capacity is always checked against the **topic owner's lecturer**, not the current user

---

### Task 1: Schema — Add `LecturerSemester` Model and Migrate

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Created by migration: `backend/prisma/migrations/<timestamp>_add-lecturer-semester/migration.sql`

**Interfaces:**
- Consumes: nothing
- Produces: `LecturerSemester` model available via `prisma.lecturerSemester`; `Lecturer.lecturerSemesters` and `Semester.lecturerSemesters` back-relations

- [ ] **Step 1: Add the `LecturerSemester` model to `schema.prisma`**

Add after the `Lecturer` model:

```prisma
model LecturerSemester {
  id          Int @id @default(autoincrement())
  lecturerId  Int @map("lecturer_id")
  semesterId  Int @map("semester_id")
  maxStudents Int @default(5) @map("max_students")

  lecturer Lecturer @relation(fields: [lecturerId], references: [id])
  semester Semester @relation(fields: [semesterId], references: [id])

  @@unique([lecturerId, semesterId])
  @@map("lecturer_semesters")
}
```

- [ ] **Step 2: Add back-relation arrays on `Lecturer` and `Semester`**

In the `Lecturer` model, add:
```prisma
lecturerSemesters LecturerSemester[]
```

In the `Semester` model, add:
```prisma
lecturerSemesters LecturerSemester[]
```

- [ ] **Step 3: Run the migration**

```bash
cd backend
npx prisma migrate dev --name add-lecturer-semester
```

Expected: migration created and applied, Prisma client regenerated.

- [ ] **Step 4: Verify the generated client**

```bash
cd backend
npx prisma generate
```

Expected: no errors. `prisma.lecturerSemester` is now available in code.

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(schema): add LecturerSemester model for per-semester capacity"
```

---

### Task 2: LecturerSemester Module — Capacity Resolution Service

**Files:**
- Create: `backend/src/lecturer-semester/lecturer-semester.module.ts`
- Create: `backend/src/lecturer-semester/lecturer-semester.service.ts`
- Create: `backend/src/lecturer-semester/lecturer-semester.service.spec.ts`
- Create: `backend/src/lecturer-semester/dto/upsert-lecturer-semester.dto.ts`

**Interfaces:**
- Consumes: `PrismaService`
- Produces:
  - `LecturerSemesterService.resolveCapacity(lecturerId: number, semesterId: number): Promise<number>` — used by thesis service for capacity checks
  - `LecturerSemesterService.upsert(lecturerId: number, dto: UpsertLecturerSemesterDto): Promise<{ lecturerId: number; semesterId: number; maxStudents: number }>`
  - `LecturerSemesterService.findAll(semesterId?: number): Promise<LecturerSemesterResponse[]>`
  - `LecturerSemesterModule` exports `LecturerSemesterService`

- [ ] **Step 1: Create the DTO**

Create `backend/src/lecturer-semester/dto/upsert-lecturer-semester.dto.ts`:

```typescript
import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertLecturerSemesterDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  semesterId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxStudents: number;
}
```

- [ ] **Step 2: Write failing tests for `resolveCapacity`**

Create `backend/src/lecturer-semester/lecturer-semester.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { LecturerSemesterService } from './lecturer-semester.service';
import { PrismaService } from '../prisma/prisma.service';

describe('LecturerSemesterService', () => {
  let service: LecturerSemesterService;
  let prisma: {
    lecturerSemester: { findUnique: jest.Mock; findFirst: jest.Mock; upsert: jest.Mock; findMany: jest.Mock };
    lecturer: { findUnique: jest.Mock };
    semester: { findFirst: jest.Mock; findUnique: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      lecturerSemester: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
      lecturer: { findUnique: jest.fn() },
      semester: { findFirst: jest.fn(), findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LecturerSemesterService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<LecturerSemesterService>(LecturerSemesterService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('resolveCapacity', () => {
    it('returns maxStudents from LecturerSemester when record exists for the target semester', async () => {
      prisma.lecturerSemester.findUnique.mockResolvedValue({ maxStudents: 8 });

      const result = await service.resolveCapacity(1, 3);

      expect(result).toBe(8);
      expect(prisma.lecturerSemester.findUnique).toHaveBeenCalledWith({
        where: { lecturerId_semesterId: { lecturerId: 1, semesterId: 3 } },
      });
    });

    it('falls back to most recent prior semester when no record for target semester', async () => {
      prisma.lecturerSemester.findUnique.mockResolvedValue(null);
      prisma.semester.findUnique.mockResolvedValue({ startDate: new Date('2026-06-01') });
      prisma.lecturerSemester.findFirst.mockResolvedValue({ maxStudents: 6 });

      const result = await service.resolveCapacity(1, 3);

      expect(result).toBe(6);
      expect(prisma.lecturerSemester.findFirst).toHaveBeenCalledWith({
        where: { lecturerId: 1, semester: { startDate: { lt: expect.any(Date) } } },
        orderBy: { semester: { startDate: 'desc' } },
      });
    });

    it('falls back to Lecturer.maxStudents when no LecturerSemester records exist', async () => {
      prisma.lecturerSemester.findUnique.mockResolvedValue(null);
      prisma.semester.findUnique.mockResolvedValue({ startDate: new Date('2026-06-01') });
      prisma.lecturerSemester.findFirst.mockResolvedValue(null);
      prisma.lecturer.findUnique.mockResolvedValue({ maxStudents: 5 });

      const result = await service.resolveCapacity(1, 3);

      expect(result).toBe(5);
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd backend
npx jest --testPathPattern=lecturer-semester.service.spec --verbose
```

Expected: FAIL — module/service not found.

- [ ] **Step 4: Implement `LecturerSemesterService`**

Create `backend/src/lecturer-semester/lecturer-semester.service.ts`:

```typescript
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
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend
npx jest --testPathPattern=lecturer-semester.service.spec --verbose
```

Expected: all 3 tests PASS.

- [ ] **Step 6: Add tests for `upsert` and `findAll`**

Append to the spec file:

```typescript
describe('upsert', () => {
  it('creates or updates a LecturerSemester record', async () => {
    prisma.lecturer.findUnique.mockResolvedValue({ id: 1 });
    prisma.lecturerSemester.upsert.mockResolvedValue({
      lecturerId: 1, semesterId: 3, maxStudents: 8,
    });

    const result = await service.upsert(1, { semesterId: 3, maxStudents: 8 });

    expect(result).toEqual({ lecturerId: 1, semesterId: 3, maxStudents: 8 });
    expect(prisma.lecturerSemester.upsert).toHaveBeenCalledWith({
      where: { lecturerId_semesterId: { lecturerId: 1, semesterId: 3 } },
      update: { maxStudents: 8 },
      create: { lecturerId: 1, semesterId: 3, maxStudents: 8 },
    });
  });

  it('throws NotFoundException when lecturer does not exist', async () => {
    prisma.lecturer.findUnique.mockResolvedValue(null);

    await expect(service.upsert(999, { semesterId: 3, maxStudents: 5 }))
      .rejects.toThrow(NotFoundException);
  });
});

describe('findAll', () => {
  it('returns all records when no semesterId filter', async () => {
    prisma.lecturerSemester.findMany.mockResolvedValue([
      { lecturerId: 1, semesterId: 3, maxStudents: 8, lecturer: { id: 1, fullName: 'Dr. A', email: 'a@u.edu' } },
    ]);

    const result = await service.findAll();

    expect(result).toHaveLength(1);
    expect(prisma.lecturerSemester.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('filters by semesterId when provided', async () => {
    prisma.lecturerSemester.findMany.mockResolvedValue([]);

    await service.findAll(3);

    expect(prisma.lecturerSemester.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { semesterId: 3 } }),
    );
  });
});
```

- [ ] **Step 7: Run all tests**

```bash
cd backend
npx jest --testPathPattern=lecturer-semester.service.spec --verbose
```

Expected: all tests PASS.

- [ ] **Step 8: Create the module**

Create `backend/src/lecturer-semester/lecturer-semester.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { LecturerSemesterService } from './lecturer-semester.service';

@Module({
  providers: [LecturerSemesterService],
  exports: [LecturerSemesterService],
})
export class LecturerSemesterModule {}
```

Note: no controller yet — that comes in Task 3.

- [ ] **Step 9: Commit**

```bash
git add backend/src/lecturer-semester/
git commit -m "feat(lecturer-semester): add capacity resolution service with fallback chain"
```

---

### Task 3: LecturerSemester Controller + Register Module

**Files:**
- Create: `backend/src/lecturer-semester/lecturer-semester.controller.ts`
- Create: `backend/src/lecturer-semester/dto/query-lecturer-semester.dto.ts`
- Modify: `backend/src/lecturer-semester/lecturer-semester.module.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Consumes: `LecturerSemesterService.findAll`, `.upsert`, `.resolveCapacity`
- Produces:
  - `GET /lecturer-semesters` (ADMIN)
  - `PATCH /lecturer-semesters/:lecturerId` (ADMIN)
  - `GET /lecturer-semesters/capacity/:lecturerId` (ADMIN, LECTURER)

- [ ] **Step 1: Create the query DTO**

Create `backend/src/lecturer-semester/dto/query-lecturer-semester.dto.ts`:

```typescript
import { IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryLecturerSemesterDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  semesterId?: number;
}
```

- [ ] **Step 2: Create the controller**

Create `backend/src/lecturer-semester/lecturer-semester.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { LecturerSemesterService } from './lecturer-semester.service';
import { UpsertLecturerSemesterDto } from './dto/upsert-lecturer-semester.dto';
import { QueryLecturerSemesterDto } from './dto/query-lecturer-semester.dto';

@Controller('lecturer-semesters')
export class LecturerSemesterController {
  constructor(private readonly lecturerSemesterService: LecturerSemesterService) {}

  @Get()
  @Roles(Role.ADMIN)
  findAll(@Query() query: QueryLecturerSemesterDto) {
    return this.lecturerSemesterService.findAll(query.semesterId);
  }

  @Get('capacity/:lecturerId')
  @Roles(Role.ADMIN, Role.LECTURER)
  async getCapacity(
    @Param('lecturerId', ParseIntPipe) lecturerId: number,
    @Query() query: QueryLecturerSemesterDto,
  ) {
    const semesterId = query.semesterId;
    let effectiveSemesterId = semesterId;

    if (!effectiveSemesterId) {
      const { PrismaService } = await import('../prisma/prisma.service');
      // resolveCapacity needs a semesterId — resolve active semester
      // This is handled by injecting PrismaService in the controller, but
      // cleaner to add a resolveSemesterId helper. For now, delegate to service.
    }

    const capacity = await this.lecturerSemesterService.resolveCapacity(lecturerId, effectiveSemesterId!);
    return { lecturerId, semesterId: effectiveSemesterId, maxStudents: capacity };
  }

  @Patch(':lecturerId')
  @Roles(Role.ADMIN)
  upsert(
    @Param('lecturerId', ParseIntPipe) lecturerId: number,
    @Body() dto: UpsertLecturerSemesterDto,
  ) {
    return this.lecturerSemesterService.upsert(lecturerId, dto);
  }
}
```

Wait — the `getCapacity` method needs to resolve the active semester when `semesterId` is not provided. Add a `resolveActiveSemesterId` method to the service instead of doing it in the controller.

- [ ] **Step 3: Add `resolveActiveSemesterId` to the service**

Add to `backend/src/lecturer-semester/lecturer-semester.service.ts`:

```typescript
async resolveActiveSemesterId(): Promise<number> {
  const active = await this.prisma.semester.findFirst({
    where: { status: 'ACTIVE' },
  });
  if (!active) throw new BadRequestException('No active semester found');
  return active.id;
}
```

Add `BadRequestException` to the imports.

- [ ] **Step 4: Rewrite the controller `getCapacity` method cleanly**

```typescript
@Get('capacity/:lecturerId')
@Roles(Role.ADMIN, Role.LECTURER)
async getCapacity(
  @Param('lecturerId', ParseIntPipe) lecturerId: number,
  @Query() query: QueryLecturerSemesterDto,
) {
  const semesterId = query.semesterId ?? await this.lecturerSemesterService.resolveActiveSemesterId();
  const maxStudents = await this.lecturerSemesterService.resolveCapacity(lecturerId, semesterId);
  return { lecturerId, semesterId, maxStudents };
}
```

- [ ] **Step 5: Update the module to include the controller**

Update `backend/src/lecturer-semester/lecturer-semester.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { LecturerSemesterController } from './lecturer-semester.controller';
import { LecturerSemesterService } from './lecturer-semester.service';

@Module({
  controllers: [LecturerSemesterController],
  providers: [LecturerSemesterService],
  exports: [LecturerSemesterService],
})
export class LecturerSemesterModule {}
```

- [ ] **Step 6: Register in `AppModule`**

Add to `backend/src/app.module.ts` imports array:

```typescript
import { LecturerSemesterModule } from './lecturer-semester/lecturer-semester.module';

// In @Module.imports:
LecturerSemesterModule,
```

- [ ] **Step 7: Run all tests to check nothing is broken**

```bash
cd backend
pnpm run test
```

Expected: all tests PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/src/lecturer-semester/ backend/src/app.module.ts
git commit -m "feat(lecturer-semester): add controller with capacity, upsert, and list endpoints"
```

---

### Task 4: Thesis Module — Service with Assign, Unassign, List, Detail

**Files:**
- Create: `backend/src/thesis/thesis.module.ts`
- Create: `backend/src/thesis/thesis.service.ts`
- Create: `backend/src/thesis/thesis.service.spec.ts`
- Create: `backend/src/thesis/dto/create-thesis.dto.ts`
- Create: `backend/src/thesis/dto/query-thesis.dto.ts`

**Interfaces:**
- Consumes: `PrismaService`, `LecturerSemesterService.resolveCapacity`
- Produces:
  - `ThesisService.assign(dto: CreateThesisDto, currentUser: AuthUser): Promise<ThesisResponse>`
  - `ThesisService.unassign(id: number, currentUser: AuthUser): Promise<void>`
  - `ThesisService.findAll(query: QueryThesisDto, currentUser: AuthUser): Promise<ThesisResponse[]>`
  - `ThesisService.findOne(id: number, currentUser: AuthUser): Promise<ThesisResponse>`

The `AuthUser` type is: `{ role: Role; lecturer: { id: number } | null }`

- [ ] **Step 1: Create DTOs**

Create `backend/src/thesis/dto/create-thesis.dto.ts`:

```typescript
import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateThesisDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  enrollmentId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  topicId: number;
}
```

Create `backend/src/thesis/dto/query-thesis.dto.ts`:

```typescript
import { IsOptional, IsInt, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ThesisStatus } from '@prisma/client';

export class QueryThesisDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  semesterId?: number;

  @IsOptional()
  @IsEnum(ThesisStatus)
  status?: ThesisStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  lecturerId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  topicId?: number;
}
```

- [ ] **Step 2: Write failing tests for `assign`**

Create `backend/src/thesis/thesis.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role, EnrollmentStatus, TopicStatus, ThesisStatus } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ThesisService } from './thesis.service';
import { PrismaService } from '../prisma/prisma.service';
import { LecturerSemesterService } from '../lecturer-semester/lecturer-semester.service';

const mockStudent = { id: 1, studentId: '2021001', fullName: 'Nguyen Van A' };
const mockEnrollment = {
  id: 10,
  studentId: 1,
  semesterId: 3,
  status: EnrollmentStatus.AVAILABLE,
  student: mockStudent,
};
const mockLecturer = { id: 2, fullName: 'Dr. Tran', email: 'tran@u.edu', title: 'Dr.' };
const mockTopic = {
  id: 5,
  title: 'AI in Healthcare',
  description: 'desc',
  semesterId: 3,
  lecturerId: 2,
  status: TopicStatus.OPEN,
  lecturer: mockLecturer,
};

const lecturerUser = { role: Role.LECTURER, lecturer: { id: 2 } };
const adminUser = { role: Role.ADMIN, lecturer: null };

describe('ThesisService', () => {
  let service: ThesisService;
  let prisma: any;
  let lecturerSemesterService: { resolveCapacity: jest.Mock };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn((fn) => fn(prisma)),
      enrollment: { findUnique: jest.fn(), update: jest.fn() },
      topic: { findUnique: jest.fn(), updateMany: jest.fn() },
      thesis: {
        create: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      semester: { findFirst: jest.fn() },
    };

    lecturerSemesterService = { resolveCapacity: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThesisService,
        { provide: PrismaService, useValue: prisma },
        { provide: LecturerSemesterService, useValue: lecturerSemesterService },
      ],
    }).compile();

    service = module.get<ThesisService>(ThesisService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('assign', () => {
    const dto = { enrollmentId: 10, topicId: 5 };

    it('throws NotFoundException when enrollment does not exist', async () => {
      prisma.enrollment.findUnique.mockResolvedValue(null);

      await expect(service.assign(dto, lecturerUser)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when enrollment is not AVAILABLE', async () => {
      prisma.enrollment.findUnique.mockResolvedValue({
        ...mockEnrollment, status: EnrollmentStatus.ASSIGNED,
      });

      await expect(service.assign(dto, lecturerUser))
        .rejects.toThrow(new BadRequestException('Student is not available for assignment'));
    });

    it('throws NotFoundException when topic does not exist', async () => {
      prisma.enrollment.findUnique.mockResolvedValue(mockEnrollment);
      prisma.topic.findUnique.mockResolvedValue(null);

      await expect(service.assign(dto, lecturerUser)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when topic is not OPEN', async () => {
      prisma.enrollment.findUnique.mockResolvedValue(mockEnrollment);
      prisma.topic.findUnique.mockResolvedValue({ ...mockTopic, status: TopicStatus.FULL });

      await expect(service.assign(dto, lecturerUser))
        .rejects.toThrow(new BadRequestException('Topic is not open for assignment'));
    });

    it('throws BadRequestException when topic and enrollment are in different semesters', async () => {
      prisma.enrollment.findUnique.mockResolvedValue(mockEnrollment);
      prisma.topic.findUnique.mockResolvedValue({ ...mockTopic, semesterId: 99 });

      await expect(service.assign(dto, lecturerUser))
        .rejects.toThrow(new BadRequestException('Topic and enrollment must be in the same semester'));
    });

    it('throws ForbiddenException when lecturer does not own the topic', async () => {
      const otherLecturer = { role: Role.LECTURER, lecturer: { id: 999 } };
      prisma.enrollment.findUnique.mockResolvedValue(mockEnrollment);
      prisma.topic.findUnique.mockResolvedValue(mockTopic);

      await expect(service.assign(dto, otherLecturer)).rejects.toThrow(ForbiddenException);
    });

    it('allows admin to assign to any topic', async () => {
      prisma.enrollment.findUnique.mockResolvedValue(mockEnrollment);
      prisma.topic.findUnique.mockResolvedValue(mockTopic);
      lecturerSemesterService.resolveCapacity.mockResolvedValue(5);
      prisma.thesis.count.mockResolvedValue(0);
      prisma.thesis.create.mockResolvedValue({
        id: 1, title: 'AI in Healthcare', status: ThesisStatus.IN_PROGRESS,
        createdAt: new Date(), enrollmentId: 10, topicId: 5,
        enrollment: { ...mockEnrollment, student: mockStudent },
        topic: mockTopic,
      });

      await expect(service.assign(dto, adminUser)).resolves.toBeDefined();
    });

    it('throws BadRequestException when lecturer is at capacity', async () => {
      prisma.enrollment.findUnique.mockResolvedValue(mockEnrollment);
      prisma.topic.findUnique.mockResolvedValue(mockTopic);
      lecturerSemesterService.resolveCapacity.mockResolvedValue(3);
      prisma.thesis.count.mockResolvedValue(3);

      await expect(service.assign(dto, lecturerUser))
        .rejects.toThrow(new BadRequestException('Lecturer has reached maximum student capacity for this semester'));
    });

    it('creates thesis, updates enrollment, and recomputes topic statuses on success', async () => {
      prisma.enrollment.findUnique.mockResolvedValue(mockEnrollment);
      prisma.topic.findUnique.mockResolvedValue(mockTopic);
      lecturerSemesterService.resolveCapacity.mockResolvedValue(5);
      prisma.thesis.count
        .mockResolvedValueOnce(1)   // pre-assign capacity check
        .mockResolvedValueOnce(2);  // post-assign recompute
      prisma.thesis.create.mockResolvedValue({
        id: 1, title: 'AI in Healthcare', status: ThesisStatus.IN_PROGRESS,
        createdAt: new Date(), enrollmentId: 10, topicId: 5,
        enrollment: { ...mockEnrollment, student: mockStudent },
        topic: mockTopic,
      });
      prisma.enrollment.update.mockResolvedValue({});
      prisma.topic.updateMany.mockResolvedValue({});

      const result = await service.assign(dto, lecturerUser);

      expect(result).toHaveProperty('id', 1);
      expect(prisma.enrollment.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { status: EnrollmentStatus.ASSIGNED },
      });
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('maps P2002 on enrollmentId to 409 Conflict', async () => {
      prisma.enrollment.findUnique.mockResolvedValue(mockEnrollment);
      prisma.topic.findUnique.mockResolvedValue(mockTopic);
      lecturerSemesterService.resolveCapacity.mockResolvedValue(5);
      prisma.thesis.count.mockResolvedValue(0);
      prisma.$transaction.mockRejectedValue(
        new PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002', clientVersion: '6.0.0', meta: { target: ['enrollment_id'] },
        }),
      );

      await expect(service.assign(dto, lecturerUser))
        .rejects.toThrow(ConflictException);
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd backend
npx jest --testPathPattern=thesis.service.spec --verbose
```

Expected: FAIL — service not found.

- [ ] **Step 4: Implement `ThesisService`**

Create `backend/src/thesis/thesis.service.ts`:

```typescript
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, Role, EnrollmentStatus, TopicStatus, ThesisStatus } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { LecturerSemesterService } from '../lecturer-semester/lecturer-semester.service';
import { CreateThesisDto } from './dto/create-thesis.dto';
import { QueryThesisDto } from './dto/query-thesis.dto';

type AuthUser = { role: Role; lecturer: { id: number } | null };

type ThesisWithRelations = Prisma.ThesisGetPayload<{
  include: {
    topic: { select: { id: true; title: true; lecturerId: true; semesterId: true } };
    enrollment: { include: { student: { select: { id: true; studentId: true; fullName: true } } } };
  };
}>;

@Injectable()
export class ThesisService {
  constructor(
    private prisma: PrismaService,
    private lecturerSemesterService: LecturerSemesterService,
  ) {}

  private get includeClause() {
    return {
      topic: { select: { id: true, title: true, lecturerId: true, semesterId: true } },
      enrollment: {
        include: { student: { select: { id: true, studentId: true, fullName: true } } },
      },
    } as const;
  }

  private toResponse(thesis: ThesisWithRelations) {
    return {
      id: thesis.id,
      title: thesis.title,
      status: thesis.status,
      createdAt: thesis.createdAt,
      topic: { id: thesis.topic.id, title: thesis.topic.title },
      student: thesis.enrollment.student,
      enrollment: {
        id: thesis.enrollmentId,
        semesterId: thesis.topic.semesterId,
      },
    };
  }

  private async recomputeTopicStatuses(
    tx: Prisma.TransactionClient,
    lecturerId: number,
    semesterId: number,
  ) {
    const assignedCount = await tx.thesis.count({
      where: { topic: { lecturerId, semesterId } },
    });
    const capacity = await this.lecturerSemesterService.resolveCapacity(lecturerId, semesterId);

    if (assignedCount >= capacity) {
      await tx.topic.updateMany({
        where: { lecturerId, semesterId, status: TopicStatus.OPEN },
        data: { status: TopicStatus.FULL },
      });
    } else {
      await tx.topic.updateMany({
        where: { lecturerId, semesterId, status: TopicStatus.FULL },
        data: { status: TopicStatus.OPEN },
      });
    }
  }

  async assign(dto: CreateThesisDto, currentUser: AuthUser) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: dto.enrollmentId },
      include: { student: { select: { id: true, studentId: true, fullName: true } } },
    });
    if (!enrollment) throw new NotFoundException(`Enrollment #${dto.enrollmentId} not found`);
    if (enrollment.status !== EnrollmentStatus.AVAILABLE) {
      throw new BadRequestException('Student is not available for assignment');
    }

    const topic = await this.prisma.topic.findUnique({ where: { id: dto.topicId } });
    if (!topic) throw new NotFoundException(`Topic #${dto.topicId} not found`);
    if (topic.status !== TopicStatus.OPEN) {
      throw new BadRequestException('Topic is not open for assignment');
    }
    if (topic.semesterId !== enrollment.semesterId) {
      throw new BadRequestException('Topic and enrollment must be in the same semester');
    }

    if (currentUser.role === Role.LECTURER) {
      if (currentUser.lecturer!.id !== topic.lecturerId) {
        throw new ForbiddenException('You do not own this topic');
      }
    }

    const capacity = await this.lecturerSemesterService.resolveCapacity(topic.lecturerId, topic.semesterId);
    const currentCount = await this.prisma.thesis.count({
      where: { topic: { lecturerId: topic.lecturerId, semesterId: topic.semesterId } },
    });
    if (currentCount >= capacity) {
      throw new BadRequestException('Lecturer has reached maximum student capacity for this semester');
    }

    try {
      const thesis = await this.prisma.$transaction(async (tx) => {
        const created = await tx.thesis.create({
          data: {
            enrollmentId: dto.enrollmentId,
            topicId: dto.topicId,
            title: topic.title,
          },
          include: this.includeClause,
        });

        await tx.enrollment.update({
          where: { id: dto.enrollmentId },
          data: { status: EnrollmentStatus.ASSIGNED },
        });

        await this.recomputeTopicStatuses(tx, topic.lecturerId, topic.semesterId);

        return created;
      });

      return this.toResponse(thesis);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Student already has a thesis this semester');
      }
      throw error;
    }
  }

  async unassign(id: number, currentUser: AuthUser): Promise<void> {
    const thesis = await this.prisma.thesis.findUnique({
      where: { id },
      include: { topic: { select: { lecturerId: true, semesterId: true } } },
    });
    if (!thesis) throw new NotFoundException(`Thesis #${id} not found`);

    if (thesis.status !== ThesisStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot unassign — thesis has progressed beyond initial stage');
    }

    if (currentUser.role === Role.LECTURER) {
      if (currentUser.lecturer!.id !== thesis.topic.lecturerId) {
        throw new ForbiddenException('You do not own this topic');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.thesis.delete({ where: { id } });

      await tx.enrollment.update({
        where: { id: thesis.enrollmentId },
        data: { status: EnrollmentStatus.AVAILABLE },
      });

      await this.recomputeTopicStatuses(tx, thesis.topic.lecturerId, thesis.topic.semesterId);
    });
  }

  async findAll(query: QueryThesisDto, currentUser: AuthUser) {
    let effectiveSemesterId = query.semesterId;

    if (!effectiveSemesterId) {
      const active = await this.prisma.semester.findFirst({
        where: { status: 'ACTIVE' },
      });
      if (!active) return [];
      effectiveSemesterId = active.id;
    }

    const where: Prisma.ThesisWhereInput = {
      topic: { semesterId: effectiveSemesterId },
    };

    if (currentUser.role === Role.LECTURER) {
      where.topic = { ...where.topic as object, lecturerId: currentUser.lecturer!.id };
    } else if (query.lecturerId) {
      where.topic = { ...where.topic as object, lecturerId: query.lecturerId };
    }

    if (query.status) where.status = query.status;
    if (query.topicId) where.topicId = query.topicId;

    const theses = await this.prisma.thesis.findMany({
      where,
      include: this.includeClause,
      orderBy: { createdAt: 'desc' },
    });

    return theses.map((t) => this.toResponse(t));
  }

  async findOne(id: number, currentUser: AuthUser) {
    const thesis = await this.prisma.thesis.findUnique({
      where: { id },
      include: this.includeClause,
    });
    if (!thesis) throw new NotFoundException(`Thesis #${id} not found`);

    if (currentUser.role === Role.LECTURER) {
      if (currentUser.lecturer!.id !== thesis.topic.lecturerId) {
        throw new ForbiddenException('You do not own this topic');
      }
    }

    return this.toResponse(thesis);
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend
npx jest --testPathPattern=thesis.service.spec --verbose
```

Expected: all assign tests PASS.

- [ ] **Step 6: Add tests for `unassign`**

Append to the spec file's `describe('ThesisService')` block:

```typescript
describe('unassign', () => {
  it('throws NotFoundException when thesis does not exist', async () => {
    prisma.thesis.findUnique.mockResolvedValue(null);

    await expect(service.unassign(999, lecturerUser)).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when thesis status is not IN_PROGRESS', async () => {
    prisma.thesis.findUnique.mockResolvedValue({
      id: 1, status: ThesisStatus.SUBMITTED, enrollmentId: 10,
      topic: { lecturerId: 2, semesterId: 3 },
    });

    await expect(service.unassign(1, lecturerUser))
      .rejects.toThrow(new BadRequestException('Cannot unassign — thesis has progressed beyond initial stage'));
  });

  it('throws ForbiddenException when lecturer does not own the topic', async () => {
    prisma.thesis.findUnique.mockResolvedValue({
      id: 1, status: ThesisStatus.IN_PROGRESS, enrollmentId: 10,
      topic: { lecturerId: 999, semesterId: 3 },
    });

    await expect(service.unassign(1, lecturerUser)).rejects.toThrow(ForbiddenException);
  });

  it('allows admin to unassign from any topic', async () => {
    prisma.thesis.findUnique.mockResolvedValue({
      id: 1, status: ThesisStatus.IN_PROGRESS, enrollmentId: 10,
      topic: { lecturerId: 999, semesterId: 3 },
    });
    prisma.thesis.delete.mockResolvedValue({});
    prisma.enrollment.update.mockResolvedValue({});
    prisma.thesis.count.mockResolvedValue(0);
    lecturerSemesterService.resolveCapacity.mockResolvedValue(5);
    prisma.topic.updateMany.mockResolvedValue({});

    await expect(service.unassign(1, adminUser)).resolves.toBeUndefined();
  });

  it('deletes thesis, reverts enrollment, and recomputes topic statuses', async () => {
    prisma.thesis.findUnique.mockResolvedValue({
      id: 1, status: ThesisStatus.IN_PROGRESS, enrollmentId: 10,
      topic: { lecturerId: 2, semesterId: 3 },
    });
    prisma.thesis.delete.mockResolvedValue({});
    prisma.enrollment.update.mockResolvedValue({});
    prisma.thesis.count.mockResolvedValue(2);
    lecturerSemesterService.resolveCapacity.mockResolvedValue(5);
    prisma.topic.updateMany.mockResolvedValue({});

    await service.unassign(1, lecturerUser);

    expect(prisma.thesis.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(prisma.enrollment.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { status: EnrollmentStatus.AVAILABLE },
    });
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
```

- [ ] **Step 7: Add tests for `findAll` and `findOne`**

```typescript
describe('findAll', () => {
  const mockThesisWithRelations = {
    id: 1, title: 'AI in Healthcare', status: ThesisStatus.IN_PROGRESS,
    createdAt: new Date(), enrollmentId: 10, topicId: 5,
    topic: { id: 5, title: 'AI in Healthcare', lecturerId: 2, semesterId: 3 },
    enrollment: { student: mockStudent },
  };

  it('defaults to active semester when semesterId not provided', async () => {
    prisma.semester.findFirst.mockResolvedValue({ id: 3 });
    prisma.thesis.findMany.mockResolvedValue([mockThesisWithRelations]);

    await service.findAll({}, lecturerUser);

    expect(prisma.thesis.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          topic: expect.objectContaining({ semesterId: 3 }),
        }),
      }),
    );
  });

  it('scopes to lecturer own topics when role is LECTURER', async () => {
    prisma.thesis.findMany.mockResolvedValue([]);

    await service.findAll({ semesterId: 3 }, lecturerUser);

    expect(prisma.thesis.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          topic: expect.objectContaining({ lecturerId: 2 }),
        }),
      }),
    );
  });

  it('allows admin to filter by lecturerId', async () => {
    prisma.thesis.findMany.mockResolvedValue([]);

    await service.findAll({ semesterId: 3, lecturerId: 7 }, adminUser);

    expect(prisma.thesis.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          topic: expect.objectContaining({ lecturerId: 7 }),
        }),
      }),
    );
  });

  it('returns empty array when no active semester and semesterId not provided', async () => {
    prisma.semester.findFirst.mockResolvedValue(null);

    const result = await service.findAll({}, adminUser);

    expect(result).toEqual([]);
  });
});

describe('findOne', () => {
  const mockThesisWithRelations = {
    id: 1, title: 'AI in Healthcare', status: ThesisStatus.IN_PROGRESS,
    createdAt: new Date(), enrollmentId: 10, topicId: 5,
    topic: { id: 5, title: 'AI in Healthcare', lecturerId: 2, semesterId: 3 },
    enrollment: { student: mockStudent },
  };

  it('returns thesis detail when found', async () => {
    prisma.thesis.findUnique.mockResolvedValue(mockThesisWithRelations);

    const result = await service.findOne(1, lecturerUser);

    expect(result).toHaveProperty('id', 1);
    expect(result).toHaveProperty('student');
    expect(result).toHaveProperty('topic');
  });

  it('throws NotFoundException when thesis does not exist', async () => {
    prisma.thesis.findUnique.mockResolvedValue(null);

    await expect(service.findOne(999, adminUser)).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException when lecturer does not own the topic', async () => {
    prisma.thesis.findUnique.mockResolvedValue({
      ...mockThesisWithRelations,
      topic: { ...mockThesisWithRelations.topic, lecturerId: 999 },
    });

    await expect(service.findOne(1, lecturerUser)).rejects.toThrow(ForbiddenException);
  });
});
```

- [ ] **Step 8: Run all thesis tests**

```bash
cd backend
npx jest --testPathPattern=thesis.service.spec --verbose
```

Expected: all tests PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/src/thesis/
git commit -m "feat(thesis): add assignment service with assign, unassign, list, detail"
```

---

### Task 5: Thesis Controller + Register Module

**Files:**
- Create: `backend/src/thesis/thesis.controller.ts`
- Modify: `backend/src/thesis/thesis.module.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Consumes: `ThesisService.assign`, `.unassign`, `.findAll`, `.findOne`
- Produces:
  - `POST /theses` (LECTURER, ADMIN) → 201
  - `DELETE /theses/:id` (LECTURER, ADMIN) → 204
  - `GET /theses` (LECTURER, ADMIN) → 200
  - `GET /theses/:id` (LECTURER, ADMIN) → 200

- [ ] **Step 1: Create the controller**

Create `backend/src/thesis/thesis.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ThesisService } from './thesis.service';
import { CreateThesisDto } from './dto/create-thesis.dto';
import { QueryThesisDto } from './dto/query-thesis.dto';

type AuthUser = { role: Role; lecturer: { id: number } | null };

@Controller('theses')
@Roles(Role.LECTURER, Role.ADMIN)
export class ThesisController {
  constructor(private readonly thesisService: ThesisService) {}

  @Get()
  findAll(@Query() query: QueryThesisDto, @CurrentUser() user: AuthUser) {
    return this.thesisService.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.thesisService.findOne(id, user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  assign(@Body() dto: CreateThesisDto, @CurrentUser() user: AuthUser) {
    return this.thesisService.assign(dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  unassign(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.thesisService.unassign(id, user);
  }
}
```

- [ ] **Step 2: Create the module**

Create `backend/src/thesis/thesis.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ThesisController } from './thesis.controller';
import { ThesisService } from './thesis.service';
import { LecturerSemesterModule } from '../lecturer-semester/lecturer-semester.module';

@Module({
  imports: [LecturerSemesterModule],
  controllers: [ThesisController],
  providers: [ThesisService],
})
export class ThesisModule {}
```

- [ ] **Step 3: Register in `AppModule`**

Add to `backend/src/app.module.ts`:

```typescript
import { ThesisModule } from './thesis/thesis.module';

// In @Module.imports:
ThesisModule,
```

- [ ] **Step 4: Run all tests**

```bash
cd backend
pnpm run test
```

Expected: all tests PASS, including existing tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/thesis/ backend/src/app.module.ts
git commit -m "feat(thesis): add controller with assign, unassign, list, detail endpoints"
```

---

### Task 6: Integration Verification — GET Endpoints for Eligible Students and Open Topics

The frontend assign dialog needs two data sources: eligible students (enrolled + AVAILABLE) and open topics. The enrollment `GET /enrollments` already exists but needs a `status` filter. The topic `GET /topics` already supports `status` filter. Verify both work and add the status filter to enrollments if missing.

**Files:**
- Modify: `backend/src/enrollment/dto/query-enrollment.dto.ts` (add `status` filter if missing)
- Modify: `backend/src/enrollment/enrollment.service.ts` (apply `status` filter if missing)

**Interfaces:**
- Consumes: existing enrollment and topic endpoints
- Produces: `GET /enrollments?semesterId=X&status=AVAILABLE` returns only available students

- [ ] **Step 1: Check current `QueryEnrollmentDto` for status filter**

Read `backend/src/enrollment/dto/query-enrollment.dto.ts`. If it doesn't have a `status` field, add one:

```typescript
import { EnrollmentStatus } from '@prisma/client';

@IsOptional()
@IsEnum(EnrollmentStatus)
status?: EnrollmentStatus;
```

- [ ] **Step 2: Check enrollment service `findAll` applies status filter**

Read `backend/src/enrollment/enrollment.service.ts`. If the `findAll` method doesn't filter by `status`, add:

```typescript
if (query.status) where.status = query.status;
```

- [ ] **Step 3: Test the enrollment filter works**

```bash
cd backend
pnpm run test
```

Expected: all tests PASS.

- [ ] **Step 4: Commit (if changes were needed)**

```bash
git add backend/src/enrollment/
git commit -m "feat(enrollment): add status filter to enrollment list endpoint"
```

---
