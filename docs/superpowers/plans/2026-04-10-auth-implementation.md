# Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement JWT authentication (login, refresh, logout, /me) with role-based access control for the NestJS backend.

**Architecture:** Global JWT guard protects all routes by default; `@Public()` decorator opts out. Access tokens (30 min) are JWTs; refresh tokens are UUIDs wrapped in JWTs and stored hashed in the `users` table. `AuthService` handles all token logic; `JwtStrategy` (Passport) validates tokens and hydrates `request.user` with the full DB user on each request.

**Tech Stack:** `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `bcrypt`, `@nestjs/config`, `class-validator`, `class-transformer`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `backend/.env` | Modify | Add JWT env vars |
| `backend/prisma/schema.prisma` | Modify | Add `refreshToken` field to User |
| `backend/src/main.ts` | Modify | Add global ValidationPipe |
| `backend/src/app.module.ts` | Modify | Add ConfigModule, AuthModule, global guards |
| `backend/src/auth/dto/login.dto.ts` | Create | Login request body DTO |
| `backend/src/auth/dto/refresh.dto.ts` | Create | Refresh request body DTO |
| `backend/src/auth/decorators/public.decorator.ts` | Create | `@Public()` — bypasses JWT guard |
| `backend/src/auth/decorators/roles.decorator.ts` | Create | `@Roles()` — restricts by role |
| `backend/src/auth/decorators/current-user.decorator.ts` | Create | `@CurrentUser()` — extracts request.user |
| `backend/src/auth/strategies/jwt.strategy.ts` | Create | Passport JWT strategy — validates token, hydrates request.user |
| `backend/src/auth/guards/jwt-auth.guard.ts` | Create | Extends AuthGuard('jwt'), checks @Public() |
| `backend/src/auth/guards/roles.guard.ts` | Create | Checks @Roles() against request.user.role |
| `backend/src/auth/auth.service.ts` | Create | login, refresh, logout, getMe, token generation |
| `backend/src/auth/auth.service.spec.ts` | Create | Unit tests for AuthService |
| `backend/src/auth/auth.controller.ts` | Create | POST /auth/login, /auth/refresh, /auth/logout, GET /auth/me |
| `backend/src/auth/auth.controller.spec.ts` | Create | Unit tests for AuthController |
| `backend/src/auth/auth.module.ts` | Create | Wires AuthService, JwtStrategy, JwtModule, PassportModule |

---

## Task 1: Install dependencies

**Files:** none (just installs packages)

- [ ] **Step 1: Install backend auth packages**

```bash
cd backend
pnpm add @nestjs/config @nestjs/passport @nestjs/jwt passport passport-jwt bcrypt class-validator class-transformer
pnpm add -D @types/passport-jwt @types/bcrypt
```

Expected output: packages added with no errors.

- [ ] **Step 2: Verify type-check still passes**

```bash
cd backend
npx tsc --noEmit
```

Expected: no output (clean compile).

---

## Task 2: Schema — add refreshToken field

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add `refreshToken` field to the User model**

Find the `model User` block and add the field after `updatedAt`:

```prisma
model User {
  id           Int      @id @default(autoincrement())
  username     String   @unique
  passwordHash String   @map("password_hash")
  role         Role
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  refreshToken String?  @map("refresh_token") @db.Text

  lecturer Lecturer?
  student  Student?

  adminReviewedDocuments Document[] @relation("AdminReviewer")
  notifications          Notification[]

  @@map("users")
}
```

- [ ] **Step 2: Run migration**

```bash
cd backend
npx prisma migrate dev --name add-refresh-token-to-user
```

Expected output:
```
Applying migration `..._add-refresh-token-to-user`
Your database is now in sync with your schema.
```

- [ ] **Step 3: Regenerate Prisma client**

```bash
cd backend
npx prisma generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 4: Verify type-check**

```bash
cd backend
npx tsc --noEmit
```

