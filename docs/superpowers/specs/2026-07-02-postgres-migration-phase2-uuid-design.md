# Postgres Migration Phase 2: UUID Primary Keys

## Context

Phase 1 (MySQL → PostgreSQL engine swap, `docs/superpowers/specs/2026-07-01-postgres-migration-design.md`) deliberately deferred primary key changes — schema shape and PK types stayed `Int @default(autoincrement())` throughout. This document is that deferred Phase 2: converting all primary keys to UUID, to make resource IDs non-guessable (defense-in-depth; not a substitute for proper authorization checks, which the codebase already has via `@Roles` guards).

**Prerequisite:** Phase 1 must be merged first — this phase assumes the backend is already running on PostgreSQL with the current 11-model schema.

Since Phase 1 shipped, `tms` is still pre-launch/empty (no real users, no real data), which keeps this phase simple: no in-place `ALTER COLUMN` migration or ID backfill is needed. The migration history can be reset and regenerated the same way Phase 1 did it.

## Goals

- Convert every model's `id` primary key from `Int @default(autoincrement())` to `String @db.Uuid` with database-generated UUIDv4 values.
- Convert every foreign key field to match its referenced model's new `String @db.Uuid` type.
- Keep all other schema shape (fields, relations, enums) unchanged.
- Update backend and frontend code to work with string UUIDs instead of numeric IDs.

## Non-goals

- Preserving any existing `tms` data through the conversion — the database is reset and regenerated empty, same as Phase 1.
- Building the `Notification` feature (module/controller/service) — out of scope; only its schema type is kept consistent with the rest of the conversion.
- Any further engine changes — this phase stays on PostgreSQL.
- Changing authorization logic — UUIDs reduce ID-guessing risk but existing `@Roles`/ownership checks are unchanged and still the actual authorization boundary.

## Design

### 1. UUID version and generation

**UUIDv4** (fully random, 122 bits of entropy) — no information leakage about creation time or order, matching this project's stated priority of security/integrity over performance. UUIDv7's better index locality wasn't judged worth the timestamp leakage at this project's scale.

Generated **database-side** via Postgres's built-in `gen_random_uuid()` (available natively in Postgres 13+, no extension required) rather than Prisma's application-side `@default(uuid())`. Rationale, informed directly by Phase 1: the admin-bootstrap flow does a raw SQL `INSERT` via DataGrip, bypassing the Prisma Client. Phase 1 already hit this exact class of bug once — `updated_at` (`@updatedAt`) has no SQL-level default because it's Prisma-Client-managed, so the raw insert failed a not-null constraint until fixed. Using `dbgenerated("gen_random_uuid()")` for `id` makes it a real SQL `DEFAULT`, so the same raw-insert pattern gets a valid id for free, avoiding a repeat of that gotcha.

### 2. Schema changes

Every model's primary key changes from:
```prisma
id Int @id @default(autoincrement())
```
to:
```prisma
id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
```

`@db.Uuid` is required, not optional — without it, Prisma stores the value as 36-character `TEXT`, losing the native 16-byte storage and index efficiency that's a core part of the Postgres+UUID case (vs. MySQL, which has no native UUID type and would store it as a 36-char string either way).

All foreign key fields follow the referenced model's new type, e.g. `Lecturer.userId Int` → `String @db.Uuid`, `Thesis.enrollmentId Int` → `String @db.Uuid`, etc. — across all 11 models: `User`, `Semester`, `Lecturer`, `LecturerSemester`, `Student`, `Enrollment`, `Topic`, `Thesis`, `Document`, `ThesisReview`, `Notification`.

`Notification.relatedId` (currently `Int?`, a polymorphic reference tagged by the sibling `relatedType String?` field) converts to `String? @db.Uuid` for consistency, even though no application code touches it yet — no `notification` module exists in `backend/src/`. This avoids a silent type mismatch trap for whoever builds that feature later.

### 3. Migration history reset

Same mechanism as Phase 1: delete the existing migration folder(s), regenerate a single fresh `init` migration from the updated `schema.prisma` via `npx prisma migrate dev --name init` against a reset `tms` database. `npx prisma migrate reset` requires explicit user consent each time it's invoked from an agent session (Prisma's own AI-agent safety guard, encountered during Phase 1) — plan for a manual confirmation step, or have the user reset the database directly via DataGrip as was done in Phase 1's redo.

### 4. Backend application code

**Path param validation** — 7 controllers currently use NestJS's `ParseIntPipe` on `:id` route params: `enrollment`, `lecturer`, `lecturer-semester`, `semester`, `student`, `thesis`, `topic`. Each swaps to NestJS's built-in `ParseUUIDPipe`, which validates the param is a well-formed UUID and returns `400 Bad Request` otherwise — same rejection behavior `ParseIntPipe` gives today for non-numeric input, just validating a different format.

**Types** — every DTO field, service method signature, and Prisma query typed `id: number` (or `userId: number`, `lecturerId: number`, etc.) becomes `id: string`.

**JWT** — `auth.service.ts` and `jwt.strategy.ts` carry the authenticated user's id as the JWT `sub` claim. This becomes a string; JWT libraries (`jsonwebtoken`/Passport) handle string `sub` values natively — no library-level change needed, just the type flowing through.

### 5. Frontend application code

12 files currently type `id: number`: `account/api.ts`, `account/components/AccountManagementPage.tsx`, `auth/store/authStore.ts`, `enrollment/api.ts`, `lecturer/api.ts`, `semester/api.ts`, `student/api.ts`, `thesis/api.ts`, `thesis/components/AdminAssignmentsPage.tsx`, `thesis/store/thesisStore.ts`, `topic/api.ts`, `topic/store/topicStore.ts`. All become `id: string`.

One real behavioral fix, not just a type change: [`ThesisDetailPage.tsx:43`](../../../frontend/src/features/thesis/components/ThesisDetailPage.tsx#L43) does `.get(Number(id))`, coercing the route param to a number before the API call. This must be removed — coercing a UUID through `Number()` produces `NaN`. Confirmed via search that this is the only spot in the frontend doing numeric ID coercion.

React Router's `useParams()` already returns strings for all route params, so no change needed there — only the places that explicitly convert away from string need fixing.

## Verification plan

1. `npx prisma migrate dev --name init` applies cleanly against a reset `tms` database; generated `migration.sql` uses native `uuid` columns with `gen_random_uuid()` defaults, not `text`.
2. Backend boots with no Prisma/type errors across all modules.
3. Admin bootstrap: no manual id value needed in the raw `INSERT` (DB generates it) — `updated_at` still needs its explicit value per the Phase 1 finding, that's unrelated to this phase's change.
4. Full Jest suite passes — this is the primary regression check for `number`→`string` breakage across test fixtures, since Prisma is mocked in these tests and won't itself catch a fixture still using a numeric literal for an id.
5. End-to-end smoke test: login (JWT with string `sub`) → authenticated request with a real UUID path param → `ParseUUIDPipe` accepts it → response round-trips string ids correctly.
6. Manually verify `ParseUUIDPipe` rejects a non-UUID path param with `400`, confirming the same validation posture as `ParseIntPipe` today.

## Rollback

Same posture as Phase 1: `tms` has no real data to lose, so rollback is reverting `schema.prisma` and the migration folder to their Phase-1-post, pre-Phase-2 state and re-resetting the database. No production data is ever at risk since this phase only ever touches a pre-launch database.
