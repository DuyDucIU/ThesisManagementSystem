# Topics CRUD — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a `TopicModule` with full CRUD for lecturers and read-only access for all authenticated roles.

**Architecture:** Single `TopicModule` (controller + service + DTOs). Role guards + service-layer ownership checks. `GET /semesters` opened to all authenticated roles as a prerequisite for the frontend semester picker.

**Tech Stack:** NestJS 11, Prisma 6, class-validator, class-transformer, Jest 30.

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| `backend/src/semester/semester.controller.ts` | Modify | Override `@Roles` on `findAll` to allow all authenticated roles |
| `backend/src/topic/dto/create-topic.dto.ts` | Create | Validation DTO for `POST /topics` |
| `backend/src/topic/dto/update-topic.dto.ts` | Create | Validation DTO for `PATCH /topics/:id` |
| `backend/src/topic/dto/query-topic.dto.ts` | Create | Validation DTO for `GET /topics` query params |
| `backend/src/topic/topic.service.ts` | Create | Business logic: findAll, findOne, create, update, remove |
| `backend/src/topic/topic.service.spec.ts` | Create | Unit tests for TopicService |
| `backend/src/topic/topic.controller.ts` | Create | HTTP handlers |
| `backend/src/topic/topic.module.ts` | Create | NestJS module declaration |
| `backend/src/app.module.ts` | Modify | Register TopicModule |

---

## Task 1: Open GET /semesters to All Authenticated Roles

**Files:**
- Modify: `backend/src/semester/semester.controller.ts`

The semester controller has `@Roles(Role.ADMIN)` at the class level. The `GET /semesters` endpoint needs to be accessible to lecturers and students so the frontend semester dropdown can populate. Override the class-level guard on `findAll` only.

- [ ] **Step 1: Override roles on `findAll` handler**

In `backend/src/semester/semester.controller.ts`, add `@Roles` to the `findAll` handler, listing all three roles:

```typescript
import { Role } from '@prisma/client';
// ... existing imports stay the same

@Controller('semesters')
@Roles(Role.ADMIN)
export class SemesterController {
  constructor(private readonly semesterService: SemesterService) {}

  @Get()
  @Roles(Role.ADMIN, Role.LECTURER, Role.STUDENT)  // ← add this line
  findAll(@Query() query: QuerySemesterDto) {
    return this.semesterService.findAll(query);
  }

  // ... rest of controller unchanged
```

`getAllAndOverride` in `RolesGuard` checks the handler first, so this handler-level `@Roles` wins over the class-level admin-only restriction for this route.

- [ ] **Step 2: Verify it still compiles**

```bash
cd backend && pnpm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/semester/semester.controller.ts
git commit -m "feat(semester): open GET /semesters to all authenticated roles"
```

---

## Task 2: Create DTOs

**Files:**
- Create: `backend/src/topic/dto/create-topic.dto.ts`
- Create: `backend/src/topic/dto/update-topic.dto.ts`
- Create: `backend/src/topic/dto/query-topic.dto.ts`

- [ ] **Step 1: Create `create-topic.dto.ts`**

```typescript
// backend/src/topic/dto/create-topic.dto.ts
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateTopicDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  requirements?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
```

- [ ] **Step 2: Create `update-topic.dto.ts`**

```typescript
// backend/src/topic/dto/update-topic.dto.ts
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdateTopicDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  requirements?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
```

- [ ] **Step 3: Create `query-topic.dto.ts`**

```typescript
// backend/src/topic/dto/query-topic.dto.ts
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsInt, IsIn, Min } from 'class-validator';
import { TopicStatus } from '@prisma/client';

export class QueryTopicDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  semesterId?: number;

  @IsOptional()
  @IsIn(['OPEN', 'FULL', 'CLOSED'])
  status?: TopicStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  lecturerId?: number;

  @IsOptional()
  @IsString()
  search?: string;
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/topic/dto/
git commit -m "feat(topics): add CreateTopicDto, UpdateTopicDto, QueryTopicDto"
```

---

## Task 3: TopicService — findAll

**Files:**
- Create: `backend/src/topic/topic.service.ts`
- Create: `backend/src/topic/topic.service.spec.ts`

- [ ] **Step 1: Scaffold the service file**

