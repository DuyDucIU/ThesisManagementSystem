# Account Management — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add account activation/deactivation endpoints for students and lecturers, and expose `isActive` on both list endpoints.

**Architecture:** All new endpoints are added to the existing `StudentController` and `LecturerController` (both already `@Roles(Role.ADMIN)`). Student activation creates a `User` record in a Prisma interactive transaction. Toggle and bulk-toggle use `user.update` / `user.updateMany`. The `findAll` queries gain an `include: { user }` to return `isActive`, and a new `accountStatus` query param drives server-side filtering.

**Tech Stack:** NestJS 11, Prisma 6 (MySQL), bcrypt, class-validator / class-transformer, Jest 30.

---

## File Map

| Action | File |
|--------|------|
| Modify | `backend/src/student/dto/query-student.dto.ts` |
| Create | `backend/src/student/dto/account-action.dto.ts` |
| Create | `backend/src/student/dto/activate-bulk.dto.ts` |
| Create | `backend/src/student/dto/account-bulk.dto.ts` |
| Modify | `backend/src/student/student.service.ts` |
| Modify | `backend/src/student/student.controller.ts` |
| Modify | `backend/src/student/student.service.spec.ts` |
| Modify | `backend/src/lecturer/dto/query-lecturer.dto.ts` |
| Create | `backend/src/lecturer/dto/account-action.dto.ts` |
| Create | `backend/src/lecturer/dto/account-bulk.dto.ts` |
| Modify | `backend/src/lecturer/lecturer.service.ts` |
| Modify | `backend/src/lecturer/lecturer.controller.ts` |
| Modify | `backend/src/lecturer/lecturer.service.spec.ts` |

---

## Task 1 — Extend `GET /students`: `isActive` in response + `accountStatus` filter

**Files:**
- Modify: `backend/src/student/dto/query-student.dto.ts`
- Modify: `backend/src/student/student.service.ts`
- Modify: `backend/src/student/student.service.spec.ts`

- [ ] **Step 1: Add `accountStatus` to `QueryStudentDto`**

Replace the entire file `backend/src/student/dto/query-student.dto.ts`:

```typescript
import { Transform, Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  IsIn,
  Min,
  Max,
} from 'class-validator';

export class QueryStudentDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  hasAccount?: boolean;

  @IsOptional()
  @IsIn(['no-account', 'active', 'inactive'])
  accountStatus?: 'no-account' | 'active' | 'inactive';

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

- [ ] **Step 2: Update `findAll` in `StudentService` to include user and filter by `accountStatus`**

In `backend/src/student/student.service.ts`, replace the `findAll` method:

```typescript
async findAll(query: QueryStudentDto) {
  const { search, hasAccount, accountStatus, page = 1, limit = 20 } = query;
  const skip = (page - 1) * limit;
  const where: Prisma.StudentWhereInput = {};

  if (search) {
    where.OR = [
      { fullName: { contains: search } },
      { studentId: { contains: search } },
      { email: { contains: search } },
    ];
  }

  if (accountStatus === 'no-account') {
    where.userId = null;
  } else if (accountStatus === 'active') {
    where.user = { isActive: true };
  } else if (accountStatus === 'inactive') {
    where.user = { isActive: false };
  } else if (hasAccount === true) {
    where.userId = { not: null };
  } else if (hasAccount === false) {
    where.userId = null;
  }

  const [students, total] = await Promise.all([
    this.prisma.student.findMany({
      where,
      include: { user: { select: { isActive: true } } },
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
    isActive: s.user?.isActive ?? null,
  }));

  return { data, total, page, limit };
}
```

- [ ] **Step 3: Write failing tests for the new `findAll` behaviour**

In `backend/src/student/student.service.spec.ts`, upgrade the mock setup so `$transaction` handles both array and callback form, and add a `user` mock. Also add three new tests inside the existing `describe('findAll', ...)` block.

**Update the `prisma` type and `beforeEach` setup** (replace the existing `let prisma:` declaration and the matching `useValue` object):

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
  enrollment: { deleteMany: jest.Mock };
  thesis: { count: jest.Mock };
  user: {
    create: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  $transaction: jest.Mock;
};
```

In `beforeEach`, replace the `useValue` object to match:

```typescript
{
  student: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
  },
  enrollment: {
    deleteMany: jest.fn(),
  },
  thesis: { count: jest.fn() },
  user: {
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn().mockImplementation((arg) => {
    if (typeof arg === 'function') return arg(prisma);
    return Promise.resolve(arg);
  }),
}
```

**Add inside `describe('findAll', ...)`** after the existing tests:

```typescript
it('includes isActive from the linked user (active)', async () => {
  prisma.student.findMany.mockResolvedValue([
    { id: 1, studentId: 'ITITIU21001', fullName: 'Nguyen Van A', email: 'a@b.com', userId: 5, user: { isActive: true } },
    { id: 2, studentId: 'ITITIU21002', fullName: 'Tran Thi B',   email: 'b@b.com', userId: null, user: null },
  ]);
  prisma.student.count.mockResolvedValue(2);

  const result = await service.findAll({});

  expect(result.data[0].isActive).toBe(true);
  expect(result.data[1].isActive).toBeNull();
});

it('filters by accountStatus: active — passes user.isActive:true in where', async () => {
  prisma.student.findMany.mockResolvedValue([]);
  prisma.student.count.mockResolvedValue(0);

  await service.findAll({ accountStatus: 'active' });

  expect(prisma.student.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: { user: { isActive: true } } }),
  );
});

it('filters by accountStatus: no-account — passes userId:null in where', async () => {
  prisma.student.findMany.mockResolvedValue([]);
  prisma.student.count.mockResolvedValue(0);

  await service.findAll({ accountStatus: 'no-account' });

  expect(prisma.student.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: { userId: null } }),
  );
});
```

- [ ] **Step 4: Run the tests**

```bash
cd backend && pnpm test -- --testPathPattern student.service
```

Expected: All existing tests pass. The 3 new tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/student/dto/query-student.dto.ts backend/src/student/student.service.ts backend/src/student/student.service.spec.ts
git commit -m "Extend GET /students with isActive field and accountStatus filter"
```

---

## Task 2 — `POST /students/:id/activate`

**Files:**
- Create: `backend/src/student/dto/account-action.dto.ts`
- Modify: `backend/src/student/student.service.ts`
- Modify: `backend/src/student/student.controller.ts`
- Modify: `backend/src/student/student.service.spec.ts`

- [ ] **Step 1: Write failing tests for `activateAccount`**

Add at the bottom of `backend/src/student/student.service.spec.ts` (before the closing `}` of the outer `describe`):

```typescript
// ─── activateAccount ─────────────────────────────────────────────────────────

describe('activateAccount', () => {
  const mockStudent = {
    id: 1,
    studentId: 'ITITIU21001',
    fullName: 'Nguyen Van A',
    email: 'a@student.hcmiu.edu.vn',
    userId: null,
  };

  beforeEach(() => {
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed_pw' as never);
  });

  it('throws NotFoundException when student not found', async () => {
    prisma.student.findUnique.mockResolvedValue(null);

    await expect(service.activateAccount(999)).rejects.toThrow(NotFoundException);
  });

  it('throws ConflictException when student already has an account', async () => {
    prisma.student.findUnique.mockResolvedValue({ ...mockStudent, userId: 5 });

    await expect(service.activateAccount(1)).rejects.toThrow(
      new ConflictException('Student already has an account'),
    );
  });

  it('hashes studentId, creates user + links student, returns account shape', async () => {
    prisma.student.findUnique.mockResolvedValue(mockStudent);
    prisma.user.create.mockResolvedValue({ id: 10 });
    prisma.student.update.mockResolvedValue({});

    const result = await service.activateAccount(1);

    expect(bcrypt.hash).toHaveBeenCalledWith('ITITIU21001', 10);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        username: 'ITITIU21001',
        passwordHash: 'hashed_pw',
        role: 'STUDENT',
        isActive: true,
      },
    });
    expect(prisma.student.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { userId: 10 },
    });
    expect(result).toEqual({
      id: 1,
      studentId: 'ITITIU21001',
      fullName: 'Nguyen Van A',
      email: 'a@student.hcmiu.edu.vn',
      hasAccount: true,
      isActive: true,
    });
  });
});
```

Also add the import for `bcrypt` at the top of the spec file:

```typescript
import * as bcrypt from 'bcrypt';
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
cd backend && pnpm test -- --testPathPattern student.service
```

Expected: 3 new `activateAccount` tests FAIL with "service.activateAccount is not a function".

- [ ] **Step 3: Add `activateAccount` to `StudentService`**

At the top of `backend/src/student/student.service.ts`, add missing imports:

```typescript
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
```

Add `activateAccount` method to `StudentService` (before the `remove` method):

```typescript
async activateAccount(id: number) {
  const student = await this.prisma.student.findUnique({ where: { id } });
  if (!student) throw new NotFoundException(`Student #${id} not found`);
  if (student.userId !== null)
    throw new ConflictException('Student already has an account');

  const passwordHash = await bcrypt.hash(student.studentId, 10);

  return await this.prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        username: student.studentId,
        passwordHash,
        role: Role.STUDENT,
        isActive: true,
      },
    });
    await tx.student.update({
      where: { id },
      data: { userId: user.id },
    });
    return {
      id: student.id,
      studentId: student.studentId,
      fullName: student.fullName,
      email: student.email,
      hasAccount: true,
      isActive: true,
    };
  });
}
```

- [ ] **Step 4: Create `account-action.dto.ts`**

Create `backend/src/student/dto/account-action.dto.ts`:

```typescript
import { IsBoolean } from 'class-validator';

