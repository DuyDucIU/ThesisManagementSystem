# Postgres Migration Phase 2 (UUID Primary Keys) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert every model's primary key (and every foreign key referencing it) from `Int @default(autoincrement())` to `String @db.Uuid` with database-generated UUIDv4 values, and update all backend and frontend code to work with string UUIDs instead of numeric ids.

**Architecture:** Schema change is atomic across all 11 models in one task (a PK type change requires every referencing FK to change in the same edit, verified empirically — Prisma's parser rejects mismatched FK/PK types). Migration history is reset and regenerated the same way Phase 1 did it, since `tms` stays pre-launch/empty. Application code changes split into a compiler-driven sweep (most `number`→`string` type changes are exhaustively caught by `tsc`) plus a short list of things the compiler does **not** catch: `class-validator` decorators (`@IsInt` vs `@IsUUID` — a runtime concern invisible to the type checker) and manual numeric coercions (`Number(id)`) that silently produce `NaN` instead of a type error.

**Tech Stack:** NestJS 11, Prisma 6 (PostgreSQL), class-validator, React 19 + TypeScript, pnpm.

## Global Constraints

- No changes to model field shapes beyond the id/FK type conversion — no new fields, no renamed fields, no relation changes.
- `tms` database is reset (dropped/recreated) as part of this phase — no data preservation needed (confirmed pre-launch, no real users).
- Every id/FK becomes `String @db.Uuid`, generated via Postgres's native `gen_random_uuid()` as a real SQL-level `DEFAULT` (not Prisma's application-side `@default(uuid())`) — this avoids repeating the exact `updated_at`-has-no-DB-default gotcha found in Phase 1, since the codebase already relies on raw-SQL admin bootstrap via DataGrip.
- `Notification.relatedId` converts to `String? @db.Uuid` for consistency even though unused (no `notification` module exists yet).
- **Hard workflow rule (`.claude/rules/workflow.md`): the frontend implementation cycle (Task 6 onward) must not begin until the user has independently verified the backend (Task 5) via Postman.** Stop after Task 5 and wait for explicit confirmation.

---

## Prerequisites (verify before starting Task 1)

