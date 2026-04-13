# Semester Management — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the backend NestJS module for admin semester management — full CRUD plus activate/deactivate/close status transitions.

**Architecture:** A standard NestJS feature module (`SemesterModule`) with DTOs, a service containing all business logic, and a controller wiring HTTP routes to service methods. All endpoints require the `ADMIN` role via the existing global `RolesGuard`. No schema changes needed — `Semester` model and `SemesterStatus` enum already exist.

**Tech Stack:** NestJS 11, Prisma 6 (MySQL), class-validator, `@nestjs/mapped-types`, TypeScript.

---

## File Map

| Action | Path |
|--------|------|
| Create | `backend/src/semester/dto/create-semester.dto.ts` |
| Create | `backend/src/semester/dto/update-semester.dto.ts` |
| Create | `backend/src/semester/dto/query-semester.dto.ts` |
| Create | `backend/src/semester/semester.service.ts` |
| Create | `backend/src/semester/semester.service.spec.ts` |
| Create | `backend/src/semester/semester.controller.ts` |
| Create | `backend/src/semester/semester.controller.spec.ts` |
| Create | `backend/src/semester/semester.module.ts` |
| Modify | `backend/src/app.module.ts` |

---

## Task 1: DTOs

**Files:**
- Create: `backend/src/semester/dto/create-semester.dto.ts`
- Create: `backend/src/semester/dto/update-semester.dto.ts`
- Create: `backend/src/semester/dto/query-semester.dto.ts`

- [ ] **Step 1: Create `create-semester.dto.ts`**

```typescript
// backend/src/semester/dto/create-semester.dto.ts
import { IsString, IsNotEmpty, IsDateString } from 'class-validator';

export class CreateSemesterDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
```

- [ ] **Step 2: Create `update-semester.dto.ts`**

```typescript
// backend/src/semester/dto/update-semester.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateSemesterDto } from './create-semester.dto';

export class UpdateSemesterDto extends PartialType(CreateSemesterDto) {}
```

- [ ] **Step 3: Create `query-semester.dto.ts`**

```typescript
// backend/src/semester/dto/query-semester.dto.ts
import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { SemesterStatus } from '@prisma/client';

export class QuerySemesterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(SemesterStatus)
  status?: SemesterStatus;

  @IsOptional()
  @IsDateString()
  startDateFrom?: string;

  @IsOptional()
  @IsDateString()
  startDateTo?: string;
}
```

- [ ] **Step 4: Commit**

```bash
cd backend
git add src/semester/dto/
git commit -m "Add semester DTOs (create, update, query)"
```

---

## Task 2: Service — CRUD (TDD)

**Files:**
- Create: `backend/src/semester/semester.service.spec.ts` (CRUD tests)
- Create: `backend/src/semester/semester.service.ts` (CRUD methods)

- [ ] **Step 1: Write failing tests for CRUD methods**

