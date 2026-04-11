# Database — Prisma + MySQL

## Setup

- **ORM**: Prisma 6.x with `prisma-client-js` generator
- **Database**: MySQL (connection via `DATABASE_URL` in `backend/.env`)
- **Config**: `DATABASE_URL` is set in `backend/.env`; the `datasource` block in schema reads it via `url = env("DATABASE_URL")`

> **Why Prisma 6, not 7?** Prisma 7 dropped support for reading `DATABASE_URL` from env in the schema datasource block — it requires a driver adapter (`@prisma/adapter-*`) even for standard MySQL. This is incompatible with our straightforward setup. Prisma 6 works with the standard `url = env("DATABASE_URL")` pattern and was chosen over v7 for this reason.

### Connection String Format

```
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DATABASE"
```

Set this in `backend/.env` (gitignored).

## Schema Overview

Schema file: `backend/prisma/schema.prisma`

### Enums

| Enum | Values |
|------|--------|
| `Role` | ADMIN, LECTURER, STUDENT |
| `SemesterStatus` | INACTIVE, ACTIVE, CLOSED |
| `SemesterStudentStatus` | AVAILABLE, ASSIGNED, COMPLETED, FAILED |
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
 ├── 1:N → SemesterStudent
 └── 1:N → Topic

Lecturer (lecturers)
 ├── N:1 → User
 ├── 1:N → Topic
 ├── 1:N → Thesis (as reviewer)
 ├── 1:N → ThesisReview
 └── 1:N → Document (as lecturer reviewer)

Student (students)
 ├── N:1 → User (optional — student may exist before account)
 └── 1:N → SemesterStudent

SemesterStudent (semester_students)
 ├── N:1 → Student
 ├── N:1 → Semester
 └── 1:1 → Thesis
 └── @@unique([studentId, semesterId])

Topic (topics)
 ├── N:1 → Semester
 ├── N:1 → Lecturer
 └── 1:N → Thesis

Thesis (theses)
 ├── 1:1 → SemesterStudent (unique)
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

- **Student/Lecturer ↔ User is deferred** — Excel import creates Student/Lecturer records with no User account. Admin activation is what creates the User record and credentials. Student.userId is optional for this reason; Lecturer.userId is required once activated.
- **SemesterStudent is a join table with state** — tracks a student's status within a specific semester; thesis is linked here, not directly to Student
- **Document has two-level review** — lecturer review + admin review, each with feedback, reviewer reference, and timestamp
- **Files stored in S3** — Document stores `s3Key`, `originalName`, `mimeType`, `fileSize`
- **All table names use `@@map` for snake_case** — Prisma model names are PascalCase, DB tables are snake_case

## Prisma Service

`PrismaService` (`src/prisma/prisma.module.ts`) is a **global module** — no need to import it in feature modules. Just inject `PrismaService` directly:

```typescript
@Injectable()
export class ThesisService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.thesis.findMany();
  }
}
```

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