```typescript
// backend/src/topic/topic.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, TopicStatus, SemesterStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { QueryTopicDto } from './dto/query-topic.dto';

type TopicWithLecturer = Prisma.TopicGetPayload<{
  include: {
    lecturer: { select: { id: true; fullName: true; email: true; title: true } };
  };
}>;

@Injectable()
export class TopicService {
  constructor(private prisma: PrismaService) {}

  private toResponse(topic: TopicWithLecturer) {
    return {
      id: topic.id,
      title: topic.title,
      description: topic.description,
      requirements: topic.requirements,
      note: topic.note,
      status: topic.status,
      createdAt: topic.createdAt,
      semesterId: topic.semesterId,
      lecturer: {
        id: topic.lecturer.id,
        fullName: topic.lecturer.fullName,
        email: topic.lecturer.email,
        title: topic.lecturer.title,
      },
    };
  }

  private get includeClause() {
    return {
      lecturer: { select: { id: true, fullName: true, email: true, title: true } },
    } as const;
  }

  async findAll(query: QueryTopicDto) {
    // placeholder — implemented in next steps
    return [];
  }

  async findOne(id: number) {
    // placeholder
    return null as any;
  }

  async create(dto: CreateTopicDto, lecturerId: number) {
    // placeholder
    return null as any;
  }

  async update(id: number, dto: UpdateTopicDto, lecturerId: number) {
    // placeholder
    return null as any;
  }

  async remove(id: number, lecturerId: number): Promise<void> {
    // placeholder
  }
}
```

- [ ] **Step 2: Write the failing test for findAll**

```typescript
// backend/src/topic/topic.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TopicStatus, SemesterStatus } from '@prisma/client';
import { TopicService } from './topic.service';
import { PrismaService } from '../prisma/prisma.service';

const mockLecturer = { id: 1, fullName: 'Dr. Nguyen Van A', email: 'nva@uni.edu', title: 'Dr.' };

const mockTopic = {
  id: 1,
  title: 'Deep Learning for Medical Imaging',
  description: 'Description text',
  requirements: 'Requirements text',
  note: 'Note text',
  status: TopicStatus.OPEN,
  createdAt: new Date('2026-05-01'),
  semesterId: 3,
  lecturerId: 1,
  lecturer: mockLecturer,
};

const topicResponse = {
  id: 1,
  title: 'Deep Learning for Medical Imaging',
  description: 'Description text',
  requirements: 'Requirements text',
  note: 'Note text',
  status: TopicStatus.OPEN,
  createdAt: new Date('2026-05-01'),
  semesterId: 3,
  lecturer: mockLecturer,
};

describe('TopicService', () => {
  let service: TopicService;
  let prisma: {
    topic: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
    semester: { findFirst: jest.Mock };
    thesis: { count: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      topic: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      semester: { findFirst: jest.fn() },
      thesis: { count: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TopicService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TopicService>(TopicService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── findAll ─────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('defaults to the active semester when semesterId is not provided', async () => {
      prisma.semester.findFirst.mockResolvedValue({ id: 3, status: SemesterStatus.ACTIVE });
      prisma.topic.findMany.mockResolvedValue([mockTopic]);

      await service.findAll({});

      expect(prisma.semester.findFirst).toHaveBeenCalledWith({
        where: { status: SemesterStatus.ACTIVE },
      });
      expect(prisma.topic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ semesterId: 3 }) }),
      );
    });

    it('returns empty array when no semesterId given and no active semester', async () => {
      prisma.semester.findFirst.mockResolvedValue(null);

      const result = await service.findAll({});

      expect(prisma.topic.findMany).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('uses the provided semesterId directly without querying for active semester', async () => {
      prisma.topic.findMany.mockResolvedValue([mockTopic]);

      await service.findAll({ semesterId: 5 });

      expect(prisma.semester.findFirst).not.toHaveBeenCalled();
      expect(prisma.topic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ semesterId: 5 }) }),
      );
    });

    it('applies status filter', async () => {
      prisma.topic.findMany.mockResolvedValue([]);

      await service.findAll({ semesterId: 3, status: TopicStatus.OPEN });

      expect(prisma.topic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: TopicStatus.OPEN }) }),
      );
    });

    it('applies lecturerId filter', async () => {
      prisma.topic.findMany.mockResolvedValue([]);

      await service.findAll({ semesterId: 3, lecturerId: 2 });

      expect(prisma.topic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ lecturerId: 2 }) }),
      );
    });

    it('applies title search filter', async () => {
      prisma.topic.findMany.mockResolvedValue([]);

      await service.findAll({ semesterId: 3, search: 'neural' });

      expect(prisma.topic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            title: { contains: 'neural' },
          }),
        }),
      );
    });

    it('returns mapped topic responses including lecturer info', async () => {
      prisma.topic.findMany.mockResolvedValue([mockTopic]);

      const result = await service.findAll({ semesterId: 3 });

      expect(result).toEqual([topicResponse]);
    });
  });
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
cd backend && pnpm run test -- --testPathPattern=topic.service --verbose
```