Expected: no output.

---

## Task 3: Add JWT env vars

**Files:**
- Modify: `backend/.env`

- [ ] **Step 1: Add JWT config to .env**

Append to `backend/.env`:

```env
JWT_SECRET=change-this-to-a-long-random-secret-in-production
JWT_EXPIRY=30m
JWT_REFRESH_EXPIRY=7d
```

> **Spring analogy:** This is like `application.properties`. `@nestjs/config` reads it automatically — equivalent to Spring's `@Value("${jwt.secret}")`.

---

## Task 4: DTOs and decorators

**Files:**
- Create: `backend/src/auth/dto/login.dto.ts`
- Create: `backend/src/auth/dto/refresh.dto.ts`
- Create: `backend/src/auth/decorators/public.decorator.ts`
- Create: `backend/src/auth/decorators/roles.decorator.ts`
- Create: `backend/src/auth/decorators/current-user.decorator.ts`

- [ ] **Step 1: Create `login.dto.ts`**

```typescript
// backend/src/auth/dto/login.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
```

- [ ] **Step 2: Create `refresh.dto.ts`**

```typescript
// backend/src/auth/dto/refresh.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
```

- [ ] **Step 3: Create `public.decorator.ts`**

> **Spring analogy:** Like a custom annotation that tells Spring Security to `permitAll()` a route.

```typescript
// backend/src/auth/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

- [ ] **Step 4: Create `roles.decorator.ts`**

```typescript
// backend/src/auth/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

- [ ] **Step 5: Create `current-user.decorator.ts`**

> **Spring analogy:** Like `@AuthenticationPrincipal` in Spring Security — extracts the authenticated user from the request context.

```typescript
// backend/src/auth/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    return ctx.switchToHttp().getRequest().user;
  },
);
```

- [ ] **Step 6: Verify type-check**

```bash
cd backend
npx tsc --noEmit
```

Expected: no output.

---

## Task 5: JWT Strategy and Guards

**Files:**
- Create: `backend/src/auth/strategies/jwt.strategy.ts`
- Create: `backend/src/auth/guards/jwt-auth.guard.ts`
- Create: `backend/src/auth/guards/roles.guard.ts`

- [ ] **Step 1: Create `jwt.strategy.ts`**

> **Spring analogy:** This is the equivalent of Spring Security's `OncePerRequestFilter` + `UsernamePasswordAuthenticationToken`. It validates each JWT and populates the security context (`request.user`).

```typescript
// backend/src/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: number; username: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { lecturer: true, student: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }
    return user; // becomes request.user
  }
}
```

- [ ] **Step 2: Create `jwt-auth.guard.ts`**

> **Spring analogy:** Like `SecurityFilterChain` — applies to all routes. The `@Public()` check is like `requestMatchers(...).permitAll()`.

```typescript
// backend/src/auth/guards/jwt-auth.guard.ts
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
```

- [ ] **Step 3: Create `roles.guard.ts`**

> **Spring analogy:** Like `@PreAuthorize("hasRole('ADMIN')")` — checks the authenticated user's role.

```typescript
// backend/src/auth/guards/roles.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles) return true; // no @Roles() = any authenticated user
    const { user } = context.switchToHttp().getRequest();
    return roles.includes(user.role);
  }
}
```

- [ ] **Step 4: Verify type-check**

```bash
cd backend
npx tsc --noEmit
```

Expected: no output.

---

## Task 6: AuthService — tests first, then implementation

**Files:**
- Create: `backend/src/auth/auth.service.spec.ts`
- Create: `backend/src/auth/auth.service.ts`

- [ ] **Step 1: Create `auth.service.spec.ts` with all test cases**