export class AccountActionDto {
  @IsBoolean()
  isActive: boolean;
}
```

- [ ] **Step 5: Add `POST /students/:id/activate` to the controller**

In `backend/src/student/student.controller.ts`, add the import and the new handler. The new `POST /:id/activate` route doesn't conflict with existing routes, but place it before `@Patch(':id')` for clarity. Add `HttpStatus` to existing imports if not already present.

Update imports at the top:

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { StudentService } from './student.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { QueryStudentDto } from './dto/query-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
```

Add the handler (after `@Get()` and before `@Patch(':id')`):

```typescript
@Post(':id/activate')
@HttpCode(HttpStatus.CREATED)
activateAccount(@Param('id', ParseIntPipe) id: number) {
  return this.studentService.activateAccount(id);
}
```

- [ ] **Step 6: Run tests to confirm they pass**

```bash
cd backend && pnpm test -- --testPathPattern student.service
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add backend/src/student/dto/account-action.dto.ts backend/src/student/student.service.ts backend/src/student/student.controller.ts backend/src/student/student.service.spec.ts
git commit -m "Add POST /students/:id/activate endpoint"
```

---

## Task 3 — `PATCH /students/:id/account`

**Files:**
- Modify: `backend/src/student/student.service.ts`
- Modify: `backend/src/student/student.controller.ts`
- Modify: `backend/src/student/student.service.spec.ts`

- [ ] **Step 1: Write failing tests for `toggleAccount`**

Add inside the outer `describe('StudentService', ...)` in the spec file:

```typescript
// ─── toggleAccount ───────────────────────────────────────────────────────────

describe('toggleAccount', () => {
  const mockStudentWithAccount = {
    id: 1,
    studentId: 'ITITIU21001',
    fullName: 'Nguyen Van A',
    email: 'a@student.hcmiu.edu.vn',
    userId: 5,
  };

  it('throws NotFoundException when student not found', async () => {
    prisma.student.findUnique.mockResolvedValue(null);

    await expect(service.toggleAccount(999, { isActive: false })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws ConflictException when student has no account', async () => {
    prisma.student.findUnique.mockResolvedValue({ ...mockStudentWithAccount, userId: null });

    await expect(service.toggleAccount(1, { isActive: false })).rejects.toThrow(
      new ConflictException('Student has no account to modify'),
    );
  });

  it('deactivates account — calls user.update with isActive:false and returns shape', async () => {
    prisma.student.findUnique.mockResolvedValue(mockStudentWithAccount);
    prisma.user.update.mockResolvedValue({});

    const result = await service.toggleAccount(1, { isActive: false });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { isActive: false },
    });
    expect(result).toEqual({
      id: 1,
      studentId: 'ITITIU21001',
      fullName: 'Nguyen Van A',
      email: 'a@student.hcmiu.edu.vn',
      hasAccount: true,
      isActive: false,
    });
  });

  it('reactivates account — calls user.update with isActive:true', async () => {
    prisma.student.findUnique.mockResolvedValue(mockStudentWithAccount);
    prisma.user.update.mockResolvedValue({});

    const result = await service.toggleAccount(1, { isActive: true });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { isActive: true },
    });
    expect(result.isActive).toBe(true);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd backend && pnpm test -- --testPathPattern student.service
```

Expected: 4 new `toggleAccount` tests FAIL.

