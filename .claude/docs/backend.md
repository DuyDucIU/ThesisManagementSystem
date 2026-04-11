# Backend — NestJS API

## Source Structure

```
backend/src/
├── main.ts               # Bootstrap — NestFactory, global pipes, port
├── app.module.ts         # Root module — global guards, feature imports
├── app.controller.ts     # Health/hello endpoint (@Public)
├── app.service.ts
├── prisma/               # Global Prisma module
│   ├── prisma.module.ts
│   └── prisma.service.ts
└── <feature>/            # One directory per feature module
    ├── <feature>.module.ts
    ├── <feature>.controller.ts
    ├── <feature>.service.ts
    ├── <feature>.controller.spec.ts
    ├── <feature>.service.spec.ts
    ├── dto/
    │   ├── create-<feature>.dto.ts
    │   └── update-<feature>.dto.ts
    └── entities/         # (optional — response shape types)
```

## NestJS Module Convention

Each feature is a self-contained module:

- **Module** (`@Module`): declares controllers, providers, imports, exports
- **Controller** (`@Controller`): handles HTTP routes, delegates to service
- **Service** (`@Injectable`): business logic, injected via constructor DI
- **DTOs**: plain classes with `class-validator` decorators for request validation

Generate a new feature module:
```bash
cd backend
npx nest generate module <name>
npx nest generate controller <name>
npx nest generate service <name>
```

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

## Configuration

- **`nest-cli.json`**: source root `src/`, `deleteOutDir: true` on build
- **`.env`**: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRY`, `JWT_REFRESH_EXPIRY`
- **Prettier**: `.prettierrc` in backend root
- **ESLint**: `eslint.config.mjs`
