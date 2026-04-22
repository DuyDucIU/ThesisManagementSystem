# Student Management — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `GET /students`, `PATCH /students/:id`, and `DELETE /students/:id` endpoints to the existing `StudentController`, with pagination, search, and filter support.

**Architecture:** Extend the existing `StudentService` with three new methods (`findAll`, `update`, `remove`). Add two new DTOs (`QueryStudentDto`, `UpdateStudentDto`). Extend the controller with three new routes. All behind `@Roles(Role.ADMIN)` which is already set on the controller class. No schema changes.

**Tech Stack:** NestJS 11, Prisma 6 (MySQL), class-validator, class-transformer, Jest 30.

---

## File Map

| Action | File |
|---|---|
| Create | `backend/src/student/dto/query-student.dto.ts` |
| Create | `backend/src/student/dto/update-student.dto.ts` |
| Modify | `backend/src/student/student.service.ts` |
| Modify | `backend/src/student/student.controller.ts` |
| Modify | `backend/src/student/student.service.spec.ts` |

---

### Task 1: Add DTOs and extend spec mock

**Files:**
- Create: `backend/src/student/dto/query-student.dto.ts`
- Create: `backend/src/student/dto/update-student.dto.ts`
- Modify: `backend/src/student/student.service.spec.ts` (mock extension only)

- [ ] **Step 1: Create `query-student.dto.ts`**

```typescript
// backend/src/student/dto/query-student.dto.ts
import { Transform, Type } from 'class-transformer';
import { IsOptional, IsString, IsBoolean, IsInt, Min } from 'class-validator';

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
  @Type(() => Number)
  @IsInt()
  @Min(1)
  semesterId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
```

- [ ] **Step 2: Create `update-student.dto.ts`**

```typescript
// backend/src/student/dto/update-student.dto.ts
import { IsOptional, IsString, IsEmail, MinLength } from 'class-validator';

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  studentId?: string;
}
```

- [ ] **Step 3: Extend the Prisma mock in `student.service.spec.ts`**

Replace the `prisma` type declaration and `useValue` block with the extended version that supports the new methods:

```typescript
// Replace the existing prisma type + useValue in the beforeEach
let prisma: {
  semester: { findFirst: jest.Mock };
  student: {
    findUnique: jest.Mock;
    upsert: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  semesterStudent: {
    findUnique: jest.Mock;
    create: jest.Mock;
    findMany: jest.Mock;
    deleteMany: jest.Mock;
  };
  thesis: { count: jest.Mock };
};

// Replace the useValue block:
useValue: {
  semester: { findFirst: jest.fn() },
  student: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  semesterStudent: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  thesis: { count: jest.fn() },
},
```

- [ ] **Step 4: Verify the spec file still compiles and existing tests pass**

Run: `cd backend && pnpm run test -- --testPathPattern=student.service`

Expected: all existing tests pass (PASS), no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add backend/src/student/dto/query-student.dto.ts \
        backend/src/student/dto/update-student.dto.ts \
        backend/src/student/student.service.spec.ts