Expected: FAIL — `findAll` returns `[]` instead of mapped topics, active semester not queried.

- [ ] **Step 4: Implement `findAll`**

Replace the `findAll` placeholder in `topic.service.ts`:

```typescript
async findAll(query: QueryTopicDto) {
  let effectiveSemesterId = query.semesterId;

  if (!effectiveSemesterId) {
    const active = await this.prisma.semester.findFirst({
      where: { status: SemesterStatus.ACTIVE },
    });
    if (!active) return [];
    effectiveSemesterId = active.id;
  }

  const where: Prisma.TopicWhereInput = { semesterId: effectiveSemesterId };

  if (query.status) where.status = query.status;
  if (query.lecturerId) where.lecturerId = query.lecturerId;
  if (query.search) where.title = { contains: query.search };

  const topics = await this.prisma.topic.findMany({
    where,
    include: this.includeClause,
    orderBy: { createdAt: 'desc' },
  });

  return topics.map((t) => this.toResponse(t));
}
```

- [ ] **Step 5: Run tests and confirm they pass**

```bash
cd backend && pnpm run test -- --testPathPattern=topic.service --verbose
```

Expected: all `findAll` tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/topic/topic.service.ts backend/src/topic/topic.service.spec.ts
git commit -m "feat(topics): implement TopicService.findAll with active-semester default"
```

---

## Task 4: TopicService — findOne

**Files:**
- Modify: `backend/src/topic/topic.service.spec.ts`
- Modify: `backend/src/topic/topic.service.ts`

- [ ] **Step 1: Add findOne tests** (append to the `describe('TopicService')` block)

```typescript
  // ─── findOne ─────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns the topic response when found', async () => {
      prisma.topic.findUnique.mockResolvedValue(mockTopic);

      const result = await service.findOne(1);

      expect(prisma.topic.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: expect.objectContaining({ lecturer: expect.anything() }),
      });
      expect(result).toEqual(topicResponse);
    });

    it('throws NotFoundException when topic does not exist', async () => {
      prisma.topic.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd backend && pnpm run test -- --testPathPattern=topic.service --verbose
```

Expected: findOne tests FAIL.

- [ ] **Step 3: Implement `findOne`**

```typescript
async findOne(id: number) {
  const topic = await this.prisma.topic.findUnique({
    where: { id },
    include: this.includeClause,
  });
  if (!topic) throw new NotFoundException(`Topic #${id} not found`);
  return this.toResponse(topic);
}
```

- [ ] **Step 4: Run and confirm pass**

```bash
cd backend && pnpm run test -- --testPathPattern=topic.service --verbose
```

Expected: all findOne tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/topic/topic.service.ts backend/src/topic/topic.service.spec.ts
git commit -m "feat(topics): implement TopicService.findOne"
```

---

## Task 5: TopicService — create

**Files:**
- Modify: `backend/src/topic/topic.service.spec.ts`
- Modify: `backend/src/topic/topic.service.ts`

- [ ] **Step 1: Add create tests**

```typescript
  // ─── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto = {
      title: 'New Topic',
      description: 'Desc',
      requirements: 'Req',
      note: 'Note',
    };

    it('creates topic in the active semester with the given lecturerId', async () => {
      prisma.semester.findFirst.mockResolvedValue({ id: 3, status: SemesterStatus.ACTIVE });
      prisma.topic.create.mockResolvedValue({ ...mockTopic, ...dto, semesterId: 3, lecturerId: 1 });

      const result = await service.create(dto, 1);

      expect(prisma.semester.findFirst).toHaveBeenCalledWith({
        where: { status: SemesterStatus.ACTIVE },
      });
      expect(prisma.topic.create).toHaveBeenCalledWith({
        data: {
          title: 'New Topic',
          description: 'Desc',
          requirements: 'Req',
          note: 'Note',
          semesterId: 3,
          lecturerId: 1,
        },
        include: expect.objectContaining({ lecturer: expect.anything() }),
      });
      expect(result).toHaveProperty('id');
    });

    it('throws BadRequestException when no active semester exists', async () => {
      prisma.semester.findFirst.mockResolvedValue(null);

      await expect(service.create(dto, 1)).rejects.toThrow(
        new BadRequestException('No active semester found'),
      );
      expect(prisma.topic.create).not.toHaveBeenCalled();
    });

    it('omits undefined optional fields from the create data', async () => {
      prisma.semester.findFirst.mockResolvedValue({ id: 3 });
      prisma.topic.create.mockResolvedValue({
        ...mockTopic,
        title: 'Title Only',
        description: null,
        requirements: null,
        note: null,
        semesterId: 3,
      });

      await service.create({ title: 'Title Only' }, 2);

      expect(prisma.topic.create).toHaveBeenCalledWith({
        data: { title: 'Title Only', semesterId: 3, lecturerId: 2 },
        include: expect.objectContaining({ lecturer: expect.anything() }),
      });
    });
  });
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd backend && pnpm run test -- --testPathPattern=topic.service --verbose
```

Expected: create tests FAIL.

- [ ] **Step 3: Implement `create`**

```typescript
async create(dto: CreateTopicDto, lecturerId: number) {
  const active = await this.prisma.semester.findFirst({
    where: { status: SemesterStatus.ACTIVE },
  });
  if (!active) throw new BadRequestException('No active semester found');

  const topic = await this.prisma.topic.create({
    data: {
      title: dto.title,
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.requirements !== undefined && { requirements: dto.requirements }),
      ...(dto.note !== undefined && { note: dto.note }),
      semesterId: active.id,
      lecturerId,
    },
    include: this.includeClause,
  });

  return this.toResponse(topic);
}
```

- [ ] **Step 4: Run and confirm pass**

```bash
cd backend && pnpm run test -- --testPathPattern=topic.service --verbose
```

Expected: all create tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/topic/topic.service.ts backend/src/topic/topic.service.spec.ts
git commit -m "feat(topics): implement TopicService.create with active-semester guard"
```

---

## Task 6: TopicService — update

**Files:**
- Modify: `backend/src/topic/topic.service.spec.ts`
- Modify: `backend/src/topic/topic.service.ts`

- [ ] **Step 1: Add update tests**

```typescript
  // ─── update ──────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('throws NotFoundException when topic does not exist', async () => {
      prisma.topic.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { title: 'New' }, 1)).rejects.toThrow(NotFoundException);
      expect(prisma.topic.update).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when lecturer does not own the topic', async () => {
      prisma.topic.findUnique.mockResolvedValue({ ...mockTopic, lecturerId: 5 });

      await expect(service.update(1, { title: 'New' }, 1)).rejects.toThrow(ForbiddenException);
      expect(prisma.topic.update).not.toHaveBeenCalled();
    });

    it('updates only provided fields and returns response', async () => {
      prisma.topic.findUnique.mockResolvedValue(mockTopic);
      prisma.topic.update.mockResolvedValue({ ...mockTopic, title: 'Updated Title' });

      const result = await service.update(1, { title: 'Updated Title' }, 1);

      expect(prisma.topic.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { title: 'Updated Title' },
        include: expect.objectContaining({ lecturer: expect.anything() }),
      });
      expect(result.title).toBe('Updated Title');
    });

    it('does not include status in the update data even if status is somehow passed', async () => {
      prisma.topic.findUnique.mockResolvedValue(mockTopic);
      prisma.topic.update.mockResolvedValue({ ...mockTopic, note: 'updated note' });

      await service.update(1, { note: 'updated note' }, 1);

      const callData = prisma.topic.update.mock.calls[0][0].data;
      expect(callData).not.toHaveProperty('status');
    });

    it('throws BadRequestException when no fields are provided', async () => {
      prisma.topic.findUnique.mockResolvedValue(mockTopic);

      await expect(service.update(1, {}, 1)).rejects.toThrow(BadRequestException);
      expect(prisma.topic.update).not.toHaveBeenCalled();
    });
  });
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd backend && pnpm run test -- --testPathPattern=topic.service --verbose
```

Expected: update tests FAIL.

- [ ] **Step 3: Implement `update`**

```typescript
async update(id: number, dto: UpdateTopicDto, lecturerId: number) {
  const topic = await this.prisma.topic.findUnique({ where: { id } });
  if (!topic) throw new NotFoundException(`Topic #${id} not found`);
  if (topic.lecturerId !== lecturerId) throw new ForbiddenException('You do not own this topic');

  const data: Prisma.TopicUpdateInput = {};
  if (dto.title !== undefined) data.title = dto.title;
  if (dto.description !== undefined) data.description = dto.description;
  if (dto.requirements !== undefined) data.requirements = dto.requirements;
  if (dto.note !== undefined) data.note = dto.note;

  if (Object.keys(data).length === 0) {
    throw new BadRequestException('At least one field must be provided');
  }

  const updated = await this.prisma.topic.update({
    where: { id },
    data,
    include: this.includeClause,
  });

  return this.toResponse(updated);
}
```

- [ ] **Step 4: Run and confirm pass**

```bash
cd backend && pnpm run test -- --testPathPattern=topic.service --verbose
```

Expected: all update tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/topic/topic.service.ts backend/src/topic/topic.service.spec.ts
git commit -m "feat(topics): implement TopicService.update with ownership check"
```

