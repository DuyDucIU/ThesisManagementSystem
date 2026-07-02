# Database — Prisma + PostgreSQL

## Setup

- **ORM**: Prisma 6.x with `prisma-client-js` generator
- **Database**: PostgreSQL (connection via `DATABASE_URL` in `backend/.env`)
- **Config**: `DATABASE_URL` is set in `backend/.env`; the `datasource` block in schema reads it via `url = env("DATABASE_URL")`

> **Why Prisma 6, not 7?** Prisma 7 dropped support for reading `DATABASE_URL` from env in the schema datasource block — it requires a driver adapter (`@prisma/adapter-*`) even for standard Postgres. This is incompatible with our straightforward setup. Prisma 6 works with the standard `url = env("DATABASE_URL")` pattern and was chosen over v7 for this reason.

> **Migrated from MySQL to PostgreSQL** (Phase 1, 2026-07) — engine swap only, no schema/PK changes, no data migrated (old MySQL data was abandoned, not imported). See `docs/superpowers/specs/2026-07-01-postgres-migration-design.md` for the full rationale (security/integrity over performance) and `docs/superpowers/plans/2026-07-01-postgres-migration-phase1.md` for what was actually done. A follow-up phase converting `Int` autoincrement PKs to UUIDs is tracked separately.

### Connection String Format

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
```

Set this in `backend/.env` (gitignored).

## Schema Overview

Schema file: `backend/prisma/schema.prisma`

### Enums

| Enum | Values |
|------|--------|
| `Role` | ADMIN, LECTURER, STUDENT |
| `SemesterStatus` | INACTIVE, ACTIVE, CLOSED |
| `EnrollmentStatus` | AVAILABLE, ASSIGNED, COMPLETED, FAILED |
| `TopicStatus` | OPEN, CLOSED, FULL |
| `ThesisStatus` | IN_PROGRESS, SUBMITTED, APPROVED, UNDER_REVIEW, REVIEWED |
| `DocumentType` | REGISTRATION, CONFIRMATION, THESIS_REPORT |
| `DocumentStatus` | PENDING, LECTURER_APPROVED, LECTURER_REJECTED, ADMIN_APPROVED, ADMIN_REJECTED |

### Models & Relationships

```
User (users)
 ├── 1:1 → Lecturer (via userId)
 ├── 1:1 → Student (via userId, optional)
 ├── 1:N → Document (as admin reviewer)
 └── 1:N → Notification

Semester (semesters)
 ├── 1:N → Enrollment
 └── 1:N → Topic

Lecturer (lecturers)
 ├── N:1 → User
 ├── 1:N → Topic
 ├── 1:N → Thesis (as reviewer)
 ├── 1:N → ThesisReview
 ├── 1:N → Document (as lecturer reviewer)
 └── 1:N → LecturerSemester

LecturerSemester (lecturer_semesters)
 ├── N:1 → Lecturer
 ├── N:1 → Semester
 └── @@unique([lecturerId, semesterId])

Student (students)
 ├── N:1 → User (optional — student may exist before account)
 └── 1:N → Enrollment

Enrollment (enrollments)
 ├── N:1 → Student
 ├── N:1 → Semester
 └── 1:1 → Thesis
 └── @@unique([studentId, semesterId])

Topic (topics)
 ├── N:1 → Semester
 ├── N:1 → Lecturer
 └── 1:N → Thesis

Thesis (theses)
 ├── 1:1 → Enrollment (unique)
 ├── N:1 → Topic
 ├── N:1 → Lecturer (reviewer, optional)
 ├── 1:N → Document
 └── 1:1 → ThesisReview

Document (documents)
 ├── N:1 → Thesis
 ├── N:1 → Lecturer (lecturer reviewer, optional)
 └── N:1 → User (admin reviewer, optional)

ThesisReview (thesis_reviews)
 ├── 1:1 → Thesis (unique)
 └── N:1 → Lecturer (reviewer)

Notification (notifications)
 └── N:1 → User
