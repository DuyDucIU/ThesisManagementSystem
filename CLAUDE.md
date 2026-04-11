# Thesis Management System

A web application for managing academic theses — tracking submissions, reviews, and approvals. Built with a NestJS backend API and a React frontend SPA.

## Tech Stack

| Layer       | Technology                    | Version |
|-------------|-------------------------------|---------|
| Backend     | NestJS (Node.js + TypeScript) | 11.x    |
| ORM         | Prisma (MySQL)                | 6.x     |
| Auth        | JWT + Passport.js + bcrypt    | —       |
| Frontend    | React + Vite (TypeScript)     | 19.x    |
| Package     | pnpm                          | —       |
| Testing     | Jest (backend)                | 30.x    |
| Linting     | ESLint + Prettier             | 9.x     |

## Repository Layout

```
ThesisManagementSystem/
├── backend/              # NestJS API server
│   ├── src/
│   │   ├── prisma/       # Global Prisma module — see database.md
│   │   ├── auth/         # JWT auth — see security.md
│   │   └── <feature>/    # Feature modules — see backend.md
│   ├── prisma/           # schema.prisma + migrations/
│   └── test/             # E2E tests
├── frontend/             # React SPA (Vite) — see frontend.md
│   └── src/
├── .claude/
│   ├── docs/             # Detailed documentation (consulted on demand)
│   └── rules/            # Auto-loaded rules for every session
└── CLAUDE.md             # This file (always loaded)
```

## Key Commands

| Action       | Backend (`cd backend`)             | Frontend (`cd frontend`) |
|--------------|------------------------------------|--------------------------|
| Install deps | `pnpm install`                     | `pnpm install`           |
| Dev server   | `pnpm run start:dev`               | `pnpm run dev`           |
| Build        | `pnpm run build`                   | `pnpm run build`         |
| Run tests    | `pnpm run test`                    | —                        |
| E2E tests    | `pnpm run test:e2e`                | —                        |
| Lint         | `pnpm run lint`                    | `pnpm run lint`          |
| Format       | `pnpm run format`                  | —                        |
| DB migrate   | `npx prisma migrate dev --name x`  | —                        |
| DB generate  | `npx prisma generate`              | —                        |

**Ports:** Backend `3000`, Frontend dev server `5173`.

## Important Caveats

- **No shared workspace root** — `backend/` and `frontend/` are independent pnpm projects. Run commands from within each directory.
- **Prisma generates into node_modules** — run `npx prisma generate` after schema changes; `npx prisma migrate dev` to create/apply migrations.
- **TypeScript versions differ** — backend uses TS ~5.x, frontend uses TS ~6.x.
- **Jest + bcrypt spy** — ts-jest uses a CommonJS tsconfig override in `package.json` to allow `jest.spyOn` on bcrypt. Do not remove it.

## Additional Documentation

| File | Covers | When to consult |
|------|--------|-----------------|
| [backend.md](.claude/docs/backend.md) | NestJS module conventions, naming, testing, CLI | When adding modules, services, or controllers |
| [api.md](.claude/docs/api.md) | REST conventions, validation, response shapes, error codes | When designing or implementing endpoints |
| [security.md](.claude/docs/security.md) | JWT flow, guards, decorators, roles | When touching auth or protecting routes |
| [database.md](.claude/docs/database.md) | Prisma schema, migrations, DB config | When changing schema or running migrations |
| [frontend.md](.claude/docs/frontend.md) | React/Vite structure, component conventions | When adding pages, components, or routes |
