# Thesis Management System

A web application for managing academic theses — tracking submissions, reviews, and approvals. Built with a NestJS backend API and a React frontend SPA.

## Tech Stack

| Layer    | Technology                       | Version |
|----------|----------------------------------|---------|
| Backend  | NestJS (Node.js + TypeScript)    | 11.x    |
| ORM      | Prisma (MySQL)                   | 6.x     |
| Frontend | React + Vite (TypeScript)        | 19.x    |
| Package  | pnpm                             | —       |
| Testing  | Jest (backend), —                | 30.x    |
| Linting  | ESLint + Prettier                | 9.x     |

## Repository Layout

```
ThesisManagementSystem/
├── backend/              # NestJS API server
│   ├── src/              # Application source (modules, controllers, services)
│   ├── prisma/
│   │   └── schema.prisma # Database schema and models
│   ├── test/             # E2E tests
│   ├── package.json
│   └── nest-cli.json
├── frontend/             # React SPA (Vite)
│   ├── src/              # Components, pages, assets
│   ├── public/           # Static assets
│   ├── index.html        # Entry HTML
│   ├── vite.config.ts
│   └── package.json
├── .claude/
│   ├── docs/             # Detailed documentation (consulted on demand)
│   └── rules/            # Auto-loaded rules for every session
└── CLAUDE.md             # This file (always loaded)
```

## Key Commands

| Action         | Backend (`cd backend`)       | Frontend (`cd frontend`) |
|----------------|------------------------------|--------------------------|
| Install deps   | `pnpm install`               | `pnpm install`           |
| Dev server     | `pnpm run start:dev`         | `pnpm run dev`           |
| Build          | `pnpm run build`             | `pnpm run build`         |
| Run tests      | `pnpm run test`              | —                        |
| E2E tests      | `pnpm run test:e2e`          | —                        |
| Lint           | `pnpm run lint`              | `pnpm run lint`          |
| Format         | `pnpm run format`            | —                        |

**Ports:** Backend listens on `PORT` env var or `3000` by default. Frontend dev server uses Vite default (`5173`).

## Important Caveats

- **No shared workspace root** — `backend/` and `frontend/` are independent pnpm projects. Run commands from within each directory.
- **Prisma generates into node_modules** — run `npx prisma generate` after schema changes. Run `npx prisma migrate dev` to create/apply migrations.
- **JWT auth is implemented** — global `JwtAuthGuard` protects all routes; use `@Public()` to opt out. See [backend.md](.claude/docs/backend.md) for guard/decorator patterns.
- **TypeScript versions differ** — backend uses TS ~5.x, frontend uses TS ~6.x. Be aware of syntax differences.

## Additional Documentation

| File | Covers | When to consult |
|------|--------|-----------------|
| [backend.md](.claude/docs/backend.md) | NestJS structure, module conventions, testing | When adding modules, services, controllers, or writing tests |
| [database.md](.claude/docs/database.md) | Prisma schema, migrations, DB config | When adding entities, changing schema, or running migrations |
| [frontend.md](.claude/docs/frontend.md) | React/Vite structure, component conventions | When adding pages, components, or routes |