git commit -m "Add QueryStudentDto, UpdateStudentDto; extend spec mock"
```

---

### Task 2: Implement `findAll` in StudentService (TDD)

**Files:**
- Modify: `backend/src/student/student.service.spec.ts`
- Modify: `backend/src/student/student.service.ts`

- [ ] **Step 1: Write failing tests for `findAll`**

Add a new `describe('findAll', ...)` block at the end of the spec file (before the closing `});` of the outer `describe`):

```typescript
describe('findAll', () => {
  const mockStudents = [
    {
      id: 1,
      studentId: 'ITITWE22055',
      fullName: 'Vo Gia Kiet',
      email: 'ititwe22055@student.hcmiu.edu.vn',
      userId: null,
    },
    {
      id: 2,
      studentId: 'ITIT22001',
      fullName: 'Nguyen Van An',
      email: 'itit22001@student.hcmiu.edu.vn',
      userId: 5,
    },
  ];

  it('returns paginated students with default page and limit', async () => {
    prisma.student.findMany.mockResolvedValue(mockStudents);
    prisma.student.count.mockResolvedValue(2);

    const result = await service.findAll({});

    expect(prisma.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 }),
    );
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.data).toHaveLength(2);
  });

  it('maps userId presence to hasAccount boolean', async () => {
    prisma.student.findMany.mockResolvedValue(mockStudents);
    prisma.student.count.mockResolvedValue(2);

    const result = await service.findAll({});

    expect(result.data[0].hasAccount).toBe(false);
    expect(result.data[1].hasAccount).toBe(true);
  });

  it('applies page and limit to skip/take', async () => {
    prisma.student.findMany.mockResolvedValue([]);
    prisma.student.count.mockResolvedValue(0);

    await service.findAll({ page: 3, limit: 10 });

    expect(prisma.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    );
  });

  it('does not include semesterStudent in data when semesterId is not provided', async () => {
    prisma.student.findMany.mockResolvedValue([mockStudents[0]]);
    prisma.student.count.mockResolvedValue(1);

    const result = await service.findAll({});

    expect('semesterStudent' in result.data[0]).toBe(false);
    expect(prisma.semesterStudent.findMany).not.toHaveBeenCalled();
  });

  it('fetches and attaches semesterStudent when semesterId is provided', async () => {
    prisma.student.findMany.mockResolvedValue([mockStudents[0]]);
    prisma.student.count.mockResolvedValue(1);
    prisma.semesterStudent.findMany.mockResolvedValue([
      { studentId: 1, status: 'AVAILABLE' },
    ]);

    const result = await service.findAll({ semesterId: 7 });

    expect(prisma.semesterStudent.findMany).toHaveBeenCalledWith({
      where: { semesterId: 7, studentId: { in: [1] } },
      select: { studentId: true, status: true },
    });
    expect(result.data[0].semesterStudent).toEqual({ status: 'AVAILABLE' });
  });

  it('sets semesterStudent to null for students not found in enrollment query', async () => {
    prisma.student.findMany.mockResolvedValue([mockStudents[0]]);
    prisma.student.count.mockResolvedValue(1);
    prisma.semesterStudent.findMany.mockResolvedValue([]);

    const result = await service.findAll({ semesterId: 7 });

    expect(result.data[0].semesterStudent).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `cd backend && pnpm run test -- --testPathPattern=student.service`

Expected: the new `findAll` tests FAIL with "service.findAll is not a function" or similar. Existing tests still pass.

- [ ] **Step 3: Implement `findAll` in `student.service.ts`**

Add the import for `QueryStudentDto` at the top, then add the method to the class:

```typescript
// Add to imports
import { QueryStudentDto } from './dto/query-student.dto';

// Add method to StudentService class
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

  if (semesterId) {
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
      return {
        ...base,
        semesterStudent: enrollmentMap.has(s.id)
          ? { status: enrollmentMap.get(s.id) }
          : null,
      };
    }
    return base;
  });

  return { data, total, page, limit };
}
```

Also add `Prisma` to the import from `@prisma/client` if not already imported (check top of `student.service.ts`):

```typescript
import { Prisma, SemesterStatus } from '@prisma/client';
```

- [ ] **Step 4: Run tests and confirm they pass**

Run: `cd backend && pnpm run test -- --testPathPattern=student.service`

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/student/student.service.ts \
        backend/src/student/student.service.spec.ts
git commit -m "Add StudentService.findAll with pagination, search, and filters"
```

---

### Task 3: Implement `update` in StudentService (TDD)

**Files:**
- Modify: `backend/src/student/student.service.spec.ts`
- Modify: `backend/src/student/student.service.ts`

- [ ] **Step 1: Write failing tests for `update`**

Add a new `describe('update', ...)` block in the spec:

```typescript
describe('update', () => {
  const mockStudent = {
    id: 1,
    studentId: 'ITITWE22055',
    fullName: 'Vo Gia Kiet',
    email: 'ititwe22055@student.hcmiu.edu.vn',
    userId: null,
  };

  it('throws NotFoundException when student does not exist', async () => {
    prisma.student.findUnique.mockResolvedValue(null);

    await expect(
      service.update(999, { fullName: 'New Name' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when no fields are provided', async () => {
    prisma.student.findUnique.mockResolvedValue(mockStudent);

    await expect(service.update(1, {})).rejects.toThrow(
      new BadRequestException('At least one field must be provided'),
    );
  });

  it('updates fullName and returns student shape with hasAccount', async () => {
    prisma.student.findUnique.mockResolvedValue(mockStudent);
    prisma.student.update.mockResolvedValue({
      ...mockStudent,
      fullName: 'Updated Name',
    });

    const result = await service.update(1, { fullName: 'Updated Name' });

    expect(prisma.student.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { fullName: 'Updated Name' },
    });
    expect(result).toEqual({
      id: 1,
      studentId: 'ITITWE22055',
      fullName: 'Updated Name',
      email: 'ititwe22055@student.hcmiu.edu.vn',
      hasAccount: false,
    });
  });

  it('throws BadRequestException on studentId duplicate (P2002)', async () => {
    prisma.student.findUnique.mockResolvedValue(mockStudent);
    const p2002 = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', clientVersion: '5.0.0', meta: { target: 'students_student_id_key' } },
    );
    prisma.student.update.mockRejectedValue(p2002);

    await expect(
      service.update(1, { studentId: 'DUPLICATE' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException on email duplicate (P2002)', async () => {
    prisma.student.findUnique.mockResolvedValue(mockStudent);
    const p2002 = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', clientVersion: '5.0.0', meta: { target: 'students_email_key' } },
    );
    prisma.student.update.mockRejectedValue(p2002);

    await expect(
      service.update(1, { email: 'dup@student.hcmiu.edu.vn' }),
    ).rejects.toThrow(BadRequestException);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `cd backend && pnpm run test -- --testPathPattern=student.service`

Expected: new `update` tests FAIL. All prior tests still pass.

- [ ] **Step 3: Implement `update` in `student.service.ts`**

Add the import for `UpdateStudentDto` and `NotFoundException` at the top, then add the method:

```typescript
// Ensure these are imported
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, SemesterStatus } from '@prisma/client';
import { UpdateStudentDto } from './dto/update-student.dto';

// Add method to StudentService class
async update(id: number, dto: UpdateStudentDto) {
  const student = await this.prisma.student.findUnique({ where: { id } });
  if (!student) throw new NotFoundException(`Student #${id} not found`);

  if (!dto.fullName && !dto.email && !dto.studentId) {
    throw new BadRequestException('At least one field must be provided');
  }

  try {
    const updated = await this.prisma.student.update({
      where: { id },
      data: {
        ...(dto.fullName !== undefined && { fullName: dto.fullName }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.studentId !== undefined && { studentId: dto.studentId }),
      },
    });
    return {
      id: updated.id,
      studentId: updated.studentId,
      fullName: updated.fullName,
      email: updated.email,
      hasAccount: updated.userId !== null,
    };
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      const target = String(e.meta?.target ?? '');
      if (target.includes('student_id')) {
        throw new BadRequestException(
          `Student ID '${dto.studentId}' is already in use`,
        );
      }
      if (target.includes('email')) {
        throw new BadRequestException(
          `Email '${dto.email}' is already in use`,
        );
      }
      throw new BadRequestException('A field conflicts with an existing record');
    }
    throw e;
  }
}
```

- [ ] **Step 4: Run tests and confirm they pass**

Run: `cd backend && pnpm run test -- --testPathPattern=student.service`

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/student/student.service.ts \
        backend/src/student/student.service.spec.ts
git commit -m "Add StudentService.update with uniqueness guard"
```

---

### Task 4: Implement `remove` in StudentService (TDD)

**Files:**
- Modify: `backend/src/student/student.service.spec.ts`
- Modify: `backend/src/student/student.service.ts`

- [ ] **Step 1: Write failing tests for `remove`**

Add a new `describe('remove', ...)` block in the spec:

```typescript
describe('remove', () => {
  const mockStudent = {
    id: 1,
    studentId: 'ITITWE22055',
    fullName: 'Vo Gia Kiet',
    email: 'ititwe22055@student.hcmiu.edu.vn',
    userId: null,
  };

  it('throws NotFoundException when student does not exist', async () => {
    prisma.student.findUnique.mockResolvedValue(null);

    await expect(service.remove(999)).rejects.toThrow(NotFoundException);
  });

  it('throws ConflictException when student has thesis records', async () => {
    prisma.student.findUnique.mockResolvedValue(mockStudent);
    prisma.thesis.count.mockResolvedValue(1);

    await expect(service.remove(1)).rejects.toThrow(
      new ConflictException('Cannot delete student with active thesis work'),
    );
    expect(prisma.semesterStudent.deleteMany).not.toHaveBeenCalled();
    expect(prisma.student.delete).not.toHaveBeenCalled();
  });

  it('deletes semesterStudent records then student when no thesis exists', async () => {
    prisma.student.findUnique.mockResolvedValue(mockStudent);
    prisma.thesis.count.mockResolvedValue(0);
    prisma.semesterStudent.deleteMany.mockResolvedValue({ count: 1 });
    prisma.student.delete.mockResolvedValue(mockStudent);

    await service.remove(1);

    expect(prisma.semesterStudent.deleteMany).toHaveBeenCalledWith({
      where: { studentId: 1 },
    });
    expect(prisma.student.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('deletes student with no semesterStudent records', async () => {
    prisma.student.findUnique.mockResolvedValue(mockStudent);
    prisma.thesis.count.mockResolvedValue(0);
    prisma.semesterStudent.deleteMany.mockResolvedValue({ count: 0 });
    prisma.student.delete.mockResolvedValue(mockStudent);

    await service.remove(1);

    expect(prisma.semesterStudent.deleteMany).toHaveBeenCalledWith({
      where: { studentId: 1 },
    });
    expect(prisma.student.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});
```

Note: `prisma.thesis` needs to be added to the `PrismaService` mock. The spec's mock object and its type must include `thesis: { count: jest.fn() }` — this was already done in Task 1.

- [ ] **Step 2: Run tests to confirm they fail**

Run: `cd backend && pnpm run test -- --testPathPattern=student.service`

Expected: new `remove` tests FAIL. All prior tests still pass.

- [ ] **Step 3: Implement `remove` in `student.service.ts`**

```typescript
async remove(id: number) {
  const student = await this.prisma.student.findUnique({ where: { id } });
  if (!student) throw new NotFoundException(`Student #${id} not found`);

  const thesisCount = await this.prisma.thesis.count({
    where: { semesterStudent: { studentId: id } },
  });

  if (thesisCount > 0) {
    throw new ConflictException(
      'Cannot delete student with active thesis work',
    );
  }

  await this.prisma.semesterStudent.deleteMany({ where: { studentId: id } });
  await this.prisma.student.delete({ where: { id } });
}
```

- [ ] **Step 4: Run all tests and confirm they pass**

Run: `cd backend && pnpm run test -- --testPathPattern=student.service`

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/student/student.service.ts \
        backend/src/student/student.service.spec.ts
git commit -m "Add StudentService.remove with thesis guard and cascade delete"
```

---

### Task 5: Update StudentController with new endpoints

**Files:**
- Modify: `backend/src/student/student.controller.ts`

- [ ] **Step 1: Replace the controller file with the updated version**

```typescript
// backend/src/student/student.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Body,
  Param,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { StudentService } from './student.service';
import { QueryStudentDto } from './dto/query-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Controller('students')
@Roles(Role.ADMIN)
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get()
  findAll(@Query() query: QueryStudentDto) {
    return this.studentService.findAll(query);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.studentService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.studentService.remove(id);
  }

  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
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

> **Note:** The `@Get()` route must be declared before `@Post('import')` — NestJS routes are matched in declaration order, and `GET /students` should not conflict with `POST /students/import`.

- [ ] **Step 2: Run the full test suite to confirm nothing is broken**

Run: `cd backend && pnpm run test`

Expected: all tests PASS.

- [ ] **Step 3: Build the backend to confirm TypeScript compiles**

Run: `cd backend && pnpm run build`

Expected: build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/student/student.controller.ts
git commit -m "Add GET /students, PATCH /students/:id, DELETE /students/:id endpoints"
```
