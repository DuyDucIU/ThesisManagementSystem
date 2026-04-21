# Backend — NestJS API

## Source Structure

```
backend/src/
├── main.ts                         # Bootstrap — NestFactory, global pipes, port
├── app.module.ts                   # Root module — global guards, feature imports
├── app.controller.ts               # Health/hello endpoint (@Public)
├── app.controller.spec.ts
├── app.service.ts
├── prisma/                         # Global Prisma module (injected anywhere)
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── auth/                           # JWT authentication module
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.controller.spec.ts
│   ├── auth.service.ts
│   ├── auth.service.spec.ts
│   ├── decorators/
│   │   ├── public.decorator.ts     # @Public() — opt route out of JWT guard
│   │   ├── roles.decorator.ts      # @Roles(...) — restrict by role
│   │   └── current-user.decorator.ts  # @CurrentUser() — inject request.user
│   ├── dto/
│   │   └── login.dto.ts        # refresh reads from cookie — no DTO needed
│   ├── guards/
│   │   ├── jwt-auth.guard.ts       # Global guard — all routes protected by default
│   │   └── roles.guard.ts          # Global guard — enforces @Roles()
│   └── strategies/
│       └── jwt.strategy.ts         # passport-jwt strategy
└── <feature>/                      # Each feature module follows the same shape
    ├── <feature>.module.ts
    ├── <feature>.controller.ts
    ├── <feature>.controller.spec.ts
    ├── <feature>.service.ts
    ├── <feature>.service.spec.ts
    ├── dto/
    │   ├── create-<feature>.dto.ts
    │   ├── update-<feature>.dto.ts
    │   └── query-<feature>.dto.ts  # Optional — list/filter query params
    └── entities/                   # Optional — response shape types
```

## NestJS Module Convention

Each feature is a self-contained module:

- **Module** (`@Module`): declares controllers, providers, imports, exports
- **Controller** (`@Controller`): handles HTTP routes, delegates to service
- **Service** (`@Injectable`): business logic, injected via constructor DI
- **DTOs**: plain classes with `class-validator` decorators for request validation

Generate a new feature module (creates module, controller, service, DTOs, and spec files):
```bash
cd backend
npx nest g resource <name>
```

Select "REST API" and "Yes" to generate CRUD entry points when prompted.

## Prisma

`PrismaService` is a global module — inject it in any service without importing `PrismaModule`:

```typescript
@Injectable()
export class ThesisService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.thesis.findMany();
  }
}
```

See [database.md](database.md) for schema, migrations, and conventions.

## Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Files | kebab-case | `thesis-submission.service.ts` |
| Classes | PascalCase | `ThesisSubmissionService` |
| Methods | camelCase | `findAll()`, `createThesis()` |
| Route paths | kebab-case | `/thesis-submissions` |
| Test files | co-located | `<name>.service.spec.ts` |

## Testing

- **Unit tests**: Jest, files matching `*.spec.ts` in `src/`
- **E2E tests**: Supertest, config in `test/jest-e2e.json`, files in `test/`
- Run: `pnpm run test` (unit), `pnpm run test:e2e` (e2e)

Mock `PrismaService` in unit tests — never hit the real DB:

```typescript
const mockPrisma = { user: { findUnique: jest.fn(), update: jest.fn() } };

const module = await Test.createTestingModule({
  providers: [
    MyService,
    { provide: PrismaService, useValue: mockPrisma },
  ],
}).compile();
```

See [api.md](api.md) for endpoint design conventions and [security.md](security.md) for guard/decorator patterns.

## File Upload Pattern (Multer)

Use `FileInterceptor` from `@nestjs/platform-express` for `multipart/form-data` endpoints. Store files in memory (not disk) and access them as `Buffer` in the service:

```typescript
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';

@Post('import')
@UseInterceptors(
  FileInterceptor('file', {
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },  // 5 MB
  }),
)
async importFile(@UploadedFile() file: Express.Multer.File) {
  // file.buffer, file.originalname, file.mimetype
}
```

Add `multer` and `@types/multer` as explicit direct dependencies — they are peer deps of `@nestjs/platform-express` but may not be hoisted in pnpm workspaces:

```bash
cd backend
pnpm add multer
pnpm add -D @types/multer
```

## Gotchas

- **cookie-parser import** — use `import cookieParser = require('cookie-parser')`, not `import * as cookieParser`. Correct TypeScript pattern for CommonJS callable modules under NodeNext module resolution.
- **`@Res` decorator** — always use `@Res({ passthrough: true })`, never bare `@Res()`, or NestJS skips automatic response serialization.
- **Prisma relation types** — use `Prisma.UserGetPayload<{ include: { ... } }>` for service methods that receive Prisma results with relations, not `any`.
- **`ConfigService.getOrThrow`** — prefer `configService.getOrThrow('KEY')` over `configService.get('KEY') || fallback` for required env vars so the app fails fast on misconfiguration.
- **Jest + bcrypt spy** — ts-jest uses a CommonJS tsconfig override in `backend/package.json` (`ts-jest` → `tsconfig: tsconfig.cjs.json`) to allow `jest.spyOn` on bcrypt. Do not remove it — removing it breaks spying on bcrypt methods in unit tests.
- **`@Roles()` at controller level** — apply `@Roles(Role.ADMIN)` on the controller class to protect every route in it. Individual methods can still override with their own `@Roles()`. This is cleaner than repeating the decorator on every handler.
- **`multer` import style** — use `import * as multer from 'multer'` (not default import). Required because multer ships as a CommonJS module.
- **`?action=` query param for multi-action endpoints** — when one URL handles logically related but distinct operations (e.g. parse-then-import), use `@Query('action') action: 'parse' | 'import'` rather than separate routes. Validate the action value explicitly and throw `BadRequestException` for unknown values.
- **Hardcoded email domain in student import** — `StudentService` constructs student emails as `${username}@student.hcmiu.edu.vn` via the `EMAIL_DOMAIN` constant at the top of `student.service.ts`. If the university's student email domain changes, update that constant.
- **DTO files can be plain TypeScript interfaces** — `dto/import-student.dto.ts` uses `interface` declarations (not class-validator decorated classes) because these types describe response shapes and internal data, not incoming request bodies. Class-validator is only needed for DTOs that go through `ValidationPipe`.
- **Query DTO with `@Transform`** — when a query param can arrive as an empty string (e.g. from a cleared filter), use `@Transform(({ value }) => value || undefined)` before the validator so empty strings don't fail `@IsDateString()` or similar. Requires `enableImplicitConversion: false` (the default) — explicit transforms run regardless.

## Configuration

- **`nest-cli.json`**: source root `src/`, `deleteOutDir: true` on build
- **`.env`**: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRY`, `JWT_REFRESH_EXPIRY`, `ALLOWED_ORIGIN` (optional, defaults to `http://localhost:5173`)
- **`NODE_ENV`**: set to `production` to enable `secure` flag on the refresh token cookie
- **Prettier**: `.prettierrc` in backend root
- **ESLint**: `eslint.config.mjs`
