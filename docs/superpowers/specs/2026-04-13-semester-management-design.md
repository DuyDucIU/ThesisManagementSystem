# Semester Management — Design Spec

**Date:** 2026-04-13
**Feature:** Admin Semester Management
**Status:** Approved

---

## Overview

Admin-only feature for managing academic semesters. Only one semester may be ACTIVE at any given moment. Admins configure semesters carefully before activating them; once active or closed, data integrity is preserved by restricting edits.

---

## Business Rules

- Only one semester may have status `ACTIVE` at a time.
- Status transitions allowed:
  - `INACTIVE` → `ACTIVE` (blocked if any other semester is currently `ACTIVE`)
  - `ACTIVE` → `INACTIVE` (deactivate)
  - `ACTIVE` → `CLOSED` (close — terminal state)
  - `CLOSED` is final — no transitions out of CLOSED
- Editing (`PATCH /semesters/:id`) is only allowed when status is `INACTIVE`. ACTIVE and CLOSED semesters are fully read-only.
- Deletion is only allowed when status is `INACTIVE` AND the semester has no linked `SemesterStudent` or `Topic` records.
- Closing a semester does not affect read access to its associated data (topics, theses, documents). All related records remain intact and queryable via their own feature endpoints.
- `code` must be unique. Duplicate code returns `409 Conflict`.
- `endDate` must be after `startDate`.

---

## Database Schema

No schema changes required. The `Semester` model and `SemesterStatus` enum are already defined:

```prisma
model Semester {
  id        Int            @id @default(autoincrement())
  code      String         @unique
  name      String
  startDate DateTime       @map("start_date") @db.Date
  endDate   DateTime       @map("end_date") @db.Date
  status    SemesterStatus @default(INACTIVE)
  createdAt DateTime       @default(now()) @map("created_at")
  updatedAt DateTime       @updatedAt @map("updated_at")

  semesterStudents SemesterStudent[]
  topics           Topic[]
}

enum SemesterStatus {
  INACTIVE
  ACTIVE
  CLOSED
}
```

---

## API Contract

All endpoints require `ADMIN` role.

### CRUD Endpoints

| Method   | Path              | Description                          | Success |
|----------|-------------------|--------------------------------------|---------|
| `GET`    | `/semesters`      | List semesters with filters          | `200`   |
| `GET`    | `/semesters/:id`  | Get single semester                  | `200`   |
| `POST`   | `/semesters`      | Create semester (status = INACTIVE)  | `201`   |
| `PATCH`  | `/semesters/:id`  | Update fields (INACTIVE only)        | `200`   |
| `DELETE` | `/semesters/:id`  | Delete semester (INACTIVE + no data) | `200`   |

### Status Transition Endpoints

| Method | Path                        | Transition              | Success |
|--------|-----------------------------|-------------------------|---------|
| `POST` | `/semesters/:id/activate`   | INACTIVE → ACTIVE       | `200`   |
| `POST` | `/semesters/:id/deactivate` | ACTIVE → INACTIVE       | `200`   |
| `POST` | `/semesters/:id/close`      | ACTIVE → CLOSED         | `200`   |

### List Query Parameters (`GET /semesters`)

| Param          | Type                            | Description                         |
|----------------|---------------------------------|-------------------------------------|
| `search`       | string                          | Match against `name` or `code`      |
| `status`       | `INACTIVE \| ACTIVE \| CLOSED`  | Filter by status                    |
| `startDateFrom`| date (ISO string)               | Semester startDate ≥ this value     |
| `startDateTo`  | date (ISO string)               | Semester startDate ≤ this value     |

No pagination — semester count is small in practice.

### Error Responses

| Scenario                                              | Code  |
|-------------------------------------------------------|-------|
| Semester not found                                    | `404` |
| Edit/delete attempted on ACTIVE or CLOSED semester    | `409` |
| Activate attempted while another semester is ACTIVE   | `409` |
| Delete attempted on semester with linked data         | `409` |
| Duplicate `code` on create                            | `409` |
| Invalid status transition                             | `409` |

### Response Shape (single semester)

```json
{
  "id": 1,
  "code": "HK1-2025",
  "name": "Học kỳ 1 năm 2025-2026",
  "startDate": "2025-09-01",
  "endDate": "2026-01-15",
  "status": "ACTIVE",
  "createdAt": "2025-08-01T00:00:00.000Z",
  "updatedAt": "2025-09-01T00:00:00.000Z"
}
```

---

## Backend Module

```
backend/src/semester/
├── semester.module.ts
├── semester.controller.ts
├── semester.service.ts
├── dto/
│   ├── create-semester.dto.ts      # code, name, startDate, endDate (all required)
│   ├── update-semester.dto.ts      # same fields, all optional (PartialType)
│   └── query-semester.dto.ts       # search, status, startDateFrom, startDateTo
```

### Service Method Summary

| Method              | Logic                                                                 |
|---------------------|-----------------------------------------------------------------------|
| `findAll(query)`    | Filter by search (name/code LIKE), status, startDate range            |
| `findOne(id)`       | Throw `NotFoundException` if not found                                |
| `create(dto)`       | Create with `INACTIVE` status; catch Prisma `P2002` → `409`          |
| `update(id, dto)`   | Throw `ConflictException` if status is ACTIVE or CLOSED               |
| `remove(id)`        | Throw `ConflictException` if not INACTIVE or has linked data          |
| `activate(id)`      | Check no other ACTIVE semester; transition INACTIVE → ACTIVE          |
| `deactivate(id)`    | Validate current status is ACTIVE; transition to INACTIVE             |
| `close(id)`         | Validate current status is ACTIVE; transition to CLOSED               |

---

## Frontend Module

```
frontend/src/features/semester/
├── api.ts                          # Axios calls for all endpoints
├── store/
│   └── semesterStore.ts            # Zustand store — list, loading, error state
└── components/
    ├── SemesterListPage.tsx         # Main page — table + filters toolbar
    ├── SemesterFormModal.tsx        # Create / edit modal (shared)
    └── SemesterStatusBadge.tsx      # Status chip: INACTIVE / ACTIVE / CLOSED
```

### SemesterListPage

- **Toolbar:** search input, status dropdown, date range picker (startDateFrom / startDateTo), "Create Semester" button
- **Table columns:** Code, Name, Start Date, End Date, Status, Actions
- **Per-row actions (contextual):**
  - Edit (pencil icon) — disabled if status is ACTIVE or CLOSED
  - Activate — visible only on INACTIVE rows
  - Deactivate — visible only on ACTIVE rows
  - Close — visible only on ACTIVE rows
  - Delete (trash icon) — visible only on INACTIVE rows

Confirmation dialog required before Deactivate, Close, and Delete actions.

### SemesterFormModal

- Fields: Code, Name, Start Date, End Date
- Client-side validation: all required, endDate > startDate
- Used for both Create and Edit (modal title changes accordingly)
- On submit: calls create or update API, refreshes list, closes modal

### SemesterStatusBadge

- `INACTIVE` → grey badge
- `ACTIVE` → green badge
- `CLOSED` → blue/muted badge

### Routing

- New route: `/admin/semesters`
- Guard: ADMIN role only
- Added to sidebar navigation under admin section

---

## Out of Scope

- Pagination (list is small)
- Bulk operations
- Semester-level permissions beyond ADMIN role
- Any changes to endpoints consumed by non-admin roles (topics, theses, documents read their semester data via their own endpoints)