---

## Task 7: TopicService — remove

**Files:**
- Modify: `backend/src/topic/topic.service.spec.ts`
- Modify: `backend/src/topic/topic.service.ts`

- [ ] **Step 1: Add remove tests**

```typescript
  // ─── remove ──────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('throws NotFoundException when topic does not exist', async () => {
      prisma.topic.findUnique.mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
      expect(prisma.topic.delete).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when lecturer does not own the topic', async () => {
      prisma.topic.findUnique.mockResolvedValue({ ...mockTopic, lecturerId: 5 });

      await expect(service.remove(1, 1)).rejects.toThrow(ForbiddenException);
      expect(prisma.topic.delete).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when topic has theses assigned', async () => {
      prisma.topic.findUnique.mockResolvedValue(mockTopic);
      prisma.thesis.count.mockResolvedValue(2);

      await expect(service.remove(1, 1)).rejects.toThrow(
        new BadRequestException('Cannot delete a topic with assigned theses'),
      );
      expect(prisma.topic.delete).not.toHaveBeenCalled();
    });

    it('deletes the topic when owned and no theses assigned', async () => {
      prisma.topic.findUnique.mockResolvedValue(mockTopic);
      prisma.thesis.count.mockResolvedValue(0);
      prisma.topic.delete.mockResolvedValue(mockTopic);

      await service.remove(1, 1);

      expect(prisma.topic.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd backend && pnpm run test -- --testPathPattern=topic.service --verbose
```