```typescript
// backend/src/auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { findUnique: jest.Mock; update: jest.Mock } };
  let jwtService: jest.Mocked<Pick<JwtService, 'signAsync' | 'verifyAsync'>>;

  const mockUser = {
    id: 1,
    username: 'john.doe',
    passwordHash: '$2b$10$hashedpassword',
    role: Role.STUDENT,
    isActive: true,
    refreshToken: null,
    lecturer: null,
    student: { fullName: 'John Doe', email: 'john@uni.edu' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('mock.jwt.token'),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((_key: string, def?: string) => def ?? 'test-secret'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => jest.restoreAllMocks());

  // ─── login ───────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns tokens and profile for valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-jti' as never);
      prisma.user.update.mockResolvedValue(mockUser as any);

      const result = await service.login('john.doe', 'password');

      expect(result.accessToken).toBe('mock.jwt.token');
      expect(result.refreshToken).toBe('mock.jwt.token');
      expect(result.user).toEqual({
        id: 1,
        username: 'john.doe',
        role: Role.STUDENT,
        fullName: 'John Doe',
        email: 'john@uni.edu',
      });
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { refreshToken: 'hashed-jti' } }),
      );
    });

    it('throws 401 "Invalid credentials" when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login('nobody', 'password')).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });

    it('throws 401 "Account is disabled" when user is inactive', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, isActive: false } as any);

      await expect(service.login('john.doe', 'password')).rejects.toThrow(
        new UnauthorizedException('Account is disabled'),
      );
    });

    it('throws 401 "Invalid credentials" when password is wrong', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.login('john.doe', 'wrongpassword')).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });
  });

  // ─── refresh ─────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('returns new tokens for valid refresh token', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 1, jti: 'test-uuid' });
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, refreshToken: 'hashed-jti' } as any);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('new-hashed-jti' as never);
      prisma.user.update.mockResolvedValue(mockUser as any);

      const result = await service.refresh('valid.refresh.token');

      expect(result.accessToken).toBe('mock.jwt.token');
      expect(result.refreshToken).toBe('mock.jwt.token');
    });

    it('throws 401 "Invalid refresh token" when JWT verification fails', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(service.refresh('expired.token')).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });

    it('throws 401 "Invalid refresh token" when user not found', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 99, jti: 'test-uuid' });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.refresh('valid.token')).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });

    it('throws 401 "Invalid refresh token" when no stored token in DB', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 1, jti: 'test-uuid' });
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, refreshToken: null } as any);

      await expect(service.refresh('valid.token')).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });

    it('throws 401 "Invalid refresh token" when jti does not match stored hash', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 1, jti: 'test-uuid' });
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, refreshToken: 'hashed-jti' } as any);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.refresh('tampered.token')).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });
  });

  // ─── logout ──────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('sets refreshToken to null in DB', async () => {
      prisma.user.update.mockResolvedValue(mockUser as any);

      await service.logout(1);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { refreshToken: null },
      });
    });
  });

  // ─── getMe ───────────────────────────────────────────────────────────────

  describe('getMe', () => {
    it('returns profile for STUDENT user', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser as any);

      const result = await service.getMe(1);

      expect(result).toEqual({
        id: 1,
        username: 'john.doe',
        role: Role.STUDENT,
        fullName: 'John Doe',
        email: 'john@uni.edu',
      });
    });

    it('returns profile for LECTURER user', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        role: Role.LECTURER,
        student: null,
        lecturer: { fullName: 'Prof. Smith', email: 'smith@uni.edu' },
      } as any);

      const result = await service.getMe(1);

      expect(result.fullName).toBe('Prof. Smith');
      expect(result.email).toBe('smith@uni.edu');
    });

    it('returns null fullName and email for ADMIN user', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        role: Role.ADMIN,
        student: null,
        lecturer: null,
      } as any);

      const result = await service.getMe(1);

      expect(result.fullName).toBeNull();
      expect(result.email).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run tests — confirm they all fail**

```bash
cd backend
pnpm run test auth.service
```

Expected: all tests FAIL with "Cannot find module './auth.service'" or similar.

- [ ] **Step 3: Create `auth.service.ts`**

```typescript
// backend/src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { lecturer: true, student: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { accessToken, refreshToken } = await this.generateTokens(
      user.id,
      user.username,
      user.role,
    );

    return {
      accessToken,
      refreshToken,
      user: this.buildProfile(user),
    };
  }

  async refresh(token: string) {
    let payload: { sub: number; jti: string };
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenValid = await bcrypt.compare(payload.jti, user.refreshToken);
    if (!tokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const { accessToken, refreshToken } = await this.generateTokens(
      user.id,
      user.username,
      user.role,
    );

    return { accessToken, refreshToken };
  }

  async logout(userId: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { lecturer: true, student: true },
    });
    return this.buildProfile(user);
  }

  private async generateTokens(userId: number, username: string, role: Role) {
    const jti = randomUUID();

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, username, role },
        { expiresIn: this.configService.get('JWT_EXPIRY', '30m') },
      ),
      this.jwtService.signAsync(
        { sub: userId, jti },
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: this.configService.get('JWT_REFRESH_EXPIRY', '7d'),
        },
      ),
    ]);

    const hashedJti = await bcrypt.hash(jti, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedJti },
    });

    return { accessToken, refreshToken };
  }

  private buildProfile(user: any) {
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      fullName: user.lecturer?.fullName ?? user.student?.fullName ?? null,
      email: user.lecturer?.email ?? user.student?.email ?? null,
    };
  }
}
```

- [ ] **Step 4: Run tests — confirm they all pass**

```bash
cd backend
pnpm run test auth.service
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/auth/auth.service.ts backend/src/auth/auth.service.spec.ts
git commit -m "Add AuthService with login, refresh, logout, getMe"
```

---

## Task 7: AuthController — tests first, then implementation

**Files:**
- Create: `backend/src/auth/auth.controller.spec.ts`
- Create: `backend/src/auth/auth.controller.ts`

- [ ] **Step 1: Create `auth.controller.spec.ts`**

```typescript
// backend/src/auth/auth.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockProfile = {
    id: 1,
    username: 'john.doe',
    role: 'STUDENT',
    fullName: 'John Doe',
    email: 'john@uni.edu',
  };
  const mockLoginResult = {
    accessToken: 'access.token',
    refreshToken: 'refresh.token',
    user: mockProfile,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            refresh: jest.fn(),
            logout: jest.fn(),
            getMe: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('login calls authService.login and returns result', async () => {
    authService.login.mockResolvedValue(mockLoginResult as any);

    const result = await controller.login({ username: 'john.doe', password: 'secret' });

    expect(authService.login).toHaveBeenCalledWith('john.doe', 'secret');
    expect(result).toBe(mockLoginResult);
  });

  it('refresh calls authService.refresh and returns new tokens', async () => {
    const tokens = { accessToken: 'new.access', refreshToken: 'new.refresh' };
    authService.refresh.mockResolvedValue(tokens);

    const result = await controller.refresh({ refreshToken: 'old.refresh.token' });

    expect(authService.refresh).toHaveBeenCalledWith('old.refresh.token');
    expect(result).toBe(tokens);
  });

  it('logout calls authService.logout with userId', async () => {
    authService.logout.mockResolvedValue(undefined);

    await controller.logout({ id: 42 } as any);

    expect(authService.logout).toHaveBeenCalledWith(42);
  });

  it('getMe calls authService.getMe with userId and returns profile', async () => {
    authService.getMe.mockResolvedValue(mockProfile as any);

    const result = await controller.getMe({ id: 1 } as any);

    expect(authService.getMe).toHaveBeenCalledWith(1);
    expect(result).toBe(mockProfile);
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd backend
pnpm run test auth.controller
```

Expected: FAIL with "Cannot find module './auth.controller'".

- [ ] **Step 3: Create `auth.controller.ts`**

```typescript
// backend/src/auth/auth.controller.ts
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.username, dto.password);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@CurrentUser() user: { id: number }) {
    return this.authService.logout(user.id);
  }

  @Get('me')
  getMe(@CurrentUser() user: { id: number }) {
    return this.authService.getMe(user.id);
  }
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
cd backend
pnpm run test auth.controller
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/auth/auth.controller.ts backend/src/auth/auth.controller.spec.ts
git commit -m "Add AuthController with login, refresh, logout, me endpoints"
```

---

## Task 8: AuthModule

**Files:**
- Create: `backend/src/auth/auth.module.ts`

- [ ] **Step 1: Create `auth.module.ts`**

> **Spring analogy:** This is like your `SecurityConfig` class — wires together all the auth-related beans.

```typescript
// backend/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRY', '30m') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
```

---

## Task 9: Wire AppModule and configure global guards + validation

**Files:**
- Modify: `backend/src/app.module.ts`
- Modify: `backend/src/main.ts`

- [ ] **Step 1: Update `app.module.ts`**

```typescript
// backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
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

> **Spring analogy:** `ConfigModule.forRoot({ isGlobal: true })` is like Spring's auto-configured `application.properties` loading. `APP_GUARD` with `useClass` is like registering a `Filter` or `SecurityFilterChain` bean.

- [ ] **Step 2: Update `main.ts`**

```typescript
// backend/src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

> **`whitelist: true`** strips any properties from request body that are not declared in the DTO — equivalent to Spring's `@Valid` with `@JsonIgnoreProperties`.

- [ ] **Step 3: Run all tests**

```bash
cd backend
pnpm run test
```

Expected: all tests PASS.

- [ ] **Step 4: Verify type-check**

```bash
cd backend
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add backend/src/auth/ backend/src/app.module.ts backend/src/main.ts backend/prisma/schema.prisma backend/prisma/migrations/ backend/.env
git commit -m "Add JWT authentication with role-based access control"
```

---

## Task 10: Smoke test the running server

- [ ] **Step 1: Start the backend dev server**

```bash
cd backend
pnpm run start:dev
```

Expected: `Application is running on: http://localhost:3000`

- [ ] **Step 2: Verify unauthenticated request is rejected**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

Expected: `401` (the default hello route is now protected)

- [ ] **Step 3: Create a test user in the DB**

Open Prisma Studio to insert a user manually:

```bash
cd backend
npx prisma studio
```

Or run this one-time seed script in a separate terminal:

```bash
cd backend
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();
bcrypt.hash('password123', 10).then(hash => {
  return prisma.user.create({
    data: { username: 'admin', passwordHash: hash, role: 'ADMIN' }
  });
}).then(u => { console.log('Created:', u); prisma.\$disconnect(); });
"
```

Expected: prints created user object.

- [ ] **Step 4: Test login**

```bash
curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}' | jq .
```

Expected response shape:
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": { "id": 1, "username": "admin", "role": "ADMIN", "fullName": null, "email": null }
}
```

- [ ] **Step 5: Test /auth/me with the access token**

```bash
curl -s http://localhost:3000/auth/me \
  -H "Authorization: Bearer <paste accessToken here>" | jq .
```

Expected: same user object as the `user` field in login response.

- [ ] **Step 6: Test refresh**

```bash
curl -s -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<paste refreshToken here>"}' | jq .
```

Expected: new `accessToken` and `refreshToken`.

- [ ] **Step 7: Test logout**

```bash
curl -s -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer <paste accessToken here>" -v
```

Expected: HTTP `204 No Content`.

- [ ] **Step 8: Verify refresh token is invalidated after logout**

```bash
curl -s -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<old refreshToken>"}' | jq .
```

Expected: `401 { "message": "Invalid refresh token" }`

- [ ] **Step 9: Hand off to user for Postman testing**

The user verifies all endpoints independently in Postman before frontend work begins.