- [ ] **Step 3: Add `toggleAccount` to `StudentService`**

Add the import for `AccountActionDto` at top of `student.service.ts`:

```typescript
import { AccountActionDto } from './dto/account-action.dto';
```

Add the method after `activateAccount`:

```typescript
async toggleAccount(id: number, dto: AccountActionDto) {
  const student = await this.prisma.student.findUnique({ where: { id } });
  if (!student) throw new NotFoundException(`Student #${id} not found`);
  if (student.userId === null)
    throw new ConflictException('Student has no account to modify');

  const userId = student.userId;
  await this.prisma.user.update({
    where: { id: userId },
    data: { isActive: dto.isActive },
  });

  return {
    id: student.id,
    studentId: student.studentId,
    fullName: student.fullName,
    email: student.email,
    hasAccount: true,
    isActive: dto.isActive,
  };
}
```

- [ ] **Step 4: Add `PATCH /students/:id/account` to the controller**

Add imports at top of `student.controller.ts`:

```typescript
import { AccountActionDto } from './dto/account-action.dto';
```

Add handler after `activateAccount`:

```typescript
@Patch(':id/account')
toggleAccount(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: AccountActionDto,
) {
  return this.studentService.toggleAccount(id, dto);
}
```

- [ ] **Step 5: Run tests**

```bash
cd backend && pnpm test -- --testPathPattern student.service
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/src/student/student.service.ts backend/src/student/student.controller.ts backend/src/student/student.service.spec.ts
git commit -m "Add PATCH /students/:id/account endpoint"
```

---

## Task 4 — `POST /students/activate-bulk` + `PATCH /students/account-bulk`

**Files:**
- Create: `backend/src/student/dto/activate-bulk.dto.ts`
- Create: `backend/src/student/dto/account-bulk.dto.ts`
- Modify: `backend/src/student/student.service.ts`
- Modify: `backend/src/student/student.controller.ts`
- Modify: `backend/src/student/student.service.spec.ts`

- [ ] **Step 1: Create the two bulk DTOs**

Create `backend/src/student/dto/activate-bulk.dto.ts`:

```typescript
import { Type } from 'class-transformer';
import { IsArray, ArrayNotEmpty, IsInt } from 'class-validator';

export class ActivateBulkDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Type(() => Number)
  ids: number[];
}
```

Create `backend/src/student/dto/account-bulk.dto.ts`:

```typescript
import { Type } from 'class-transformer';
import { IsArray, ArrayNotEmpty, IsInt, IsBoolean } from 'class-validator';

export class AccountBulkDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Type(() => Number)
  ids: number[];

  @IsBoolean()
  isActive: boolean;
}
```

- [ ] **Step 2: Write failing tests for `activateBulk` and `toggleAccountBulk`**

Add inside `describe('StudentService', ...)`:

```typescript
// ─── activateBulk ────────────────────────────────────────────────────────────

describe('activateBulk', () => {
  beforeEach(() => {
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed_pw' as never);
  });

  it('skips all when all ids already have accounts', async () => {
    prisma.student.findMany.mockResolvedValue([]);  // none without account

    const result = await service.activateBulk({ ids: [1, 2] });

    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(result).toEqual({ activated: 0, skipped: 2 });
  });

  it('activates students without accounts and skips those with', async () => {
    const noAccountStudents = [
      { id: 1, studentId: 'ITITIU21001', fullName: 'A', email: 'a@b.com', userId: null },
    ];
    prisma.student.findMany.mockResolvedValue(noAccountStudents);
    prisma.user.create.mockResolvedValue({ id: 10 });
    prisma.student.update.mockResolvedValue({});

    const result = await service.activateBulk({ ids: [1, 2] });

    expect(bcrypt.hash).toHaveBeenCalledWith('ITITIU21001', 10);
    expect(prisma.user.create).toHaveBeenCalledTimes(1);
    expect(prisma.student.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { userId: 10 },
    });
    expect(result).toEqual({ activated: 1, skipped: 1 });
  });
});

// ─── toggleAccountBulk ───────────────────────────────────────────────────────