Expected: remove tests FAIL.

- [ ] **Step 3: Implement `remove`**

```typescript
async remove(id: number, lecturerId: number): Promise<void> {
  const topic = await this.prisma.topic.findUnique({ where: { id } });
  if (!topic) throw new NotFoundException(`Topic #${id} not found`);
  if (topic.lecturerId !== lecturerId) throw new ForbiddenException('You do not own this topic');

  const thesisCount = await this.prisma.thesis.count({ where: { topicId: id } });
  if (thesisCount > 0) throw new BadRequestException('Cannot delete a topic with assigned theses');

  await this.prisma.topic.delete({ where: { id } });
}
```

- [ ] **Step 4: Run full test suite and confirm all pass**

```bash
cd backend && pnpm run test -- --testPathPattern=topic.service --verbose
```

Expected: ALL TopicService tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/topic/topic.service.ts backend/src/topic/topic.service.spec.ts
git commit -m "feat(topics): implement TopicService.remove with ownership and thesis guard"
```

---

## Task 8: TopicController + TopicModule + Register in AppModule

**Files:**
- Create: `backend/src/topic/topic.controller.ts`
- Create: `backend/src/topic/topic.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Create the controller**

```typescript
// backend/src/topic/topic.controller.ts
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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TopicService } from './topic.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { QueryTopicDto } from './dto/query-topic.dto';

type AuthUser = { lecturer: { id: number } | null };

@Controller('topics')
export class TopicController {
  constructor(private readonly topicService: TopicService) {}

  @Get()
  findAll(@Query() query: QueryTopicDto) {
    return this.topicService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.topicService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.LECTURER)
  create(@Body() dto: CreateTopicDto, @CurrentUser() user: AuthUser) {
    return this.topicService.create(dto, user.lecturer!.id);
  }

  @Patch(':id')
  @Roles(Role.LECTURER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTopicDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.topicService.update(id, dto, user.lecturer!.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.LECTURER)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.topicService.remove(id, user.lecturer!.id);
  }
}
```

**Note on route ordering:** `GET :id` after `GET /` only — no static sub-resource routes in this controller, so no ordering conflicts. `PATCH :id` and `DELETE :id` also have no conflicts.

- [ ] **Step 2: Create the module**

```typescript
// backend/src/topic/topic.module.ts
import { Module } from '@nestjs/common';
import { TopicController } from './topic.controller';
import { TopicService } from './topic.service';

