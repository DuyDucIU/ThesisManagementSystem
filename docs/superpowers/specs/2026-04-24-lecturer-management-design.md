# Lecturer Management — Design Spec

**Date:** 2026-04-24
**Branch:** feature/lecturer-management
**Status:** Approved

---

## Overview

Admin CRUD for lecturer profiles. Creating a lecturer atomically creates a linked `User` account (role `LECTURER`) in the same transaction — the lecturer can log in immediately using their `lecturerId` as both username and initial password.

Account management (toggle active/inactive, password reset) is out of scope — it belongs to a future dedicated Account Management feature that covers all user types uniformly.

---

## Data Model

No schema migration required. The existing `Lecturer` model already has `userId Int` (non-nullable, unique), which enforces the one-to-one relationship with `User`.

```prisma
model Lecturer {
  id          Int     @id @default(autoincrement())
  userId      Int     @unique @map("user_id")       // non-nullable — User always exists
  lecturerId  String  @unique @map("lecturer_id")
  fullName    String  @map("full_name")
  email       String  @unique
  title       String?
  maxStudents Int     @default(5) @map("max_students")

  user User @relation(fields: [userId], references: [id])
  ...
}
```

### `maxStudents` policy

`maxStudents` is a global field on the Lecturer record — not tracked per semester. Admin updates it manually when a lecturer's capacity changes for an upcoming semester. The previous value carries forward until changed. Enforcement of this constraint is deferred to the Topic/Thesis assignment feature.

---

## API Contract

All endpoints are Admin-only (`@Roles(Role.ADMIN)` at controller level).

### Endpoints

| Method | Path | Description | Response |
|--------|------|-------------|----------|
| `GET` | `/lecturers` | Paginated list with search | `200` |
| `GET` | `/lecturers/:id` | Get one by id | `200` |
| `POST` | `/lecturers` | Create lecturer + user atomically | `201` |
| `PATCH` | `/lecturers/:id` | Update profile fields | `200` |
| `DELETE` | `/lecturers/:id` | Delete lecturer + user | `204` |

### Create — request body

```json
{
  "lecturerId": "GV001",
  "fullName": "Nguyen Van A",
  "email": "nguyen@hcmiu.edu.vn",
  "title": "Dr.",
  "maxStudents": 5
}
```

- `lecturerId`, `fullName`, `email` — required
- `title` — optional
- `maxStudents` — optional, default `5`, min `1`

### Response shape (all read/write endpoints)

```json
{
  "id": 1,
  "lecturerId": "GV001",
  "fullName": "Nguyen Van A",
  "email": "nguyen@hcmiu.edu.vn",
  "title": "Dr.",
  "maxStudents": 5
}
```

`userId` is not exposed — internal join key only.

### List query params

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `search` | string | — | Matches `fullName`, `lecturerId`, `email` (OR) |
| `page` | number | `1` | Page number |
| `limit` | number | `20` | Items per page |

### Error cases

| Code | Trigger |
|------|---------|
| `404` | Lecturer not found (get / update / delete) |
| `409` | `lecturerId` already in use (create / update) |
| `409` | `email` already in use (create / update) |
| `409` | Delete blocked — lecturer has existing Topics |
| `409` | Delete blocked — lecturer assigned as thesis reviewer |

---

## Backend Architecture

### File structure

```
backend/src/lecturer/
├── lecturer.module.ts
├── lecturer.controller.ts
├── lecturer.controller.spec.ts
├── lecturer.service.ts
├── lecturer.service.spec.ts
└── dto/
    ├── create-lecturer.dto.ts
    ├── update-lecturer.dto.ts
    └── query-lecturer.dto.ts
```

### Service logic

**`create(dto)`**

Runs a `prisma.$transaction`:
1. Hash `dto.lecturerId` with `bcrypt` (salt rounds = 10) → `passwordHash`
2. `prisma.user.create` → `{ username: dto.lecturerId, passwordHash, role: Role.LECTURER, isActive: true }`
3. `prisma.lecturer.create` → `{ ...dto, userId: user.id }`
4. Return shaped response (no `userId`)

Catch Prisma P2002 to surface `409` with field-specific messages.

**`findAll(query)`**

- `WHERE OR [ fullName CONTAINS search, lecturerId CONTAINS search, email CONTAINS search ]`
- Paginated: `skip = (page - 1) * limit`, `take = limit`
- Returns `{ data, total, page, limit }`

**`findOne(id)`**

- `prisma.lecturer.findUnique({ where: { id } })`
- Throw `NotFoundException` if null

**`update(id, dto)`**

- 404 guard first
- Require at least one field in `dto` (throw `BadRequestException` otherwise)
- `prisma.lecturer.update`
- Catch P2002 for `lecturerId` / `email` conflicts → `409`

**`remove(id)`**

1. 404 if not found
2. `prisma.topic.count({ where: { lecturerId: id } })` → 409 if > 0
3. `prisma.thesis.count({ where: { reviewerId: id } })` → 409 if > 0
4. `prisma.$transaction([ prisma.lecturer.delete, prisma.user.delete ])` — Lecturer deleted first to release the FK before User is removed

### P2002 field detection

Same pattern as `StudentService` — normalise `e.meta?.target` to a string and check for `lecturer_id` or `email`.

---

## Frontend Architecture

### File structure

```
frontend/src/features/lecturer/
├── components/
│   ├── LecturerListPage.tsx     # table + search + pagination + action dialogs
│   ├── LecturerCreateModal.tsx  # Dialog — create form
│   └── LecturerEditModal.tsx    # Dialog — edit form (prefilled)
├── store/
│   └── lecturerStore.ts         # Zustand store — list, total, page, search, loading
└── api.ts                       # fetchLecturers, getLecturer, createLecturer, updateLecturer, deleteLecturer
```

### Route

`/admin/lecturers` → `LecturerListPage`

Registered in `frontend/src/router/index.tsx` under the existing admin route group.

### Sidebar

"Lecturers" nav item added to `AppLayout.tsx`, positioned between Students and Enrollments.

### Table columns

| Column | Source |
|--------|--------|
| Lecturer ID | `lecturerId` |
| Full Name | `fullName` |
| Email | `email` |
| Title | `title` (dash if null) |
| Max Students | `maxStudents` |
| Actions | Edit · Delete |

### Create flow

1. Admin clicks "Add Lecturer", fills form in `LecturerCreateModal`
2. `POST /lecturers` on submit
3. On success: close modal, show Sonner toast with the initial password — `"Account created. Initial password: GV001"` — so admin can communicate credentials
4. Refresh list

### Edit flow

1. Admin clicks Edit on a row → `LecturerEditModal` opens prefilled
2. `PATCH /lecturers/:id` on submit
3. On success: close modal, update row in place, success toast

### Delete flow

1. Admin clicks Delete → `AlertDialog` confirmation
2. `DELETE /lecturers/:id` on confirm
3. On success: remove row, success toast
4. On `409`: close dialog, show error toast with the reason message from the API

---

## Out of Scope

- Excel bulk import (future)
- Account toggle active/inactive (future — Account Management feature)
- Password reset (future — Account Management feature)
- Per-semester `maxStudents` tracking (future — reassess during Topic feature)
