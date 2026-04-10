# Backend — NestJS API

## Package Structure

The backend follows standard NestJS conventions with a modular architecture:

```
backend/src/
├── main.ts               # Bootstrap — creates NestFactory, listens on PORT || 3000
├── app.module.ts          # Root module — imports all feature modules
├── app.controller.ts      # Root controller (health/hello endpoint)
├── app.service.ts         # Root service
└── <feature>/             # Feature modules (to be created)
    ├── <feature>.module.ts
    ├── <feature>.controller.ts
    ├── <feature>.service.ts
    ├── dto/
    │   ├── create-<feature>.dto.ts
    │   └── update-<feature>.dto.ts
    ├── entities/
    │   └── <feature>.entity.ts
    └── <feature>.controller.spec.ts
```

## NestJS Module Convention

Each feature should be a self-contained module following NestJS patterns:

- **Module** (`@Module`): declares controllers, providers, imports, exports
- **Controller** (`@Controller`): handles HTTP routes, delegates to service
- **Service** (`@Injectable`): business logic, injected via constructor DI
- **DTOs**: plain classes with validation decorators (when class-validator is added)
- **Entities**: database models (when ORM is added)

Generate new modules using the Nest CLI:
```bash
cd backend
npx nest generate module <name>
npx nest generate controller <name>
npx nest generate service <name>
```

## Naming Conventions

- **Files**: kebab-case — `thesis-submission.controller.ts`
- **Classes**: PascalCase — `ThesisSubmissionController`
- **Methods**: camelCase — `findAll()`, `createThesis()`
- **Route paths**: kebab-case — `/thesis-submissions`
- **Test files**: co-located with source — `<name>.controller.spec.ts`

## Testing

- **Unit tests**: Jest, files matching `*.spec.ts` in `src/`
- **E2E tests**: Jest with Supertest, config in `test/jest-e2e.json`, files in `test/`
- Run: `pnpm run test` (unit), `pnpm run test:e2e` (e2e)

## Configuration

- **nest-cli.json**: source root is `src/`, `deleteOutDir: true` on build
- **Prettier**: configured via `.prettierrc` in backend root
- **ESLint**: configured via `eslint.config.mjs`

## Database

Prisma is configured as a global NestJS module — see [database.md](database.md) for schema, migrations, and usage details.

## API Conventions (To Be Established)

When building the API, follow these REST conventions:
- `GET /resources` — list, `GET /resources/:id` — detail
- `POST /resources` — create, `PATCH /resources/:id` — partial update
- `DELETE /resources/:id` — remove
- Return appropriate HTTP status codes (201 for create, 204 for delete)
- Use DTOs for request validation, entity serialization for responses