```

### Key Design Decisions

- **Student ↔ User is deferred; Lecturer ↔ User is immediate** — For students, Excel import creates a `Student` record with no User account. Admin activation (`POST /students/:id/activate`) creates the User record and credentials; `Student.userId` is optional for this reason. For lecturers, the `Lecturer` and `User` records are created atomically in a single `$transaction` — no separate activation step exists. `Lecturer.userId` is always populated and non-nullable.
- **Enrollment is a join table with state** — tracks a student's participation in a specific semester; thesis is linked here, not directly to Student. Previously named `SemesterStudent`; renamed to `Enrollment` to express the business concept rather than the DB implementation.
- **Document has two-level review** — lecturer review + admin review, each with feedback, reviewer reference, and timestamp
- **Files stored in S3** — Document stores `s3Key`, `originalName`, `mimeType`, `fileSize`
- **All table names use `@@map` for snake_case** — Prisma model names are PascalCase, DB tables are snake_case
- **Per-semester capacity overrides base capacity, with a fallback chain** — `Lecturer.maxStudents` is the base default. `LecturerSemester` optionally overrides it for one semester. `LecturerSemesterService.resolveCapacity(lecturerId, semesterId)` resolves in order: (1) a `LecturerSemester` row for the exact semester, (2) the most recent `LecturerSemester` row from an earlier semester (by `startDate`), (3) `Lecturer.maxStudents`. This lets a capacity set once carry forward to future semesters until explicitly overridden again.

## Key Commands

| Command | Purpose |
|---------|---------|
| `npx prisma migrate dev --name <name>` | Create migration from schema changes |
| `npx prisma migrate deploy` | Apply pending migrations (production) |
| `npx prisma generate` | Regenerate client after schema change |
| `npx prisma studio` | Visual DB browser (opens in browser) |
| `npx prisma db push` | Push schema without migration (prototyping only) |

## Conventions

- Migration names should be descriptive kebab-case: `add-thesis-table`, `add-reviewer-relation`
- Always commit migration files (`prisma/migrations/`) to git
- Never edit migration SQL files after they've been applied
- Use `@map` and `@@map` for custom table/column names if needed

## Gotchas

- **`npx prisma generate` after schema changes** — Prisma generates the client into `node_modules`; changes to `schema.prisma` are not reflected in code until you run `generate`. `migrate dev` runs it automatically, but if you edit the schema without migrating (e.g. `db push` or manual edits), run it manually.
- **`@updatedAt` is Prisma-Client-managed, not a DB default.** Unlike `@default(now())` (which compiles to a real `DEFAULT CURRENT_TIMESTAMP` in the DDL), `@updatedAt` has no SQL equivalent — the Prisma Client sets it before every `create()`/`update()` call. The column is `NOT NULL` with no default, so any write that bypasses the Prisma Client (raw SQL, a manual DB insert) must supply it explicitly or the insert fails a not-null constraint.
- **Rollback/downgrade requires reverting `schema.prisma`'s `provider`, not just `DATABASE_URL`.** The generated Prisma Client validates the connection string's protocol against the schema's declared `provider` at init time — swapping only the env var throws `P1012` (provider mismatch) before any DB connection is even attempted, even if the connection string itself is valid for the target engine.
- **`npx prisma migrate reset` is blocked for AI agents by design.** Prisma detects when it's invoked by an AI coding agent and refuses to run destructive commands (`migrate reset`, and similar) without an explicit `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` env var carrying the user's verbatim consent message. If you need to reset a dev database from an agent session, get explicit user confirmation first (or have the user do the reset manually).
- **MySQL → Postgres collation changed username/email lookups from case-insensitive to case-sensitive.** MySQL's migrations used `COLLATE utf8mb4_unicode_ci`, making unique constraints and equality lookups on `username`, `email`, `code`, `student_id`, `lecturer_id` case-insensitive. Postgres `TEXT` uses the database's default collation (case-sensitive), and no application code normalizes case (e.g. `auth.service.ts`'s login lookup is a plain `where: { username }`). Currently harmless (fresh empty DB), but a real behavior change to keep in mind before importing data with mixed-case duplicates, or if case-insensitive matching is ever required (fix path: `citext` extension, or `@db` annotations + `mode: 'insensitive'` in Prisma queries).