```typescript
// backend/src/semester/semester.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { SemesterStatus, Prisma } from '@prisma/client';
import { SemesterService } from './semester.service';
import { PrismaService } from '../prisma/prisma.service';

const mockSemester = {
  id: 1,
  code: 'HK1-2025',
  name: 'Học kỳ 1 năm 2025-2026',
  startDate: new Date('2025-09-01'),
  endDate: new Date('2026-01-15'),
  status: SemesterStatus.INACTIVE,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('SemesterService', () => {
  let service: SemesterService;
  let prisma: {
    semester: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    semesterStudent: { count: jest.Mock };
    topic: { count: jest.Mock };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SemesterService,
        {
          provide: PrismaService,
          useValue: {
            semester: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            semesterStudent: { count: jest.fn() },
            topic: { count: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<SemesterService>(SemesterService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns all semesters when no filters', async () => {
      prisma.semester.findMany.mockResolvedValue([mockSemester]);

      const result = await service.findAll({});

      expect(prisma.semester.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([mockSemester]);
    });

    it('filters by search term on name and code', async () => {
      prisma.semester.findMany.mockResolvedValue([mockSemester]);

      await service.findAll({ search: 'HK1' });

      expect(prisma.semester.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'HK1' } },
            { code: { contains: 'HK1' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('filters by status', async () => {
      prisma.semester.findMany.mockResolvedValue([mockSemester]);

      await service.findAll({ status: SemesterStatus.ACTIVE });

      expect(prisma.semester.findMany).toHaveBeenCalledWith({
        where: { status: SemesterStatus.ACTIVE },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('filters by startDateFrom and startDateTo', async () => {
      prisma.semester.findMany.mockResolvedValue([mockSemester]);

      await service.findAll({
        startDateFrom: '2025-01-01',
        startDateTo: '2025-12-31',
      });

      expect(prisma.semester.findMany).toHaveBeenCalledWith({
        where: {
          startDate: {
            gte: new Date('2025-01-01'),
            lte: new Date('2025-12-31'),
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  // ─── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns the semester when found', async () => {
      prisma.semester.findUnique.mockResolvedValue(mockSemester);

      const result = await service.findOne(1);

      expect(result).toEqual(mockSemester);
    });

    it('throws NotFoundException when semester does not exist', async () => {
      prisma.semester.findUnique.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(
        new NotFoundException('Semester #99 not found'),
      );
    });
  });

  // ─── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto = {
      code: 'HK1-2025',
      name: 'Học kỳ 1',
      startDate: '2025-09-01',
      endDate: '2026-01-15',
    };

    it('creates a semester with INACTIVE status', async () => {
      prisma.semester.create.mockResolvedValue(mockSemester);

      const result = await service.create(dto);

      expect(prisma.semester.create).toHaveBeenCalledWith({
        data: {
          code: 'HK1-2025',
          name: 'Học kỳ 1',
          startDate: new Date('2025-09-01'),
          endDate: new Date('2026-01-15'),
        },
      });
      expect(result).toEqual(mockSemester);
    });

    it('throws BadRequestException when endDate is not after startDate', async () => {
      await expect(
        service.create({ ...dto, endDate: '2025-09-01' }),
      ).rejects.toThrow(new BadRequestException('endDate must be after startDate'));
    });

    it('throws ConflictException on duplicate code (Prisma P2002)', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '6.0.0',
      });
      prisma.semester.create.mockRejectedValue(prismaError);

      await expect(service.create(dto)).rejects.toThrow(
        new ConflictException("Semester code 'HK1-2025' already exists"),
      );
    });
  });

  // ─── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates an INACTIVE semester', async () => {
      prisma.semester.findUnique.mockResolvedValue(mockSemester);
      prisma.semester.update.mockResolvedValue({ ...mockSemester, name: 'Updated' });

      const result = await service.update(1, { name: 'Updated' });

      expect(prisma.semester.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Updated' },
      });
      expect(result.name).toBe('Updated');
    });

    it('throws ConflictException when semester is ACTIVE', async () => {
      prisma.semester.findUnique.mockResolvedValue({
        ...mockSemester,
        status: SemesterStatus.ACTIVE,
      });

      await expect(service.update(1, { name: 'x' })).rejects.toThrow(
        new ConflictException('Only INACTIVE semesters can be edited'),
      );
    });

    it('throws ConflictException when semester is CLOSED', async () => {
      prisma.semester.findUnique.mockResolvedValue({
        ...mockSemester,
        status: SemesterStatus.CLOSED,
      });

      await expect(service.update(1, { name: 'x' })).rejects.toThrow(
        new ConflictException('Only INACTIVE semesters can be edited'),
      );
    });

    it('throws BadRequestException when updated dates result in endDate <= startDate', async () => {
      prisma.semester.findUnique.mockResolvedValue(mockSemester);

      await expect(
        service.update(1, { endDate: '2025-08-31' }),
      ).rejects.toThrow(new BadRequestException('endDate must be after startDate'));
    });

    it('throws ConflictException on duplicate code (Prisma P2002)', async () => {
      prisma.semester.findUnique.mockResolvedValue(mockSemester);
      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '6.0.0',
      });
      prisma.semester.update.mockRejectedValue(prismaError);

      await expect(service.update(1, { code: 'DUPLICATE' })).rejects.toThrow(
        new ConflictException("Semester code 'DUPLICATE' already exists"),
      );
    });
  });

  // ─── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('deletes an INACTIVE semester with no linked data', async () => {
      prisma.semester.findUnique.mockResolvedValue(mockSemester);
      prisma.semesterStudent.count.mockResolvedValue(0);
      prisma.topic.count.mockResolvedValue(0);
      prisma.semester.delete.mockResolvedValue(mockSemester);

      const result = await service.remove(1);

      expect(prisma.semester.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(mockSemester);
    });

    it('throws ConflictException when semester is not INACTIVE', async () => {
      prisma.semester.findUnique.mockResolvedValue({
        ...mockSemester,
        status: SemesterStatus.ACTIVE,
      });

      await expect(service.remove(1)).rejects.toThrow(
        new ConflictException('Only INACTIVE semesters can be deleted'),
      );
    });

    it('throws ConflictException when semester has linked students', async () => {
      prisma.semester.findUnique.mockResolvedValue(mockSemester);
      prisma.semesterStudent.count.mockResolvedValue(3);
      prisma.topic.count.mockResolvedValue(0);

      await expect(service.remove(1)).rejects.toThrow(
        new ConflictException(
          'Cannot delete a semester with associated students or topics',
        ),
      );
    });

    it('throws ConflictException when semester has linked topics', async () => {
      prisma.semester.findUnique.mockResolvedValue(mockSemester);
      prisma.semesterStudent.count.mockResolvedValue(0);
      prisma.topic.count.mockResolvedValue(2);

      await expect(service.remove(1)).rejects.toThrow(
        new ConflictException(
          'Cannot delete a semester with associated students or topics',
        ),
      );
    });
  });
});
```