describe('toggleAccountBulk', () => {
  it('skips students with no account', async () => {
    prisma.student.findMany.mockResolvedValue([]);  // none with account

    const result = await service.toggleAccountBulk({ ids: [1, 2], isActive: false });

    expect(prisma.user.updateMany).not.toHaveBeenCalled();
    expect(result).toEqual({ updated: 0, skipped: 2 });
  });

  it('updates isActive for all students that have accounts', async () => {
    prisma.student.findMany.mockResolvedValue([
      { userId: 5 },
      { userId: 8 },
    ]);
    prisma.user.updateMany.mockResolvedValue({ count: 2 });

    const result = await service.toggleAccountBulk({ ids: [1, 2, 3], isActive: false });

    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [5, 8] } },
      data: { isActive: false },
    });
    expect(result).toEqual({ updated: 2, skipped: 1 });
  });
});
```

- [ ] **Step 3: Run to confirm failures**

```bash
cd backend && pnpm test -- --testPathPattern student.service
```

Expected: 4 new bulk tests FAIL.

- [ ] **Step 4: Add `activateBulk` and `toggleAccountBulk` to `StudentService`**

Add imports at top of `student.service.ts`:

```typescript
import { ActivateBulkDto } from './dto/activate-bulk.dto';
import { AccountBulkDto } from './dto/account-bulk.dto';
```

Add both methods after `toggleAccount`:

```typescript
async activateBulk(dto: ActivateBulkDto) {
  const students = await this.prisma.student.findMany({
    where: { id: { in: dto.ids }, userId: null },
  });
  const skipped = dto.ids.length - students.length;

  if (students.length === 0) return { activated: 0, skipped };

  const hashed = await Promise.all(
    students.map((s) => bcrypt.hash(s.studentId, 10)),
  );

  await this.prisma.$transaction(async (tx) => {
    for (let i = 0; i < students.length; i++) {
      const user = await tx.user.create({
        data: {
          username: students[i].studentId,
          passwordHash: hashed[i],
          role: Role.STUDENT,
          isActive: true,
        },
      });
      await tx.student.update({
        where: { id: students[i].id },
        data: { userId: user.id },
      });
    }
  });

  return { activated: students.length, skipped };
}

async toggleAccountBulk(dto: AccountBulkDto) {
  const students = await this.prisma.student.findMany({
    where: { id: { in: dto.ids }, userId: { not: null } },
    select: { userId: true },
  });
  const skipped = dto.ids.length - students.length;
  const userIds = students.map((s) => s.userId as number);

  if (userIds.length > 0) {
    await this.prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { isActive: dto.isActive },
    });
  }

  return { updated: students.length, skipped };
}
```

- [ ] **Step 5: Add bulk endpoints to the controller**

**Critical:** `POST /activate-bulk` and `PATCH /account-bulk` are literal routes and must be declared **before** any `@Patch(':id')` route so NestJS doesn't greedily match `activate-bulk` as an `:id` value.

Add imports at top of `student.controller.ts`:

```typescript
import { ActivateBulkDto } from './dto/activate-bulk.dto';
import { AccountBulkDto } from './dto/account-bulk.dto';
```

The final complete controller with correct route order:

```typescript
@Controller('students')
@Roles(Role.ADMIN)
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get()
  findAll(@Query() query: QueryStudentDto) {
    return this.studentService.findAll(query);
  }

  @Post('activate-bulk')
  activateBulk(@Body() dto: ActivateBulkDto) {
    return this.studentService.activateBulk(dto);
  }

  @Patch('account-bulk')
  toggleAccountBulk(@Body() dto: AccountBulkDto) {
    return this.studentService.toggleAccountBulk(dto);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.CREATED)
  activateAccount(@Param('id', ParseIntPipe) id: number) {
    return this.studentService.activateAccount(id);
  }

  @Patch(':id/account')
  toggleAccount(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AccountActionDto,
  ) {
    return this.studentService.toggleAccount(id, dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStudentDto) {
    return this.studentService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.studentService.remove(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateStudentDto) {
    return this.studentService.create(dto);
  }
}
```

- [ ] **Step 6: Run all student tests**

```bash
cd backend && pnpm test -- --testPathPattern student
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add backend/src/student/dto/activate-bulk.dto.ts backend/src/student/dto/account-bulk.dto.ts backend/src/student/student.service.ts backend/src/student/student.controller.ts backend/src/student/student.service.spec.ts
git commit -m "Add student bulk activate and bulk account-toggle endpoints"
```

---

## Task 5 — Extend `GET /lecturers`: `isActive` in response + `accountStatus` filter

**Files:**
- Modify: `backend/src/lecturer/dto/query-lecturer.dto.ts`
- Modify: `backend/src/lecturer/lecturer.service.ts`
- Modify: `backend/src/lecturer/lecturer.service.spec.ts`

- [ ] **Step 1: Add `accountStatus` to `QueryLecturerDto`**

Replace `backend/src/lecturer/dto/query-lecturer.dto.ts`:

```typescript
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsInt, IsIn, Min, Max } from 'class-validator';

