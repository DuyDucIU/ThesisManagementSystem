# Lecturer Management — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `LecturerModule` — a standard NestJS CRUD module where creating a lecturer atomically creates a linked `User` account (username = lecturerId, initial password = bcrypt(lecturerId), role = LECTURER).

**Architecture:** Mirrors `StudentModule` in structure. The key difference is `create` runs a Prisma interactive transaction to create `User` then `Lecturer` atomically, and `remove` deletes both in a batch transaction (Lecturer first to release the FK, then User). No schema migration needed — the `Lecturer` model already has `userId Int` (non-nullable).

**Tech Stack:** NestJS, Prisma (MySQL), bcrypt, class-validator, Jest

---

## File Map

| File | Action |
|------|--------|
| `backend/src/lecturer/dto/create-lecturer.dto.ts` | Create |
| `backend/src/lecturer/dto/update-lecturer.dto.ts` | Create |
| `backend/src/lecturer/dto/query-lecturer.dto.ts` | Create |
| `backend/src/lecturer/lecturer.service.ts` | Create |
| `backend/src/lecturer/lecturer.service.spec.ts` | Create |
| `backend/src/lecturer/lecturer.controller.ts` | Create |
| `backend/src/lecturer/lecturer.controller.spec.ts` | Create |
| `backend/src/lecturer/lecturer.module.ts` | Create |
| `backend/src/app.module.ts` | Modify — import `LecturerModule` |

---

## Task 1: Create branch and scaffold empty files

**Files:**
- Create: `backend/src/lecturer/dto/create-lecturer.dto.ts`
- Create: `backend/src/lecturer/dto/update-lecturer.dto.ts`
- Create: `backend/src/lecturer/dto/query-lecturer.dto.ts`
- Create: `backend/src/lecturer/lecturer.service.ts`
- Create: `backend/src/lecturer/lecturer.service.spec.ts`
- Create: `backend/src/lecturer/lecturer.controller.ts`
- Create: `backend/src/lecturer/lecturer.controller.spec.ts`
- Create: `backend/src/lecturer/lecturer.module.ts`

- [ ] **Step 1: Create branch**

```bash
git checkout -b feature/lecturer-management
```

- [ ] **Step 2: Scaffold empty files**

```bash
cd backend
mkdir -p src/lecturer/dto
touch src/lecturer/dto/create-lecturer.dto.ts
touch src/lecturer/dto/update-lecturer.dto.ts
touch src/lecturer/dto/query-lecturer.dto.ts
touch src/lecturer/lecturer.service.ts
touch src/lecturer/lecturer.service.spec.ts
touch src/lecturer/lecturer.controller.ts
touch src/lecturer/lecturer.controller.spec.ts
touch src/lecturer/lecturer.module.ts
```

- [ ] **Step 3: Commit scaffold**

```bash
git add backend/src/lecturer
git commit -m "Scaffold lecturer module files"
```

---

## Task 2: DTOs

**Files:**
- Modify: `backend/src/lecturer/dto/create-lecturer.dto.ts`
- Modify: `backend/src/lecturer/dto/update-lecturer.dto.ts`
- Modify: `backend/src/lecturer/dto/query-lecturer.dto.ts`

DTOs are plain classes — no unit tests needed (validation is exercised through controller e2e tests and manual Postman verification).

- [ ] **Step 1: Write `create-lecturer.dto.ts`**

```typescript
import {
  IsString,
  IsEmail,
  IsOptional,
  IsInt,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateLecturerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  lecturerId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  fullName: string;

  @IsEmail()
  @MaxLength(100)
  email: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxStudents?: number;
}
```

- [ ] **Step 2: Write `update-lecturer.dto.ts`**

```typescript
import {
  IsString,
  IsEmail,
  IsOptional,
  IsInt,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateLecturerDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  lecturerId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxStudents?: number;
}
```

- [ ] **Step 3: Write `query-lecturer.dto.ts`**