- [ ] **Step 2: Run tests to confirm they all fail**

```bash
cd backend
pnpm run test -- --testPathPattern=semester.service
```

Expected: multiple failures — `SemesterService` does not exist yet.

- [ ] **Step 3: Create `semester.service.ts` with CRUD methods**

```typescript
// backend/src/semester/semester.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, SemesterStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSemesterDto } from './dto/create-semester.dto';
import { UpdateSemesterDto } from './dto/update-semester.dto';
import { QuerySemesterDto } from './dto/query-semester.dto';

@Injectable()
export class SemesterService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QuerySemesterDto) {
    const { search, status, startDateFrom, startDateTo } = query;
    const where: Prisma.SemesterWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (startDateFrom || startDateTo) {
      where.startDate = {};
      if (startDateFrom) where.startDate.gte = new Date(startDateFrom);
      if (startDateTo) where.startDate.lte = new Date(startDateTo);
    }

    return this.prisma.semester.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const semester = await this.prisma.semester.findUnique({ where: { id } });
    if (!semester) throw new NotFoundException(`Semester #${id} not found`);
    return semester;
  }

  async create(dto: CreateSemesterDto) {
    if (new Date(dto.endDate) <= new Date(dto.startDate)) {
      throw new BadRequestException('endDate must be after startDate');
    }

    try {
      return await this.prisma.semester.create({
        data: {
          code: dto.code,
          name: dto.name,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          `Semester code '${dto.code}' already exists`,
        );
      }
      throw e;
    }
  }

  async update(id: number, dto: UpdateSemesterDto) {
    const semester = await this.findOne(id);

    if (semester.status !== SemesterStatus.INACTIVE) {
      throw new ConflictException('Only INACTIVE semesters can be edited');
    }

    const startDate = dto.startDate
      ? new Date(dto.startDate)
      : semester.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : semester.endDate;

    if (endDate <= startDate) {
      throw new BadRequestException('endDate must be after startDate');
    }

    try {
      return await this.prisma.semester.update({
        where: { id },
        data: {
          ...(dto.code !== undefined && { code: dto.code }),
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.startDate !== undefined && {
            startDate: new Date(dto.startDate),
          }),
          ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          `Semester code '${dto.code}' already exists`,
        );
      }
      throw e;
    }
  }

  async remove(id: number) {
    const semester = await this.findOne(id);

    if (semester.status !== SemesterStatus.INACTIVE) {
      throw new ConflictException('Only INACTIVE semesters can be deleted');
    }

    const [studentCount, topicCount] = await Promise.all([
      this.prisma.semesterStudent.count({ where: { semesterId: id } }),
      this.prisma.topic.count({ where: { semesterId: id } }),
    ]);

    if (studentCount > 0 || topicCount > 0) {
      throw new ConflictException(
        'Cannot delete a semester with associated students or topics',
      );
    }

    return this.prisma.semester.delete({ where: { id } });
  }
}
```

- [ ] **Step 4: Run CRUD tests — confirm they pass**

```bash
cd backend
pnpm run test -- --testPathPattern=semester.service
```

Expected: all CRUD describe blocks pass.

- [ ] **Step 5: Commit**

```bash
git add src/semester/semester.service.ts src/semester/semester.service.spec.ts
git commit -m "Add SemesterService CRUD methods with tests"
```

---

## Task 3: Service — Status Transitions (TDD)

**Files:**
- Modify: `backend/src/semester/semester.service.spec.ts` (add transition tests)
- Modify: `backend/src/semester/semester.service.ts` (add transition methods)

- [ ] **Step 1: Append transition tests to `semester.service.spec.ts`**

Add the following `describe` blocks inside the existing `describe('SemesterService', ...)` block, after the `remove` block:

```typescript
  // ─── activate ───────────────────────────────────────────────────────────────

  describe('activate', () => {
    it('transitions INACTIVE semester to ACTIVE when no other is active', async () => {
      prisma.semester.findUnique.mockResolvedValue(mockSemester);
      prisma.semester.findFirst.mockResolvedValue(null);
      prisma.semester.update.mockResolvedValue({
        ...mockSemester,
        status: SemesterStatus.ACTIVE,
      });

      const result = await service.activate(1);

      expect(prisma.semester.findFirst).toHaveBeenCalledWith({
        where: { status: SemesterStatus.ACTIVE },
      });
      expect(prisma.semester.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: SemesterStatus.ACTIVE },
      });
      expect(result.status).toBe(SemesterStatus.ACTIVE);
    });

    it('throws ConflictException when another semester is already ACTIVE', async () => {
      prisma.semester.findUnique.mockResolvedValue(mockSemester);
      prisma.semester.findFirst.mockResolvedValue({
        ...mockSemester,
        id: 2,
        status: SemesterStatus.ACTIVE,
      });

      await expect(service.activate(1)).rejects.toThrow(
        new ConflictException('Another semester is already active'),
      );
    });

    it('throws ConflictException when semester is not INACTIVE', async () => {
      prisma.semester.findUnique.mockResolvedValue({
        ...mockSemester,
        status: SemesterStatus.CLOSED,
      });

      await expect(service.activate(1)).rejects.toThrow(
        new ConflictException('Only INACTIVE semesters can be activated'),
      );
    });

    it('throws NotFoundException when semester does not exist', async () => {
      prisma.semester.findUnique.mockResolvedValue(null);

      await expect(service.activate(99)).rejects.toThrow(
        new NotFoundException('Semester #99 not found'),
      );
    });
  });

  // ─── deactivate ─────────────────────────────────────────────────────────────

  describe('deactivate', () => {
    it('transitions ACTIVE semester to INACTIVE', async () => {
      prisma.semester.findUnique.mockResolvedValue({
        ...mockSemester,
        status: SemesterStatus.ACTIVE,
      });
      prisma.semester.update.mockResolvedValue(mockSemester);

      const result = await service.deactivate(1);

      expect(prisma.semester.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: SemesterStatus.INACTIVE },
      });
      expect(result.status).toBe(SemesterStatus.INACTIVE);
    });

    it('throws ConflictException when semester is not ACTIVE', async () => {
      prisma.semester.findUnique.mockResolvedValue(mockSemester); // INACTIVE

      await expect(service.deactivate(1)).rejects.toThrow(
        new ConflictException('Only ACTIVE semesters can be deactivated'),
      );
    });

    it('throws NotFoundException when semester does not exist', async () => {
      prisma.semester.findUnique.mockResolvedValue(null);

      await expect(service.deactivate(99)).rejects.toThrow(
        new NotFoundException('Semester #99 not found'),
      );
    });
  });

  // ─── close ──────────────────────────────────────────────────────────────────

  describe('close', () => {
    it('transitions ACTIVE semester to CLOSED', async () => {
      prisma.semester.findUnique.mockResolvedValue({
        ...mockSemester,
        status: SemesterStatus.ACTIVE,
      });
      prisma.semester.update.mockResolvedValue({
        ...mockSemester,
        status: SemesterStatus.CLOSED,
      });

      const result = await service.close(1);

      expect(prisma.semester.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: SemesterStatus.CLOSED },
      });
      expect(result.status).toBe(SemesterStatus.CLOSED);
    });

    it('throws ConflictException when semester is not ACTIVE', async () => {
      prisma.semester.findUnique.mockResolvedValue(mockSemester); // INACTIVE

      await expect(service.close(1)).rejects.toThrow(
        new ConflictException('Only ACTIVE semesters can be closed'),
      );
    });

    it('throws NotFoundException when semester does not exist', async () => {
      prisma.semester.findUnique.mockResolvedValue(null);

      await expect(service.close(99)).rejects.toThrow(
        new NotFoundException('Semester #99 not found'),
      );
    });
  });