This branch was cut from `origin/main` before Phase 1 (PR #7) merged. Before executing this plan:

- [ ] **Step 1: Confirm Phase 1 has merged**

```bash
gh pr view 7 --json state,mergedAt
```

Expected: `"state": "MERGED"`. If not yet merged, stop here — do not proceed with Task 1.

- [ ] **Step 2: Recut this branch onto the merged main**

```bash
git fetch origin
git checkout -b chore/postgres-migration-phase2-v2 origin/main
git branch --unset-upstream
```

(Use a fresh branch name if `chore/postgres-migration-phase2` already has commits worth preserving — check `git log chore/postgres-migration-phase2` first. If it only has the spec/plan doc commits, those can be cherry-picked or just recreated on the new branch.)

- [ ] **Step 3: Confirm the schema is on PostgreSQL**

```bash
grep "provider" backend/prisma/schema.prisma | head -2
```

Expected: `provider = "postgresql"` in the `datasource` block. If it still says `"mysql"`, Phase 1 didn't actually merge correctly — stop and investigate before continuing.

---

## Task 1: Convert all primary keys and foreign keys to UUID

**Files:**
- Modify: `backend/prisma/schema.prisma` (all 11 models)

**Interfaces:**
- Consumes: the post-Phase-1 schema (11 models, PostgreSQL provider) confirmed in Prerequisites Step 3.
- Produces: every model's `id` as `String @db.Uuid`; every FK field renamed-in-place to match (no field renames, only type changes). This exact schema was empirically verified — `npx prisma migrate diff --from-empty` against it produces `"id" UUID NOT NULL DEFAULT gen_random_uuid()` (no `pgcrypto` extension required on Postgres 13+), and the generated Prisma Client's `UserCreateInput` type keeps `id` optional (`id?: string`), so existing `.create()` calls that omit `id` continue to type-check.

- [ ] **Step 1: Replace every model's id/FK fields**

In `backend/prisma/schema.prisma`, apply this exact replacement to each model (only the fields shown change; everything else — `@map`, relations, enums, `@@unique`, `@@map` — stays identical):

```prisma
model User {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  // ...unchanged: username, passwordHash, role, isActive, createdAt, updatedAt, refreshToken, relations
}

model Semester {
  id        String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  // ...unchanged: code, name, startDate, endDate, status, createdAt, updatedAt, relations
}

model Lecturer {
  id          String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId      String  @unique @map("user_id") @db.Uuid
  // ...unchanged: lecturerId, fullName, email, title, maxStudents, relations
}

model LecturerSemester {
  id          String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  lecturerId  String @map("lecturer_id") @db.Uuid
  semesterId  String @map("semester_id") @db.Uuid
  // ...unchanged: maxStudents, relations, @@unique([lecturerId, semesterId])
}

model Student {
  id        String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String? @unique @map("user_id") @db.Uuid
  // ...unchanged: studentId, fullName, email, relations
}

model Enrollment {
  id         String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  studentId  String           @map("student_id") @db.Uuid
  semesterId String           @map("semester_id") @db.Uuid
  // ...unchanged: status, relations, @@unique([studentId, semesterId])
}

model Topic {
  id           String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  semesterId   String      @map("semester_id") @db.Uuid
  lecturerId   String      @map("lecturer_id") @db.Uuid
  // ...unchanged: title, description, requirements, note, status, createdAt, relations
}

model Thesis {
  id           String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  enrollmentId String       @unique @map("enrollment_id") @db.Uuid
  topicId      String       @map("topic_id") @db.Uuid
  reviewerId   String?      @map("reviewer_id") @db.Uuid
  // ...unchanged: title, description, status, createdAt, updatedAt, relations
}

model Document {
  id                 String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  thesisId           String         @map("thesis_id") @db.Uuid
  // ...unchanged: docType, originalName, s3Key, mimeType, fileSize, version, status, lecturerFeedback
  lecturerReviewedBy String?        @map("lecturer_reviewed_by") @db.Uuid
  // ...unchanged: lecturerReviewedAt, adminFeedback
  adminReviewedBy    String?        @map("admin_reviewed_by") @db.Uuid
  // ...unchanged: adminReviewedAt, createdAt, relations
}

model ThesisReview {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  thesisId   String   @unique @map("thesis_id") @db.Uuid
  reviewerId String   @map("reviewer_id") @db.Uuid
  // ...unchanged: score, comment, createdAt, relations
}

model Notification {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  // ...unchanged: type, title, message, isRead
  relatedId   String?  @map("related_id") @db.Uuid
  // ...unchanged: relatedType, createdAt, relations
}
```

Every `@relation(fields: [...], references: [id])` line stays exactly as-is — only the field's declared type above it changes, Prisma re-resolves the relation automatically once both sides match.

- [ ] **Step 2: Validate the schema parses**

```bash
cd backend
npx prisma validate
```

Expected: `The schema at prisma/schema.prisma is valid 🚀` — this catches any FK/PK type mismatch immediately (Prisma errors with "the type of field X ... is not matching the type of the referenced field" if any FK was missed).

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(db): convert all primary keys and foreign keys to UUID"
```

---

## Task 2: Reset migration history and apply the UUID-native migration

**Files:**
- Delete: `backend/prisma/migrations/<existing init folder>/`
- Delete: `backend/prisma/migrations/migration_lock.toml`
- Create: `backend/prisma/migrations/<timestamp>_init/migration.sql` (generated)
- Create: `backend/prisma/migrations/migration_lock.toml` (regenerated)

**Interfaces:**
- Consumes: `schema.prisma` from Task 1 (all UUID ids/FKs).
- Produces: a `tms` database with all tables using native `UUID` columns and `DEFAULT gen_random_uuid()`.

- [ ] **Step 1: Delete the existing migration folder and lock file**

```bash
cd backend
rm -rf prisma/migrations/*_init
rm -f prisma/migrations/migration_lock.toml
```

(There is only one migration folder at this point — the Phase 1 `init` — since Phase 2 hasn't added any migrations yet.)

- [ ] **Step 2: Reset the tms database**

`npx prisma migrate reset` requires explicit user consent when invoked from an agent session (Prisma's own AI-agent safety guard — encountered in Phase 1). Ask the user to either approve running it, or reset `tms` manually via DataGrip (drop and recreate the database) as was done in Phase 1's redo.

- [ ] **Step 3: Generate and apply the fresh init migration**

```bash
npx prisma migrate dev --name init
```

Expected output ending with `Your database is now in sync with your schema.` and `✔ Generated Prisma Client`.

- [ ] **Step 4: Verify the migration uses native UUID columns**

```bash
grep -A 3 'CREATE TABLE "users"' prisma/migrations/*_init/migration.sql
```

Expected: `"id" UUID NOT NULL DEFAULT gen_random_uuid(),` — not `TEXT`, not a Prisma-side default. Also confirm no `CREATE EXTENSION` statement appears anywhere in the migration (Postgres 13+ ships `gen_random_uuid()` in core):

```bash
grep -i "extension" prisma/migrations/*_init/migration.sql
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add prisma/migrations
git commit -m "chore(db): regenerate init migration with UUID primary keys"
```

---

## Task 3: Backend — auth/JWT layer type migration

**Files:**
- Modify: `backend/src/auth/auth.service.ts:53,84,91,102`
- Modify: `backend/src/auth/strategies/jwt.strategy.ts:20`
- Modify: `backend/src/auth/auth.controller.ts:62,70`
- Test: `backend/src/auth/auth.service.spec.ts`

**Interfaces:**
- Consumes: the regenerated Prisma Client from Task 2 (`User.id: string`, etc. — flows through automatically for code with no explicit type annotation, like `buildProfile()`'s `user.id`).
- Produces: JWT `sub` claim carries a UUID string; `AuthService.logout`/`getMe`/`generateTokens` accept `userId: string`.

This is the one module reserved for hand-editing rather than the compiler sweep, since it's the security-critical path and every id-typed annotation in it is worth eyeballing individually.

- [ ] **Step 1: Update auth.service.ts**

Four explicit `number` annotations change to `string` — nothing else in this file needs touching (the rest, like `buildProfile()`'s `user.id`/`user.lecturer.id`/`user.student.id`, has no explicit annotation and will flow through from the Prisma Client types automatically):

```typescript
// line 53
let payload: { sub: string; jti: string };

// line 84
async logout(userId: string) {

// line 91
async getMe(userId: string) {

// line 102
private async generateTokens(userId: string, username: string, role: Role) {
```

- [ ] **Step 2: Update jwt.strategy.ts**

```typescript
// line 20
async validate(payload: { sub: string; username: string; role: string }) {
```

- [ ] **Step 3: Update auth.controller.ts**

```typescript
// line 62
@CurrentUser() user: { id: string },

// line 70
getMe(@CurrentUser() user: { id: string }) {
```

- [ ] **Step 4: Build and run the auth test suite**

```bash
cd backend
pnpm run build
pnpm run test -- auth.service.spec
```

Fix any resulting type errors (test fixtures using numeric literal ids for users will need string UUID literals — any syntactically valid string works for a mock, e.g. `'11111111-1111-1111-1111-111111111111'`, since these tests mock Prisma and never hit real UUID validation).

- [ ] **Step 5: Commit**

```bash
git add src/auth
git commit -m "refactor(auth): migrate JWT sub and user id types from number to string"
```

---

## Task 4: Backend — path param validation and DTO decorators

**Files:**
- Modify: `backend/src/enrollment/enrollment.controller.ts:9,42-43`
- Modify: `backend/src/lecturer/lecturer.controller.ts:10,45,51,59,67`
- Modify: `backend/src/lecturer-semester/lecturer-semester.controller.ts:8,18,33,50`
- Modify: `backend/src/semester/semester.controller.ts:10,33,44,52,58,64,70`
- Modify: `backend/src/student/student.controller.ts:10,46,52,59,65`
- Modify: `backend/src/thesis/thesis.controller.ts:9,20,33,45`
- Modify: `backend/src/topic/topic.controller.ts:10,22,34,48,58`
- Modify: `backend/src/enrollment/dto/query-enrollment.dto.ts` (semesterId only)
- Modify: `backend/src/thesis/dto/query-thesis.dto.ts` (all 3 fields)
- Modify: `backend/src/thesis/dto/create-thesis.dto.ts` (both fields)
- Modify: `backend/src/lecturer-semester/dto/query-lecturer-semester.dto.ts` (semesterId)
- Modify: `backend/src/lecturer-semester/dto/upsert-lecturer-semester.dto.ts` (semesterId)
- Modify: `backend/src/topic/dto/query-topic.dto.ts` (both fields)
- Modify: `backend/src/lecturer/dto/account-bulk.dto.ts`
- Modify: `backend/src/student/dto/account-bulk.dto.ts`
- Modify: `backend/src/student/dto/activate-bulk.dto.ts`

**Interfaces:**
- Consumes: Task 3's pattern (explicit id-typed annotations become `string`).
- Produces: `ParseUUIDPipe`-validated path params returning `400` for malformed UUIDs (same rejection posture `ParseIntPipe` had for non-numeric input); `@IsUUID('4', ...)`-validated DTO fields.

**⚠️ Read before starting:** `@IsInt()` also appears on `page`/`limit` fields (pagination, e.g. `enrollment/dto/query-enrollment.dto.ts`, `lecturer/dto/query-lecturer.dto.ts`, `student/dto/query-student.dto.ts`) and on `maxStudents` (a real quantity, e.g. `lecturer/dto/create-lecturer.dto.ts`, `update-lecturer.dto.ts`). **Do not touch those** — only convert `@IsInt()` occurrences on genuine id/FK fields, listed explicitly below. Getting this wrong is a silent runtime bug (`class-validator` decorators are invisible to `tsc`), not a compile error.

### Controllers: `ParseIntPipe` → `ParseUUIDPipe`

- [ ] **Step 1: Swap the plain `:id` path-param pattern**

In each of these 6 controllers, replace the `ParseIntPipe` import with `ParseUUIDPipe`, and replace every `@Param('id', ParseIntPipe) id: number` (or `@Param('lecturerId', ParseIntPipe) lecturerId: number`) with the `ParseUUIDPipe`/`string` equivalent:

- `lecturer.controller.ts`: lines 45, 51, 59, 67 (`id`)
- `semester.controller.ts`: lines 33, 44, 52, 58, 64, 70 (`id`)
- `student.controller.ts`: lines 46, 52, 59, 65 (`id`)
- `thesis.controller.ts`: lines 33, 45 (`id`)
- `topic.controller.ts`: lines 34, 48, 58 (`id`)
- `lecturer-semester.controller.ts`: lines 33, 50 (`lecturerId`)

Example (`semester.controller.ts:33`):
```typescript
// before
findOne(@Param('id', ParseIntPipe) id: number) {

// after
findOne(@Param('id', ParseUUIDPipe) id: string) {
```

- [ ] **Step 2: Swap the optional query-param variant**

`enrollment.controller.ts:42-43` uses `ParseIntPipe`'s optional-instance form on a query param, not a path param — the same pipe class has a `ParseUUIDPipe` equivalent:

```typescript
// before
@Query('semesterId', new ParseIntPipe({ optional: true }))
semesterId?: number,

// after
@Query('semesterId', new ParseUUIDPipe({ optional: true }))
semesterId?: string,
```

Update the import on line 9 from `ParseIntPipe` to `ParseUUIDPipe` in this file too.

- [ ] **Step 3: Update the shared `AuthUser` local types**

Three controllers declare a local `AuthUser` type with an id-typed `lecturer` field — update each:

```typescript
// lecturer-semester.controller.ts:18
type AuthUser = { role: Role; lecturer: { id: string } | null };

// thesis.controller.ts:20
type AuthUser = { role: Role; lecturer: { id: string } | null };

// topic.controller.ts:22
type AuthUser = { lecturer: { id: string } | null };
```

### DTOs: `@IsInt()` → `@IsUUID('4')` on id fields only

- [ ] **Step 4: Update query DTOs with a single id field**

```typescript
// enrollment/dto/query-enrollment.dto.ts — semesterId only (leave page/limit as @IsInt)
@IsOptional()
@IsUUID('4')
semesterId?: string;

// lecturer-semester/dto/query-lecturer-semester.dto.ts
@IsOptional()
@IsUUID('4')
semesterId?: string;

// lecturer-semester/dto/upsert-lecturer-semester.dto.ts
@IsUUID('4')
semesterId: string;
```

Remove the `@Type(() => Number)` decorator from each of these fields (UUIDs are strings already — no `class-transformer` coercion needed) and remove the `Type` import from `class-transformer` if it becomes unused in that file. Add `IsUUID` to each file's `class-validator` import list.

- [ ] **Step 5: Update query DTOs with multiple id fields**

```typescript
// thesis/dto/query-thesis.dto.ts — all 3 fields (semesterId, lecturerId, topicId)
@IsOptional()
@IsUUID('4')
semesterId?: string;

@IsOptional()
@IsUUID('4')
lecturerId?: string;

@IsOptional()
@IsUUID('4')
topicId?: string;

// topic/dto/query-topic.dto.ts — both fields (semesterId, lecturerId)
@IsOptional()
@IsUUID('4')
semesterId?: string;

@IsOptional()
@IsUUID('4')
lecturerId?: string;
```

Same `@Type(() => Number)` removal and import cleanup as Step 4.

- [ ] **Step 6: Update create-thesis.dto.ts**

```typescript
// thesis/dto/create-thesis.dto.ts
@IsUUID('4')
enrollmentId: string;

@IsUUID('4')
topicId: string;
```

- [ ] **Step 7: Update bulk-operation DTOs**

```typescript
// lecturer/dto/account-bulk.dto.ts, student/dto/account-bulk.dto.ts, student/dto/activate-bulk.dto.ts
@IsArray()
@ArrayNotEmpty()
@ArrayMaxSize(100)
@IsUUID('4', { each: true })
ids: string[];
```

Remove `@Type(() => Number)` and the `Type`/`class-transformer` import in each of these 3 files (no longer needed — the array elements are UUID strings, not coerced numbers). Replace `IsInt` with `IsUUID` in each file's `class-validator` import list.

- [ ] **Step 8: Commit**

```bash
git add src/enrollment src/lecturer src/lecturer-semester src/semester src/student src/thesis src/topic
git commit -m "refactor: swap ParseIntPipe for ParseUUIDPipe and IsInt for IsUUID on id fields"
```

---

## Task 5: Backend — compiler-driven type sweep and verification

**Files:**
- Modify: every `*.service.ts` and remaining `*.dto.ts` file in the 7 feature modules (enrollment, lecturer, lecturer-semester, semester, student, thesis, topic) — every `id`/`userId`/`lecturerId`/`semesterId`/`studentId`/`enrollmentId`/`topicId`/`reviewerId`/`thesisId` parameter and return-type annotation currently typed `number`.
- Test: every `*.service.spec.ts` and `*.controller.spec.ts` in those 7 modules.

**Interfaces:**
- Consumes: Task 4's controller/DTO signatures (now `string`-typed) — service methods they call must match.
- Produces: a fully `string`-typed backend that builds clean and passes the full Jest suite.

Unlike Tasks 3-4, this is not a hand-enumerated line list — every remaining `number`-typed id parameter is a `tsc` error the moment its caller (a Task 4 DTO or controller) becomes `string`-typed, and every `NotFoundException` message template (`` `Semester #${id} not found` `` etc.) keeps working unchanged since template literals don't care about the underlying type. Trust the compiler to find every site.

- [ ] **Step 1: Change service method signatures to match Task 4's callers**

For each of the 7 modules' `*.service.ts` files, change every method parameter currently typed `id: number`, `userId: number`, `lecturerId: number`, `semesterId: number`, `studentId: number`, `enrollmentId: number`, `topicId: number`, `reviewerId: number`, or `thesisId: number` to `string` (or `string | undefined`/`string?` where the parameter is already optional — preserve existing optionality, only change the base type). This includes composite-key lookups like `lecturer-semester.service.ts`'s `where: { lecturerId_semesterId: { lecturerId, semesterId } }` — no code change needed there beyond the parameter types, Prisma's generated composite-key type follows automatically.

- [ ] **Step 2: Build and fix all resulting errors**

```bash
cd backend
pnpm run build
```

Fix every reported error by changing the offending type annotation from `number` to `string`. Do not touch any field TypeScript does not flag — `page`, `limit`, `maxStudents`, `fileSize`, `version`, and similar genuine-quantity fields must stay `number`.

- [ ] **Step 3: Run the full test suite and fix fixture types**

```bash
pnpm run test
```

Every failure will be a type error in a test fixture using a numeric literal for an id (e.g. `{ id: 1, semesterId: 2 }`). Replace numeric id literals with distinct string UUID literals (any well-formed string works, e.g. `'11111111-1111-1111-1111-111111111111'`, `'22222222-2222-2222-2222-222222222222'` — tests mock Prisma directly and never validate real UUID format). Keep each fixture's ids distinct from each other the same way the original numeric literals were (e.g. if a test used `id: 1` and `id: 2` to represent two different records, keep them as two different UUID strings, not the same one twice).

- [ ] **Step 4: Confirm test output is pristine**

```bash
pnpm run test 2>&1 | tail -20
```

Expected: all suites passing, no stray console warnings introduced by the type changes.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "refactor: complete number-to-string id type migration across backend services and tests"
```

---

## Task 6: Backend verification — boot, admin bootstrap, and smoke tests

**Files:** None (verification only).

**Interfaces:**
- Consumes: the fully UUID-typed backend from Tasks 1-5, and the reset `tms` database from Task 2.

- [ ] **Step 1: Generate the Prisma client and boot the backend**

```bash
cd backend
npx prisma generate
pnpm run start:dev
```

Expected: `Nest application successfully started`, no Prisma/type errors, all modules (including `ThesisModule`, `LecturerSemesterModule`) load.

- [ ] **Step 2: Bootstrap the admin user — no id value needed this time**

Generate the bcrypt hash the same way as Phase 1:

```bash
node -e "require('bcrypt').hash('YOUR_PASSWORD', 10).then(h => console.log(h))"
```

Insert via DataGrip — `id` is omitted entirely now (the database generates it via `gen_random_uuid()`), but `updated_at` still needs its explicit value per the Phase 1 finding (that gotcha is unrelated to this phase's change and still applies):

```sql
INSERT INTO users (username, password_hash, role, is_active, updated_at)
VALUES ('admin', '<hash>', 'ADMIN', true, CURRENT_TIMESTAMP);
```

- [ ] **Step 3: Verify login returns a UUID user id**

```bash
curl -i -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YOUR_PASSWORD"}'
```

Expected: `HTTP/1.1 201 Created`, response body's `user.id` is a UUID string (e.g. `"a1b2c3d4-..."`), not a small integer.

- [ ] **Step 4: Smoke-test endpoints with the UUID id**

```bash
curl -i http://localhost:3000/semesters -H "Authorization: Bearer <token>"
curl -i http://localhost:3000/students -H "Authorization: Bearer <token>"
curl -i http://localhost:3000/theses -H "Authorization: Bearer <token>"
```

Expected: all `200 OK`.

- [ ] **Step 5: Verify ParseUUIDPipe rejects malformed ids**

```bash
curl -i http://localhost:3000/semesters/not-a-uuid -H "Authorization: Bearer <token>"
```

Expected: `400 Bad Request` — confirms `ParseUUIDPipe` is actually wired in and validating, not silently accepting anything.

- [ ] **Step 6: Run the full Jest suite one more time**

```bash
pnpm run test
```

Expected: all suites passing (should already be true from Task 5, this is a final confirmation after the live boot/insert cycle touched nothing code-related).

---

## 🛑 STOP — Backend cycle complete, user verification required

Per this repo's workflow rules, the frontend implementation cycle (Task 7 onward) must not begin until the user has independently verified the backend via Postman — happy paths, edge cases, validation errors (malformed UUID → 400), and auth scenarios. Wait for explicit confirmation before proceeding.

---

## Task 7: Frontend — type sweep and latent bug fixes

**Files:**
- Modify: `frontend/src/features/account/api.ts`
- Modify: `frontend/src/features/account/components/AccountManagementPage.tsx:99,202,210,224,243,245`
- Modify: `frontend/src/features/auth/store/authStore.ts`
- Modify: `frontend/src/features/enrollment/api.ts`
- Modify: `frontend/src/features/lecturer/api.ts`
- Modify: `frontend/src/features/semester/api.ts`
- Modify: `frontend/src/features/student/api.ts`
- Modify: `frontend/src/features/thesis/api.ts`
- Modify: `frontend/src/features/thesis/components/AdminAssignmentsPage.tsx:54,58,94,98,100,214`
- Modify: `frontend/src/features/thesis/components/ThesisDetailPage.tsx:43`
- Modify: `frontend/src/features/thesis/components/AssignStudentDialog.tsx:32`
- Modify: `frontend/src/features/thesis/components/ManageCapacityDialog.tsx:25-26,49,53,54,94,99`
- Modify: `frontend/src/features/thesis/store/thesisStore.ts`
- Modify: `frontend/src/features/topic/api.ts`
- Modify: `frontend/src/features/topic/store/topicStore.ts`

**Interfaces:**
- Consumes: the backend's UUID-string response shapes from Task 6.
- Produces: a fully `string`-typed frontend with no numeric id coercion.

### The two real bugs (not caught by the type sweep alone)

- [ ] **Step 1: Remove the `Number(id)` coercion in ThesisDetailPage.tsx**

```typescript
// before (line 43)
.get(Number(id))

// after
.get(id)
```

`id` here is already a `string` from `useParams<{ id: string }>()` (line 23) — this coercion currently converts it to a number before the API call, which would produce `NaN` for a UUID. Removing it is the fix; no other change needed at this call site once `thesisApi.get`'s parameter type changes to `string` in Step 3.

- [ ] **Step 2: Remove the `Number(v)` coercion in AdminAssignmentsPage.tsx**

```typescript
// before (line 214)
setLecturerFilter(v === 'all' ? 'all' : Number(v))
```

`v` comes from a `<Select>` value (always a string). Once `lecturerFilter`'s type changes from `number | 'all'` to `string | 'all'` (as part of Step 4's Record/state type changes in this file), remove the `Number()` wrapper:

```typescript
// after
setLecturerFilter(v === 'all' ? 'all' : v)
```

### Compiler-driven type sweep

- [ ] **Step 3: Change every `id: number` interface field to `id: string`**

Across the 7 `api.ts` files and `authStore.ts`, change every interface field currently typed `number` that represents an id or FK (`id`, `enrollmentId`, `semesterId`, `lecturerId`, `topicId`, etc. — not `page`/`limit`/`maxStudents`/quantity fields) to `string`. Also change every exported API function's `id`/`ids` parameter type (e.g. `lecturerApi.get: (id: number) =>` becomes `(id: string) =>`, `accountApi.activateStudentsBulk: (ids: number[]) =>` becomes `(ids: string[]) =>`).

- [ ] **Step 4: Change component-level id-typed state and Record types**

In `AccountManagementPage.tsx`, `AdminAssignmentsPage.tsx`, `ManageCapacityDialog.tsx`, and `AssignStudentDialog.tsx`, change every `Record<number, X>`, `useState<Set<number>>`, `useState<number | null>`, or similar id-keyed local type to its `string` equivalent (e.g. `Record<number, string>` → `Record<string, string>`).

- [ ] **Step 5: Run the frontend typecheck and fix all resulting errors**

```bash
cd frontend
pnpm run build
```

(Vite's build runs `tsc` first — this will fail loudly on any remaining `number`/`string` mismatch, including every `Record<number, X>` indexed by a now-string key, every comparison between an old numeric literal and a new string id, and every prop type mismatch between a parent passing a UUID string and a child still expecting `number`.) Fix every reported error by propagating `string` through. Do not change any field the compiler does not flag.

- [ ] **Step 6: Manually re-check the two Step 1/2 fixes survived the sweep**

```bash
grep -n "Number(" frontend/src/features/thesis/components/ThesisDetailPage.tsx frontend/src/features/thesis/components/AdminAssignmentsPage.tsx
```

Expected: no output (both `Number()` coercions removed, and Step 5's build wouldn't have caught their *absence* — only type mismatches, not leftover-but-now-harmless numeric coercions on a value that happens to also parse as itself).

- [ ] **Step 7: Commit**

```bash
git add frontend/src
git commit -m "refactor: migrate frontend id types from number to string, remove numeric id coercion"
```

---

## Task 8: Frontend E2E verification

**Files:** None (verification only).

- [ ] **Step 1: Start both servers**

```bash
cd backend && pnpm run start:dev
cd frontend && pnpm run dev
```

- [ ] **Step 2: Manual browser walkthrough**

Log in as the admin bootstrapped in Task 6. Confirm the following render and function correctly with UUID ids flowing through the UI (URLs, selects, bulk-action checkboxes):
- Semester list/detail/create/activate/deactivate/close
- Student list, bulk activate, bulk account toggle
- Lecturer list, account toggle
- Topic bank browse and detail
- Thesis assignment flow (`AdminAssignmentsPage`, `AssignStudentDialog`, `ManageCapacityDialog`) — this is the area with the most id-keyed component state (Task 7 Step 4), worth exercising thoroughly
- Thesis detail page — confirms the Step 1 `Number(id)` fix works end-to-end, not just at the type level

- [ ] **Step 3: Confirm no console errors**

Open browser devtools during the walkthrough above — watch for any runtime error suggesting a missed numeric-coercion spot (e.g. `NaN` appearing in a network request URL, or a `Record` lookup silently returning `undefined` because of a stale numeric key).