export class QueryLecturerDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  accountStatus?: 'active' | 'inactive';

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

- [ ] **Step 2: Write failing tests for the updated `findAll`**

In `backend/src/lecturer/lecturer.service.spec.ts`, add `update` and `updateMany` to the `user` mock:

```typescript
user: {
  create: jest.fn(),
  delete: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
},
```

Also update the `prisma` type declaration to include these:

```typescript
user: {
  create: jest.Mock;
  delete: jest.Mock;
  update: jest.Mock;
  updateMany: jest.Mock;
};
```

**Add inside the existing `describe('findAll', ...)` block** (after existing tests):

```typescript
it('includes isActive from the linked user', async () => {
  const mockLecturerWithUser = {
    ...mockLecturer,
    user: { isActive: true },
  };
  prisma.lecturer.findMany.mockResolvedValue([mockLecturerWithUser]);
  prisma.lecturer.count.mockResolvedValue(1);

  const result = await service.findAll({});

  expect(result.data[0].isActive).toBe(true);
});

it('filters by accountStatus: inactive — passes user.isActive:false in where', async () => {
  prisma.lecturer.findMany.mockResolvedValue([]);
  prisma.lecturer.count.mockResolvedValue(0);

  await service.findAll({ accountStatus: 'inactive' });

  expect(prisma.lecturer.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: { user: { isActive: false } } }),
  );
});
```

- [ ] **Step 3: Run to confirm failures**

```bash
cd backend && pnpm test -- --testPathPattern lecturer.service
```

Expected: 2 new `findAll` tests FAIL.

- [ ] **Step 4: Update `LecturerService.findAll` and add `toResponseWithAccount`**

In `backend/src/lecturer/lecturer.service.ts`:

Add a new type at the top (after `LecturerRow`):

```typescript
type LecturerRowWithUser = LecturerRow & { user: { isActive: boolean } | null };
```

Replace the `findAll` method:

```typescript
async findAll(query: QueryLecturerDto) {
  const { search, accountStatus, page = 1, limit = 20 } = query;
  const skip = (page - 1) * limit;
  const where: Prisma.LecturerWhereInput = {};

  if (search) {
    where.OR = [
      { fullName: { contains: search } },
      { lecturerId: { contains: search } },
      { email: { contains: search } },
    ];
  }

  if (accountStatus === 'active') {
    where.user = { isActive: true };
  } else if (accountStatus === 'inactive') {
    where.user = { isActive: false };
  }

  const [lecturers, total] = await Promise.all([
    this.prisma.lecturer.findMany({
      where,
      include: { user: { select: { isActive: true } } },
      skip,
      take: limit,
      orderBy: { fullName: 'asc' },
    }),
    this.prisma.lecturer.count({ where }),
  ]);

  return {
    data: lecturers.map((l) => this.toResponseWithAccount(l)),
    total,
    page,
    limit,
  };
}
```

Add `toResponseWithAccount` as a private method (after the existing `toResponse`):

```typescript
private toResponseWithAccount(lecturer: LecturerRowWithUser) {
  return {
    ...this.toResponse(lecturer),
    isActive: lecturer.user?.isActive ?? false,
  };
}
```

- [ ] **Step 5: Run tests**

```bash
cd backend && pnpm test -- --testPathPattern lecturer.service
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/src/lecturer/dto/query-lecturer.dto.ts backend/src/lecturer/lecturer.service.ts backend/src/lecturer/lecturer.service.spec.ts
git commit -m "Extend GET /lecturers with isActive field and accountStatus filter"
```

---

## Task 6 — `PATCH /lecturers/:id/account`

**Files:**
- Create: `backend/src/lecturer/dto/account-action.dto.ts`
- Modify: `backend/src/lecturer/lecturer.service.ts`
- Modify: `backend/src/lecturer/lecturer.controller.ts`
- Modify: `backend/src/lecturer/lecturer.service.spec.ts`

- [ ] **Step 1: Write failing tests for `toggleAccount`**

Add inside `describe('LecturerService', ...)`:

```typescript
// ─── toggleAccount ───────────────────────────────────────────────────────────

describe('toggleAccount', () => {
  it('throws NotFoundException when lecturer not found', async () => {
    prisma.lecturer.findUnique.mockResolvedValue(null);

    await expect(service.toggleAccount(999, { isActive: false })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('deactivates lecturer account and returns response with isActive:false', async () => {
    prisma.lecturer.findUnique.mockResolvedValue(mockLecturer);
    prisma.user.update.mockResolvedValue({});

    const result = await service.toggleAccount(1, { isActive: false });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 99 },
      data: { isActive: false },
    });
    expect(result).toEqual({ ...lecturerResponse, isActive: false });
  });

  it('reactivates lecturer account and returns response with isActive:true', async () => {
    prisma.lecturer.findUnique.mockResolvedValue(mockLecturer);
    prisma.user.update.mockResolvedValue({});

    const result = await service.toggleAccount(1, { isActive: true });

    expect(result.isActive).toBe(true);
  });
});
```

- [ ] **Step 2: Run to confirm failures**

```bash
cd backend && pnpm test -- --testPathPattern lecturer.service
```

Expected: 3 new `toggleAccount` tests FAIL.

- [ ] **Step 3: Create `account-action.dto.ts` for lecturer**

Create `backend/src/lecturer/dto/account-action.dto.ts`:

```typescript
import { IsBoolean } from 'class-validator';

export class AccountActionDto {
  @IsBoolean()
  isActive: boolean;
}
```

- [ ] **Step 4: Add `toggleAccount` to `LecturerService`**

Add import at top of `lecturer.service.ts`:

```typescript
import { AccountActionDto } from './dto/account-action.dto';
```

Add method after `update`:

```typescript
async toggleAccount(id: number, dto: AccountActionDto) {
  const lecturer = await this.prisma.lecturer.findUnique({ where: { id } });
  if (!lecturer) throw new NotFoundException(`Lecturer #${id} not found`);

  await this.prisma.user.update({
    where: { id: lecturer.userId },
    data: { isActive: dto.isActive },
  });

  return { ...this.toResponse(lecturer), isActive: dto.isActive };
}
```

- [ ] **Step 5: Add `PATCH /lecturers/:id/account` to the controller**

Add import at top of `lecturer.controller.ts`:

```typescript
import { AccountActionDto } from './dto/account-action.dto';
```

Add handler after `findOne` (the literal route doesn't conflict here, but add before `@Patch(':id')` for consistency):

```typescript
@Patch(':id/account')
toggleAccount(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: AccountActionDto,
) {
  return this.lecturerService.toggleAccount(id, dto);
}
```

- [ ] **Step 6: Run tests**

```bash
cd backend && pnpm test -- --testPathPattern lecturer.service
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add backend/src/lecturer/dto/account-action.dto.ts backend/src/lecturer/lecturer.service.ts backend/src/lecturer/lecturer.controller.ts backend/src/lecturer/lecturer.service.spec.ts
git commit -m "Add PATCH /lecturers/:id/account endpoint"
```

---

## Task 7 — `PATCH /lecturers/account-bulk`

**Files:**
- Create: `backend/src/lecturer/dto/account-bulk.dto.ts`
- Modify: `backend/src/lecturer/lecturer.service.ts`
- Modify: `backend/src/lecturer/lecturer.controller.ts`
- Modify: `backend/src/lecturer/lecturer.service.spec.ts`

- [ ] **Step 1: Write failing tests for `toggleAccountBulk`**

Add inside `describe('LecturerService', ...)`:

```typescript
// ─── toggleAccountBulk ───────────────────────────────────────────────────────

describe('toggleAccountBulk', () => {
  it('skips lecturers not found in ids', async () => {
    prisma.lecturer.findMany.mockResolvedValue([]);

    const result = await service.toggleAccountBulk({ ids: [1, 2], isActive: false });

    expect(prisma.user.updateMany).not.toHaveBeenCalled();
    expect(result).toEqual({ updated: 0, skipped: 2 });
  });

  it('calls user.updateMany with all resolved userIds', async () => {
    prisma.lecturer.findMany.mockResolvedValue([{ userId: 99 }, { userId: 100 }]);
    prisma.user.updateMany.mockResolvedValue({ count: 2 });

    const result = await service.toggleAccountBulk({ ids: [1, 2], isActive: false });

    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [99, 100] } },
      data: { isActive: false },
    });
    expect(result).toEqual({ updated: 2, skipped: 0 });
  });
});
```

- [ ] **Step 2: Run to confirm failures**

```bash
cd backend && pnpm test -- --testPathPattern lecturer.service
```

Expected: 2 new `toggleAccountBulk` tests FAIL.

- [ ] **Step 3: Create `account-bulk.dto.ts` for lecturer**

Create `backend/src/lecturer/dto/account-bulk.dto.ts`:

```typescript
import { Type } from 'class-transformer';
import { IsArray, ArrayNotEmpty, IsInt, IsBoolean } from 'class-validator';