```

- [ ] **Step 2: Run tests — confirm transition tests fail**

```bash
cd backend
pnpm run test -- --testPathPattern=semester.service
```

Expected: activate/deactivate/close tests fail — methods not implemented yet.

- [ ] **Step 3: Add transition methods to `semester.service.ts`**

Append these three methods inside the `SemesterService` class, after `remove`:

```typescript
  async activate(id: number) {
    const semester = await this.findOne(id);

    if (semester.status !== SemesterStatus.INACTIVE) {
      throw new ConflictException('Only INACTIVE semesters can be activated');
    }

    const activeSemester = await this.prisma.semester.findFirst({
      where: { status: SemesterStatus.ACTIVE },
    });

    if (activeSemester) {
      throw new ConflictException('Another semester is already active');
    }

    return this.prisma.semester.update({
      where: { id },
      data: { status: SemesterStatus.ACTIVE },
    });
  }

  async deactivate(id: number) {
    const semester = await this.findOne(id);

    if (semester.status !== SemesterStatus.ACTIVE) {
      throw new ConflictException('Only ACTIVE semesters can be deactivated');
    }

    return this.prisma.semester.update({
      where: { id },
      data: { status: SemesterStatus.INACTIVE },
    });
  }

  async close(id: number) {
    const semester = await this.findOne(id);

    if (semester.status !== SemesterStatus.ACTIVE) {
      throw new ConflictException('Only ACTIVE semesters can be closed');
    }

    return this.prisma.semester.update({
      where: { id },
      data: { status: SemesterStatus.CLOSED },
    });
  }