@Module({
  controllers: [TopicController],
  providers: [TopicService],
})
export class TopicModule {}
```

- [ ] **Step 3: Register in AppModule**

In `backend/src/app.module.ts`, add `TopicModule` to the imports array:

```typescript
import { TopicModule } from './topic/topic.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    SemesterModule,
    StudentModule,
    EnrollmentModule,
    LecturerModule,
    TopicModule,   // ← add this
  ],
  // ... rest unchanged
})
```

- [ ] **Step 4: Build to confirm no TypeScript errors**

```bash
cd backend && pnpm run build
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add backend/src/topic/
git add backend/src/app.module.ts
git commit -m "feat(topics): add TopicController, TopicModule, register in AppModule"
```

---

## Task 8.5: Extend Auth Profile to Include Lecturer/Student Relation

**Files:**
- Modify: `backend/src/auth/auth.service.ts`

The frontend needs `lecturer.id` to filter "My Topics" and `lecturer.maxStudents` to display the capacity counter. The current `buildProfile()` strips the relation down to just `email`. Extend it to include the full relation fields the frontend needs.

- [ ] **Step 1: Update `buildProfile` in auth.service.ts**

Replace the existing `buildProfile` method:

```typescript
private buildProfile(user: UserWithRelations) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    fullName: user.lecturer?.fullName ?? user.student?.fullName ?? null,
    email: user.lecturer?.email ?? user.student?.email ?? null,
    lecturer: user.lecturer
      ? { id: user.lecturer.id, maxStudents: user.lecturer.maxStudents }
      : null,
    student: user.student ? { id: user.student.id } : null,
  };
}
```

This affects both `POST /auth/login` and `GET /auth/me` since both call `buildProfile`. The frontend `UserProfile` type is updated in Task 0 of the frontend plan.

- [ ] **Step 2: Build to confirm no TypeScript errors**

```bash
cd backend && pnpm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/auth/auth.service.ts
git commit -m "feat(auth): include lecturer and student ids in auth profile response"
```

---

## Task 9: API Verification

Start the backend and verify all endpoints with curl. Replace `<TOKEN>` with a valid JWT from a lecturer login.

- [ ] **Step 1: Start backend**

```bash
cd backend && pnpm run start:dev
```

- [ ] **Step 2: List topics (defaults to active semester)**

```bash
curl -s http://localhost:3000/topics \
  -H "Authorization: Bearer <LECTURER_TOKEN>" | jq .
```

Expected: array of topics for the active semester (or `[]` if none).

- [ ] **Step 3: Create a topic**

```bash
curl -s -X POST http://localhost:3000/topics \
  -H "Authorization: Bearer <LECTURER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Topic","description":"A test","requirements":"Req","note":"Note"}' | jq .
```

Expected: `201` with the created topic including `lecturer` object.

- [ ] **Step 4: Get topic by id**

```bash
curl -s http://localhost:3000/topics/1 \
  -H "Authorization: Bearer <LECTURER_TOKEN>" | jq .
```

Expected: `200` with full topic.

- [ ] **Step 5: Update topic**

```bash
curl -s -X PATCH http://localhost:3000/topics/1 \
  -H "Authorization: Bearer <LECTURER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"note":"Updated note"}' | jq .
```

Expected: `200` with updated topic.

- [ ] **Step 6: Test ownership guard — update another lecturer's topic**

```bash
curl -s -X PATCH http://localhost:3000/topics/<OTHER_LECTURERS_TOPIC_ID> \
  -H "Authorization: Bearer <LECTURER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"note":"Hacking"}' | jq .
```

Expected: `403 Forbidden`.

- [ ] **Step 7: Test role guard — student trying to create**

```bash
curl -s -X POST http://localhost:3000/topics \
  -H "Authorization: Bearer <STUDENT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Student Topic"}' | jq .
```

Expected: `403 Forbidden`.

- [ ] **Step 8: Delete topic**

```bash
curl -s -X DELETE http://localhost:3000/topics/1 \
  -H "Authorization: Bearer <LECTURER_TOKEN>" -v
```

Expected: `204 No Content`.

- [ ] **Step 9: Verify GET /semesters works for non-admin**

```bash
curl -s http://localhost:3000/semesters \
  -H "Authorization: Bearer <LECTURER_TOKEN>" | jq .
```

Expected: `200` with semester list (previously would have been `403`).