```typescript
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';

export class QueryLecturerDto {
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

- [ ] **Step 4: Commit DTOs**

```bash
git add backend/src/lecturer/dto
git commit -m "Add lecturer DTOs"
```

---

## Task 3: Service — `create` method

**Files:**
- Modify: `backend/src/lecturer/lecturer.service.spec.ts`
- Modify: `backend/src/lecturer/lecturer.service.ts`

- [ ] **Step 1: Write the failing test**

Write `backend/src/lecturer/lecturer.service.spec.ts` with just the `create` describe block. The full service setup goes here — later tasks will add more `describe` blocks to this same file.

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { LecturerService } from './lecturer.service';
import { PrismaService } from '../prisma/prisma.service';

const mockLecturer = {
  id: 1,
  lecturerId: 'GV001',
  fullName: 'Nguyen Van A',
  email: 'nguyen@hcmiu.edu.vn',
  title: 'Dr.',
  maxStudents: 5,
  userId: 99,
};

const lecturerResponse = {
  id: 1,
  lecturerId: 'GV001',
  fullName: 'Nguyen Van A',
  email: 'nguyen@hcmiu.edu.vn',
  title: 'Dr.',
  maxStudents: 5,
};

describe('LecturerService', () => {
  let service: LecturerService;
  let prisma: {
    lecturer: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    user: {
      create: jest.Mock;
      delete: jest.Mock;
    };
    topic: { count: jest.Mock };
    thesis: { count: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      lecturer: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      user: {
        create: jest.fn(),
        delete: jest.fn(),
      },
      topic: { count: jest.fn() },
      thesis: { count: jest.fn() },
      $transaction: jest.fn().mockImplementation((arg) => {
        if (typeof arg === 'function') return arg(prisma);
        return Promise.resolve(arg);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LecturerService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<LecturerService>(LecturerService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    beforeEach(() => {
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed_gv001' as never);
    });

    it('hashes lecturerId and creates user + lecturer in a transaction', async () => {
      const mockUser = { id: 99 };
      prisma.user.create.mockResolvedValue(mockUser);
      prisma.lecturer.create.mockResolvedValue(mockLecturer);

      const dto = {
        lecturerId: 'GV001',
        fullName: 'Nguyen Van A',
        email: 'nguyen@hcmiu.edu.vn',
        title: 'Dr.',
        maxStudents: 5,
      };

      const result = await service.create(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith('GV001', 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          username: 'GV001',
          passwordHash: 'hashed_gv001',
          role: Role.LECTURER,
          isActive: true,
        },
      });
      expect(prisma.lecturer.create).toHaveBeenCalledWith({
        data: {
          lecturerId: 'GV001',
          fullName: 'Nguyen Van A',
          email: 'nguyen@hcmiu.edu.vn',
          title: 'Dr.',
          maxStudents: 5,
          userId: 99,
        },
      });
      expect(result).toEqual(lecturerResponse);
    });

    it('defaults maxStudents to 5 when not provided', async () => {
      prisma.user.create.mockResolvedValue({ id: 99 });
      prisma.lecturer.create.mockResolvedValue({ ...mockLecturer, maxStudents: 5 });

      await service.create({
        lecturerId: 'GV001',
        fullName: 'Nguyen Van A',
        email: 'nguyen@hcmiu.edu.vn',
      });

      expect(prisma.lecturer.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ maxStudents: 5 }) }),
      );
    });

    it('throws ConflictException on lecturerId duplicate (P2002)', async () => {
      const p2002 = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.0.0', meta: { target: 'lecturers_lecturer_id_key' } },
      );
      prisma.user.create.mockRejectedValue(p2002);

      await expect(
        service.create({ lecturerId: 'GV001', fullName: 'Name', email: 'a@b.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException on email duplicate (P2002)', async () => {
      const p2002 = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.0.0', meta: { target: 'lecturers_email_key' } },
      );
      prisma.user.create.mockResolvedValue({ id: 99 });
      prisma.lecturer.create.mockRejectedValue(p2002);

      await expect(
        service.create({ lecturerId: 'GV001', fullName: 'Name', email: 'dup@x.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend
pnpm run test src/lecturer/lecturer.service.spec.ts
```

Expected: fails with "Cannot find module './lecturer.service'"

- [ ] **Step 3: Write the service skeleton and `create` implementation**

Write `backend/src/lecturer/lecturer.service.ts`:

```typescript
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLecturerDto } from './dto/create-lecturer.dto';
import { UpdateLecturerDto } from './dto/update-lecturer.dto';
import { QueryLecturerDto } from './dto/query-lecturer.dto';

type LecturerRow = {
  id: number;
  lecturerId: string;
  fullName: string;
  email: string;
  title: string | null;
  maxStudents: number;
};

@Injectable()
export class LecturerService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateLecturerDto) {
    const passwordHash = await bcrypt.hash(dto.lecturerId, 10);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            username: dto.lecturerId,
            passwordHash,
            role: Role.LECTURER,
            isActive: true,
          },
        });
        const lecturer = await tx.lecturer.create({
          data: {
            lecturerId: dto.lecturerId,
            fullName: dto.fullName,
            email: dto.email,
            title: dto.title,
            maxStudents: dto.maxStudents ?? 5,
            userId: user.id,
          },
        });
        return this.toResponse(lecturer);
      });
    } catch (e) {
      this.handleP2002(e, dto.lecturerId, dto.email);
    }
  }

  async findAll(query: QueryLecturerDto) {
    return { data: [], total: 0, page: 1, limit: 20 };
  }

  async findOne(id: number) {
    return null as any;
  }

  async update(id: number, dto: UpdateLecturerDto) {
    return null as any;
  }

  async remove(id: number): Promise<void> {
    return;
  }

  private toResponse(lecturer: LecturerRow) {
    return {
      id: lecturer.id,
      lecturerId: lecturer.lecturerId,
      fullName: lecturer.fullName,
      email: lecturer.email,
      title: lecturer.title,
      maxStudents: lecturer.maxStudents,
    };
  }

  private handleP2002(e: unknown, lecturerId?: string, email?: string): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      const rawTarget = e.meta?.target;
      const target = Array.isArray(rawTarget)
        ? rawTarget.join(',')
        : typeof rawTarget === 'string'
          ? rawTarget
          : '';
      if (target.includes('lecturer_id')) {
        throw new ConflictException(
          `Lecturer ID '${lecturerId}' is already in use`,
        );
      }
      if (target.includes('email')) {
        throw new ConflictException(`Email '${email}' is already in use`);
      }
      throw new ConflictException('A field conflicts with an existing record');
    }
    throw e as Error;
  }
}
```

- [ ] **Step 4: Run create tests to verify they pass**

```bash
cd backend
pnpm run test src/lecturer/lecturer.service.spec.ts --testNamePattern="create"
```

