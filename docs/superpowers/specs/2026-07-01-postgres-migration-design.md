# Postgres Migration (Phase 1: Engine Swap)

## Context

The system currently runs on MySQL. The project is moving toward prioritizing security and data integrity over raw performance, and Postgres was chosen as the target engine (stricter constraint enforcement, native UUID type support, no `SET FOREIGN_KEY_CHECKS=0` escape hatch).

A related, larger change — converting all primary keys from `Int @default(autoincrement())` to UUID, to make resource IDs non-guessable — was also discussed. That conversion touches every model, every FK, every backend DTO/controller (`ParseIntPipe` usage across 9 files), and frontend types (`id: number` in 12 files). To keep risk isolated and bugs attributable to a single cause, the work is split into two independent phases:

- **Phase 1 (this spec)**: swap the DB engine only. Schema shape, PK types, and all application code stay identical.
- **Phase 2 (future, separate spec)**: convert PKs from Int to UUID, on Postgres.

This document covers Phase 1 only.

## Goals

- Move the backend's datasource from MySQL to PostgreSQL.
- Keep all model definitions (fields, relations, PK types) unchanged.
- Do not touch or migrate existing MySQL data — it is left in place, untouched, effectively abandoned.
- Start with a fresh, empty Postgres database (`tms`).

## Non-goals

- UUID primary key conversion (Phase 2).
- Preserving/importing existing MySQL rows (27 users, 22 students, 2 theses) into Postgres.
- Any application code changes beyond datasource configuration.

## Design

### 1. Datasource provider

`backend/prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 2. Environment configuration

`backend/.env`:
```
DATABASE_URL="postgresql://postgres:<password>@localhost:5432/tms?schema=public"
```

Local Postgres 18 is already installed and running as a Windows service (`postgresql-x64-18`, port 5432). The `tms` database has already been created via DataGrip.

### 3. Migration history reset

The four existing migration folders under `backend/prisma/migrations/` (`20260410050308_init`, `20260411033228_add_refresh_token_to_user`, `20260423102249_rename_semester_student_to_enrollment`, `20260622043036_add_lecturer_semester`) contain MySQL-flavored SQL (backtick-quoted identifiers, inline `ENUM(...)` column syntax) and will not replay against Postgres.

Action: delete all four migration folders, then regenerate a single fresh `init` migration from the current `schema.prisma` against the empty `tms` database via `npx prisma migrate dev --name init`. `migration_lock.toml` will be regenerated recording `postgresql` as the provider.

### 4. Application code

No changes needed in `backend/src/`. Verified during brainstorming:
- Only one raw query exists (`thesis.service.ts:113`, `SELECT id FROM lecturers WHERE id = ${topic.lecturerId} FOR UPDATE`) — standard SQL, behaves identically on both engines.
- No MySQL-specific Prisma type annotations (`@db.VarChar`, `@db.TinyInt`, etc.) are used. Existing `@db.Text`, `@db.Date`, `@db.Decimal(4,2)` all map cleanly to Postgres equivalents.

### 4a. Known caveat: collation / case-sensitivity change

MySQL's migrations declared `COLLATE utf8mb4_unicode_ci`, making unique constraints and equality lookups on `username`, `email`, `code`, `student_id`, and `lecturer_id` case- and accent-insensitive. Postgres `TEXT` columns use the database's default collation, which is case-sensitive, and no application code normalizes case (`auth.service.ts`'s login lookup is a plain `where: { username }`, no `mode: 'insensitive'` or `toLowerCase()`). This is harmless today since `tms` starts empty, but it's a real, silent behavior change:
- Excel imports of near-duplicate emails (`John@x.com` vs `john@x.com`) that MySQL rejected as unique-constraint violations will now both insert successfully.
- Exact-match lookups (e.g. login) become case-sensitive going forward.

Not addressed in Phase 1 (would require either the `citext` extension or `@db` type annotations + `mode: 'insensitive'` in Prisma queries — both are application-level decisions, out of scope for an engine-swap-only phase). Flagged here as a conscious, deferred decision for Phase 2 or before real data is imported.

### 5. Admin bootstrap

The fresh `tms` database has zero rows, including no admin account, and there is no seed script in the codebase (the current MySQL admin user was created via manual SQL insert). After migrating, a bcrypt hash will be generated for a chosen password and provided as an `INSERT` statement to create the first `User` row (`role = 'ADMIN'`) directly via DataGrip — matching the existing manual-provisioning approach, no new code.

Note: the raw `INSERT` must set `updated_at` explicitly. It's `NOT NULL` with no SQL-level default — `@updatedAt` in `schema.prisma` is populated by the Prisma Client at the application layer, not by a database default, so any write that bypasses the Prisma Client (like this raw insert) must supply it. `created_at` doesn't need this since it has `DEFAULT CURRENT_TIMESTAMP` in the DDL.

## Verification plan

1. `npx prisma generate` and `npx prisma migrate dev --name init` succeed against `tms`.
2. Backend boots cleanly (`pnpm run start:dev`), no Prisma/connection errors.
3. Manually insert the admin user row, log in via the API, and smoke-test a handful of endpoints (e.g. list semesters, list students) through Postman to confirm reads/writes work against Postgres.
4. Existing Jest suite (`pnpm run test`) still passes (it doesn't hit a real DB, so this is a basic sanity check that nothing else broke).

## Rollback

MySQL configuration and data are never touched, so rollback is trivial: revert **both** the `schema.prisma` provider and `.env`'s `DATABASE_URL` back to their MySQL values and restart the backend. No data loss risk in either direction. Reverting `.env` alone is not sufficient — Prisma's generated client validates the connection-string protocol against `schema.prisma`'s declared `provider` at init time, so an env-only revert fails with a `P1012` provider-mismatch error before any MySQL connection is even attempted.