```

- [ ] **Step 4: Run all service tests — confirm everything passes**

```bash
cd backend
pnpm run test -- --testPathPattern=semester.service
```

Expected: all tests pass (CRUD + transitions).

- [ ] **Step 5: Commit**

```bash
git add src/semester/semester.service.ts src/semester/semester.service.spec.ts
git commit -m "Add SemesterService status transition methods with tests"
```

---

## Task 4: Controller + Spec

**Files:**
- Create: `backend/src/semester/semester.controller.ts`
- Create: `backend/src/semester/semester.controller.spec.ts`

- [ ] **Step 1: Create `semester.controller.ts`**

```typescript
// backend/src/semester/semester.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { SemesterService } from './semester.service';
import { CreateSemesterDto } from './dto/create-semester.dto';
import { UpdateSemesterDto } from './dto/update-semester.dto';
import { QuerySemesterDto } from './dto/query-semester.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('semesters')
@Roles(Role.ADMIN)
export class SemesterController {
  constructor(private readonly semesterService: SemesterService) {}

  @Get()
  findAll(@Query() query: QuerySemesterDto) {
    return this.semesterService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.semesterService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateSemesterDto) {
    return this.semesterService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSemesterDto,
  ) {
    return this.semesterService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.semesterService.remove(id);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.semesterService.activate(id);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.semesterService.deactivate(id);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  close(@Param('id', ParseIntPipe) id: number) {
    return this.semesterService.close(id);
  }
}
```

- [ ] **Step 2: Create `semester.controller.spec.ts`**

```typescript
// backend/src/semester/semester.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { SemesterStatus } from '@prisma/client';
import { SemesterController } from './semester.controller';
import { SemesterService } from './semester.service';

const mockSemester = {
  id: 1,
  code: 'HK1-2025',
  name: 'Học kỳ 1 năm 2025-2026',
  startDate: new Date('2025-09-01'),
  endDate: new Date('2026-01-15'),
  status: SemesterStatus.INACTIVE,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('SemesterController', () => {
  let controller: SemesterController;
  let service: jest.Mocked<SemesterService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SemesterController],
      providers: [
        {
          provide: SemesterService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            activate: jest.fn(),
            deactivate: jest.fn(),
            close: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SemesterController>(SemesterController);
    service = module.get(SemesterService);
  });

  afterEach(() => jest.clearAllMocks());

  it('findAll delegates to service with query', async () => {
    service.findAll.mockResolvedValue([mockSemester]);
    const result = await controller.findAll({ status: SemesterStatus.ACTIVE });
    expect(service.findAll).toHaveBeenCalledWith({ status: SemesterStatus.ACTIVE });
    expect(result).toEqual([mockSemester]);
  });

  it('findOne delegates to service with parsed id', async () => {
    service.findOne.mockResolvedValue(mockSemester);
    const result = await controller.findOne(1);
    expect(service.findOne).toHaveBeenCalledWith(1);
    expect(result).toEqual(mockSemester);
  });

  it('create delegates to service with dto', async () => {
    service.create.mockResolvedValue(mockSemester);
    const dto = {
      code: 'HK1-2025',
      name: 'Học kỳ 1',
      startDate: '2025-09-01',
      endDate: '2026-01-15',
    };
    const result = await controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual(mockSemester);
  });

  it('update delegates to service with id and dto', async () => {
    service.update.mockResolvedValue(mockSemester);
    const result = await controller.update(1, { name: 'Updated' });
    expect(service.update).toHaveBeenCalledWith(1, { name: 'Updated' });
    expect(result).toEqual(mockSemester);
  });

  it('remove delegates to service with id', async () => {
    service.remove.mockResolvedValue(mockSemester);
    const result = await controller.remove(1);
    expect(service.remove).toHaveBeenCalledWith(1);
    expect(result).toEqual(mockSemester);
  });

  it('activate delegates to service with id', async () => {
    service.activate.mockResolvedValue({
      ...mockSemester,
      status: SemesterStatus.ACTIVE,
    });
    const result = await controller.activate(1);
    expect(service.activate).toHaveBeenCalledWith(1);
    expect(result.status).toBe(SemesterStatus.ACTIVE);
  });

  it('deactivate delegates to service with id', async () => {
    service.deactivate.mockResolvedValue(mockSemester);
    const result = await controller.deactivate(1);
    expect(service.deactivate).toHaveBeenCalledWith(1);
    expect(result).toEqual(mockSemester);
  });

  it('close delegates to service with id', async () => {
    service.close.mockResolvedValue({
      ...mockSemester,
      status: SemesterStatus.CLOSED,
    });
    const result = await controller.close(1);
    expect(service.close).toHaveBeenCalledWith(1);
    expect(result.status).toBe(SemesterStatus.CLOSED);
  });
});
```

- [ ] **Step 3: Run controller tests**

```bash
cd backend
pnpm run test -- --testPathPattern=semester.controller
```

Expected: all 8 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/semester/semester.controller.ts src/semester/semester.controller.spec.ts
git commit -m "Add SemesterController with spec"
```

---

## Task 5: Module + Wire Up

**Files:**
- Create: `backend/src/semester/semester.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Create `semester.module.ts`**

```typescript
// backend/src/semester/semester.module.ts
import { Module } from '@nestjs/common';
import { SemesterService } from './semester.service';
import { SemesterController } from './semester.controller';

@Module({
  controllers: [SemesterController],
  providers: [SemesterService],
})
export class SemesterModule {}
```

- [ ] **Step 2: Register `SemesterModule` in `app.module.ts`**

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
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    SemesterModule,
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

- [ ] **Step 3: Run all tests to confirm nothing is broken**

```bash
cd backend
pnpm run test
```

Expected: all tests pass.

- [ ] **Step 4: Start the dev server and confirm it boots**

```bash
cd backend
pnpm run start:dev
```

Expected: server starts on port 3000 with no errors. Look for `[NestApplication] Nest application successfully started`.

- [ ] **Step 5: Commit**

```bash
git add src/semester/semester.module.ts src/app.module.ts
git commit -m "Register SemesterModule in AppModule"
```

---

## Verification Checklist (for Postman)

After the server is running, verify each endpoint with an ADMIN JWT token:

| # | Method | URL | Body / Params | Expected |
|---|--------|-----|---------------|----------|
| 1 | POST | `/semesters` | `{ code, name, startDate, endDate }` | `201` with INACTIVE semester |
| 2 | POST | `/semesters` | same `code` again | `409` duplicate code |
| 3 | POST | `/semesters` | `endDate` ≤ `startDate` | `400` bad request |
| 4 | GET | `/semesters` | — | `200` array |
| 5 | GET | `/semesters?search=HK1` | — | `200` filtered |
| 6 | GET | `/semesters?status=INACTIVE` | — | `200` filtered |
| 7 | GET | `/semesters?startDateFrom=2025-01-01&startDateTo=2025-12-31` | — | `200` filtered |
| 8 | GET | `/semesters/:id` | — | `200` single semester |
| 9 | GET | `/semesters/999` | — | `404` not found |
| 10 | PATCH | `/semesters/:id` | `{ name: "Updated" }` | `200` updated |
| 11 | POST | `/semesters/:id/activate` | — | `200` ACTIVE |
| 12 | POST | `/semesters/:id/activate` | (second semester) | `409` another active |
| 13 | PATCH | `/semesters/:id` (ACTIVE) | `{ name: "x" }` | `409` read-only |
| 14 | POST | `/semesters/:id/deactivate` | — | `200` INACTIVE |
| 15 | POST | `/semesters/:id/activate` | — | `200` ACTIVE again |
| 16 | POST | `/semesters/:id/close` | — | `200` CLOSED |
| 17 | POST | `/semesters/:id/activate` | (CLOSED semester) | `409` wrong status |
| 18 | DELETE | `/semesters/:id` (INACTIVE, no data) | — | `200` deleted |
| 19 | DELETE | `/semesters/:id` (ACTIVE) | — | `409` wrong status |