Expected: 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add backend/src/lecturer
git commit -m "Add LecturerService create method with tests"
```

---

## Task 4: Service — `findAll` and `findOne`

**Files:**
- Modify: `backend/src/lecturer/lecturer.service.spec.ts` — add `findAll` and `findOne` describe blocks
- Modify: `backend/src/lecturer/lecturer.service.ts` — implement both methods

- [ ] **Step 1: Write the failing tests**

Append these describe blocks inside the outer `describe('LecturerService', ...)` in `lecturer.service.spec.ts`, after the `create` block:

```typescript
  // ─── findAll ─────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    const mockLecturers = [
      { id: 1, lecturerId: 'GV001', fullName: 'Nguyen Van A', email: 'nva@x.com', title: 'Dr.', maxStudents: 5, userId: 99 },
      { id: 2, lecturerId: 'GV002', fullName: 'Tran Thi B', email: 'ttb@x.com', title: null, maxStudents: 3, userId: 100 },
    ];

    it('returns paginated lecturers with default page and limit', async () => {
      prisma.lecturer.findMany.mockResolvedValue(mockLecturers);
      prisma.lecturer.count.mockResolvedValue(2);

      const result = await service.findAll({});

      expect(prisma.lecturer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
      expect(result).toEqual({
        data: [
          { id: 1, lecturerId: 'GV001', fullName: 'Nguyen Van A', email: 'nva@x.com', title: 'Dr.', maxStudents: 5 },
          { id: 2, lecturerId: 'GV002', fullName: 'Tran Thi B', email: 'ttb@x.com', title: null, maxStudents: 3 },
        ],
        total: 2,
        page: 1,
        limit: 20,
      });
    });

    it('applies page and limit to skip/take', async () => {
      prisma.lecturer.findMany.mockResolvedValue([]);
      prisma.lecturer.count.mockResolvedValue(0);

      await service.findAll({ page: 3, limit: 10 });

      expect(prisma.lecturer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('applies search filter to fullName, lecturerId, and email', async () => {
      prisma.lecturer.findMany.mockResolvedValue([]);
      prisma.lecturer.count.mockResolvedValue(0);

      await service.findAll({ search: 'Nguyen' });

      expect(prisma.lecturer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { fullName: { contains: 'Nguyen' } },
              { lecturerId: { contains: 'Nguyen' } },
              { email: { contains: 'Nguyen' } },
            ],
          },
        }),
      );
    });

    it('strips userId from response', async () => {
      prisma.lecturer.findMany.mockResolvedValue([mockLecturers[0]]);
      prisma.lecturer.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result.data[0]).not.toHaveProperty('userId');
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns the lecturer response when found', async () => {
      prisma.lecturer.findUnique.mockResolvedValue(mockLecturer);

      const result = await service.findOne(1);

      expect(prisma.lecturer.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(lecturerResponse);
    });

    it('throws NotFoundException when lecturer does not exist', async () => {
      prisma.lecturer.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend
pnpm run test src/lecturer/lecturer.service.spec.ts --testNamePattern="findAll|findOne"
```

Expected: tests fail

- [ ] **Step 3: Implement `findAll` and `findOne`**

Replace the stub implementations in `lecturer.service.ts`:

```typescript
  async findAll(query: QueryLecturerDto) {
    const { search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.LecturerWhereInput = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { lecturerId: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [lecturers, total] = await Promise.all([
      this.prisma.lecturer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.lecturer.count({ where }),
    ]);

    return {
      data: lecturers.map((l) => this.toResponse(l)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: number) {
    const lecturer = await this.prisma.lecturer.findUnique({ where: { id } });
    if (!lecturer) throw new NotFoundException(`Lecturer #${id} not found`);
    return this.toResponse(lecturer);
  }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend
pnpm run test src/lecturer/lecturer.service.spec.ts --testNamePattern="findAll|findOne"
```

Expected: 6 tests pass

- [ ] **Step 5: Commit**

```bash
git add backend/src/lecturer
git commit -m "Add LecturerService findAll and findOne with tests"
```

---

## Task 5: Service — `update` method

**Files:**
- Modify: `backend/src/lecturer/lecturer.service.spec.ts`
- Modify: `backend/src/lecturer/lecturer.service.ts`

- [ ] **Step 1: Write the failing tests**

Append inside the outer `describe`:

```typescript
  // ─── update ──────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('throws NotFoundException when lecturer does not exist', async () => {
      prisma.lecturer.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { fullName: 'New Name' })).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when no fields are provided', async () => {
      prisma.lecturer.findUnique.mockResolvedValue(mockLecturer);

      await expect(service.update(1, {})).rejects.toThrow(
        new BadRequestException('At least one field must be provided'),
      );
    });

    it('updates fullName and returns response without userId', async () => {
      prisma.lecturer.findUnique.mockResolvedValue(mockLecturer);
      prisma.lecturer.update.mockResolvedValue({ ...mockLecturer, fullName: 'Updated Name' });

      const result = await service.update(1, { fullName: 'Updated Name' });

      expect(prisma.lecturer.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { fullName: 'Updated Name' },
      });
      expect(result).toEqual({ ...lecturerResponse, fullName: 'Updated Name' });
      expect(result).not.toHaveProperty('userId');
    });

    it('updates only the provided fields', async () => {
      prisma.lecturer.findUnique.mockResolvedValue(mockLecturer);
      prisma.lecturer.update.mockResolvedValue({ ...mockLecturer, maxStudents: 8 });

      await service.update(1, { maxStudents: 8 });

      expect(prisma.lecturer.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { maxStudents: 8 },
      });
    });

    it('throws ConflictException on lecturerId duplicate (P2002)', async () => {
      prisma.lecturer.findUnique.mockResolvedValue(mockLecturer);
      const p2002 = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.0.0', meta: { target: 'lecturers_lecturer_id_key' } },
      );
      prisma.lecturer.update.mockRejectedValue(p2002);

      await expect(service.update(1, { lecturerId: 'DUPLICATE' })).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException on email duplicate (P2002)', async () => {
      prisma.lecturer.findUnique.mockResolvedValue(mockLecturer);
      const p2002 = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.0.0', meta: { target: 'lecturers_email_key' } },
      );
      prisma.lecturer.update.mockRejectedValue(p2002);

      await expect(service.update(1, { email: 'dup@x.com' })).rejects.toThrow(ConflictException);
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend
pnpm run test src/lecturer/lecturer.service.spec.ts --testNamePattern="update"
```

Expected: tests fail

- [ ] **Step 3: Implement `update`**

Replace the stub in `lecturer.service.ts`:

```typescript
  async update(id: number, dto: UpdateLecturerDto) {
    const lecturer = await this.prisma.lecturer.findUnique({ where: { id } });
    if (!lecturer) throw new NotFoundException(`Lecturer #${id} not found`);

    if (
      dto.fullName === undefined &&
      dto.email === undefined &&
      dto.lecturerId === undefined &&
      dto.title === undefined &&
      dto.maxStudents === undefined
    ) {
      throw new BadRequestException('At least one field must be provided');
    }

    try {
      const updated = await this.prisma.lecturer.update({
        where: { id },
        data: {
          ...(dto.fullName !== undefined && { fullName: dto.fullName }),
          ...(dto.email !== undefined && { email: dto.email }),
          ...(dto.lecturerId !== undefined && { lecturerId: dto.lecturerId }),
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.maxStudents !== undefined && { maxStudents: dto.maxStudents }),
        },
      });
      return this.toResponse(updated);
    } catch (e) {
      this.handleP2002(e, dto.lecturerId, dto.email);
    }
  }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend
pnpm run test src/lecturer/lecturer.service.spec.ts --testNamePattern="update"
```

Expected: 6 tests pass

- [ ] **Step 5: Commit**

```bash
git add backend/src/lecturer
git commit -m "Add LecturerService update with tests"
```

---

## Task 6: Service — `remove` method

**Files:**
- Modify: `backend/src/lecturer/lecturer.service.spec.ts`
- Modify: `backend/src/lecturer/lecturer.service.ts`

- [ ] **Step 1: Write the failing tests**

Append inside the outer `describe`:

```typescript
  // ─── remove ──────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('throws NotFoundException when lecturer does not exist', async () => {
      prisma.lecturer.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when lecturer has topics', async () => {
      prisma.lecturer.findUnique.mockResolvedValue(mockLecturer);
      prisma.topic.count.mockResolvedValue(2);

      await expect(service.remove(1)).rejects.toThrow(
        new ConflictException('Cannot delete lecturer with existing topics'),
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('throws ConflictException when lecturer is assigned as thesis reviewer', async () => {
      prisma.lecturer.findUnique.mockResolvedValue(mockLecturer);
      prisma.topic.count.mockResolvedValue(0);
      prisma.thesis.count.mockResolvedValue(1);

      await expect(service.remove(1)).rejects.toThrow(
        new ConflictException('Cannot delete lecturer assigned as thesis reviewer'),
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('deletes lecturer then user in a transaction when no constraints violated', async () => {
      prisma.lecturer.findUnique.mockResolvedValue(mockLecturer);
      prisma.topic.count.mockResolvedValue(0);
      prisma.thesis.count.mockResolvedValue(0);
      prisma.lecturer.delete.mockResolvedValue(mockLecturer);
      prisma.user.delete.mockResolvedValue({});

      await service.remove(1);

      expect(prisma.lecturer.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 99 } });
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend
pnpm run test src/lecturer/lecturer.service.spec.ts --testNamePattern="remove"
```

Expected: tests fail

- [ ] **Step 3: Implement `remove`**

Replace the stub in `lecturer.service.ts`:

```typescript
  async remove(id: number): Promise<void> {
    const lecturer = await this.prisma.lecturer.findUnique({ where: { id } });
    if (!lecturer) throw new NotFoundException(`Lecturer #${id} not found`);

    const topicCount = await this.prisma.topic.count({ where: { lecturerId: id } });
    if (topicCount > 0) {
      throw new ConflictException('Cannot delete lecturer with existing topics');
    }

    const reviewerCount = await this.prisma.thesis.count({ where: { reviewerId: id } });
    if (reviewerCount > 0) {
      throw new ConflictException(
        'Cannot delete lecturer assigned as thesis reviewer',
      );
    }

    await this.prisma.$transaction([
      this.prisma.lecturer.delete({ where: { id } }),
      this.prisma.user.delete({ where: { id: lecturer.userId } }),
    ]);
  }
```

- [ ] **Step 4: Run all service tests to verify they all pass**

```bash
cd backend
pnpm run test src/lecturer/lecturer.service.spec.ts
```

Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add backend/src/lecturer
git commit -m "Add LecturerService remove with tests"
```

---

## Task 7: Controller, module, and AppModule registration

**Files:**
- Modify: `backend/src/lecturer/lecturer.controller.spec.ts`
- Modify: `backend/src/lecturer/lecturer.controller.ts`
- Modify: `backend/src/lecturer/lecturer.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Write the failing controller tests**

Write `backend/src/lecturer/lecturer.controller.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { LecturerController } from './lecturer.controller';
import { LecturerService } from './lecturer.service';

describe('LecturerController', () => {
  let controller: LecturerController;
  let service: jest.Mocked<LecturerService>;

  const mockResponse = {
    id: 1,
    lecturerId: 'GV001',
    fullName: 'Nguyen Van A',
    email: 'nguyen@hcmiu.edu.vn',
    title: 'Dr.',
    maxStudents: 5,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LecturerController],
      providers: [
        {
          provide: LecturerService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockResponse),
            findAll: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 }),
            findOne: jest.fn().mockResolvedValue(mockResponse),
            update: jest.fn().mockResolvedValue(mockResponse),
            remove: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<LecturerController>(LecturerController);
    service = module.get(LecturerService);
  });

  afterEach(() => jest.clearAllMocks());

  it('delegates create to service with dto', async () => {
    const dto = { lecturerId: 'GV001', fullName: 'Nguyen Van A', email: 'nguyen@hcmiu.edu.vn' };
    await controller.create(dto as any);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('delegates findAll to service with query', async () => {
    const query = { page: 1, limit: 10 };
    await controller.findAll(query as any);
    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('delegates findOne to service with id', async () => {
    await controller.findOne(1);
    expect(service.findOne).toHaveBeenCalledWith(1);
  });

  it('delegates update to service with id and dto', async () => {
    await controller.update(1, { fullName: 'New' } as any);
    expect(service.update).toHaveBeenCalledWith(1, { fullName: 'New' });
  });

  it('delegates remove to service with id', async () => {
    await controller.remove(1);
    expect(service.remove).toHaveBeenCalledWith(1);
  });
});
```

- [ ] **Step 2: Run controller tests to verify they fail**

```bash
cd backend
pnpm run test src/lecturer/lecturer.controller.spec.ts
```

Expected: fails with "Cannot find module './lecturer.controller'"

- [ ] **Step 3: Write the controller**

Write `backend/src/lecturer/lecturer.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
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
import { LecturerService } from './lecturer.service';
import { CreateLecturerDto } from './dto/create-lecturer.dto';
import { UpdateLecturerDto } from './dto/update-lecturer.dto';
import { QueryLecturerDto } from './dto/query-lecturer.dto';

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

- [ ] **Step 4: Write the module**

Write `backend/src/lecturer/lecturer.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { LecturerService } from './lecturer.service';
import { LecturerController } from './lecturer.controller';

@Module({
  controllers: [LecturerController],
  providers: [LecturerService],
})
export class LecturerModule {}
```

- [ ] **Step 5: Register in AppModule**

Edit `backend/src/app.module.ts` — add the import and module registration:

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
import { EnrollmentModule } from './enrollment/enrollment.module';
import { LecturerModule } from './lecturer/lecturer.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    SemesterModule,
    StudentModule,
    EnrollmentModule,
    LecturerModule,
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
cd backend
pnpm run test
```

Expected: all tests pass (existing 105 + new lecturer tests)

- [ ] **Step 7: Commit**

```bash
git add backend/src/lecturer backend/src/app.module.ts
git commit -m "Add LecturerController, LecturerModule, register in AppModule"
```