export class AccountBulkDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Type(() => Number)
  ids: number[];

  @IsBoolean()
  isActive: boolean;
}
```

- [ ] **Step 4: Add `toggleAccountBulk` to `LecturerService`**

Add import at top of `lecturer.service.ts`:

```typescript
import { AccountBulkDto } from './dto/account-bulk.dto';
```

Add method after `toggleAccount`:

```typescript
async toggleAccountBulk(dto: AccountBulkDto) {
  const lecturers = await this.prisma.lecturer.findMany({
    where: { id: { in: dto.ids } },
    select: { userId: true },
  });
  const skipped = dto.ids.length - lecturers.length;
  const userIds = lecturers.map((l) => l.userId);

  if (userIds.length > 0) {
    await this.prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { isActive: dto.isActive },
    });
  }

  return { updated: lecturers.length, skipped };
}
```

- [ ] **Step 5: Add `PATCH /lecturers/account-bulk` to the controller**

**Critical:** `PATCH /account-bulk` must be declared **before** `PATCH /:id` so NestJS doesn't match `account-bulk` as an `:id` value.

Add import at top of `lecturer.controller.ts`:

```typescript
import { AccountBulkDto } from './dto/account-bulk.dto';
```

The final complete controller with correct route order:

```typescript
@Controller('lecturers')
@Roles(Role.ADMIN)
export class LecturerController {
  constructor(private readonly lecturerService: LecturerService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateLecturerDto) {
    return this.lecturerService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryLecturerDto) {
    return this.lecturerService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.lecturerService.findOne(id);
  }

  @Patch('account-bulk')
  toggleAccountBulk(@Body() dto: AccountBulkDto) {
    return this.lecturerService.toggleAccountBulk(dto);
  }

  @Patch(':id/account')
  toggleAccount(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AccountActionDto,
  ) {
    return this.lecturerService.toggleAccount(id, dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLecturerDto,
  ) {
    return this.lecturerService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.lecturerService.remove(id);
  }
}
```

- [ ] **Step 6: Run all lecturer tests**

```bash
cd backend && pnpm test -- --testPathPattern lecturer
```

Expected: All tests pass.

- [ ] **Step 7: Run full test suite**

```bash
cd backend && pnpm test
```

Expected: All tests pass with no regressions.

- [ ] **Step 8: Commit**

```bash
git add backend/src/lecturer/dto/account-bulk.dto.ts backend/src/lecturer/lecturer.service.ts backend/src/lecturer/lecturer.controller.ts backend/src/lecturer/lecturer.service.spec.ts
git commit -m "Add PATCH /lecturers/account-bulk endpoint"
```

---

## Self-Review

**Spec coverage check:**
- ✅ `GET /students` — `isActive` field added, `accountStatus` filter (Task 1)
- ✅ `GET /lecturers` — `isActive` field added, `accountStatus` filter (Task 5)
- ✅ `POST /students/:id/activate` — 201, 404, 409 (Task 2)
- ✅ `PATCH /students/:id/account` — 200, 404, 409 (Task 3)
- ✅ `POST /students/activate-bulk` — `{ activated, skipped }` (Task 4)
- ✅ `PATCH /students/account-bulk` — `{ updated, skipped }` (Task 4)
- ✅ `PATCH /lecturers/:id/account` — 200, 404 (Task 6)
- ✅ `PATCH /lecturers/account-bulk` — `{ updated, skipped }` (Task 7)
- ✅ Route ordering — literal routes before `:id` in both controllers (Tasks 4, 7)
- ✅ `ADMIN` role guard — inherited from controller-level `@Roles` (no extra work needed)
- ✅ Bcrypt cost 10, username = studentId, password = studentId (Task 2)
- ✅ `isActive: null` for no-account students, `true/false` for those with accounts (Task 1)
