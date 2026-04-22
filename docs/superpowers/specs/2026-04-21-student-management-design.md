# Student Management (Global) — Design Spec

**Date:** 2026-04-21  
**Scope:** Admin-only global student profile management (`/admin/students`)  
**Out of scope:** Account activation (future feature), semester-scoped student management (future feature)

---

## Overview

A global student list page where admins can view, search, filter, edit, and delete student profile records. This page manages the `Student` entity — who a person is in the system — independent of semester enrollment.

Semester-scoped management (enrollment status, removing from a semester) will be a separate feature at `/admin/semesters/:id/students`.

---

## No Schema Changes Required

The existing `Student` model has all required fields: `id`, `studentId`, `fullName`, `email`, `userId` (nullable — indicates whether a login account exists).

---

## API Contract

### `GET /students`

Paginated, filtered list of all students.

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `search` | string? | Case-insensitive match on `fullName`, `studentId`, `email` |
| `hasAccount` | boolean? | `true` = `userId != null`; `false` = `userId IS NULL` |
| `semesterId` | number? | Only students enrolled in that semester |
| `page` | number | Default `1` |
| `limit` | number | Default `20` |

**Response 200:**
```json
{
  "data": [
    {
      "id": 1,
      "studentId": "ITITIU21001",
      "fullName": "Nguyen Van A",
      "email": "nvana@student.hcmiu.edu.vn",
      "hasAccount": false,
      "semesterStudent": {
        "status": "AVAILABLE"
      }
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

- `semesterStudent` is only present in each item when `semesterId` filter is applied.
- `hasAccount` is derived server-side: `userId !== null`.

---

### `POST /students`

Create a new student profile record.

**Body:** `{ studentId: string, fullName: string, email: string }` — all fields required.

**Responses:**
- `201` — created student: `{ id, studentId, fullName, email, hasAccount: false }`
- `400` — `studentId` or `email` already taken; or validation error (missing field, invalid email)

---

### `PATCH /students/:id`

Update one or more profile fields.

**Body:** `{ fullName?: string, email?: string, studentId?: string }` — at least one field required.

**Responses:**
- `200` — updated student object: `{ id, studentId, fullName, email, hasAccount }`
- `400` — `studentId` or `email` already taken by another student
- `404` — student not found

---

### `DELETE /students/:id`

Delete a student and cascade-delete their `SemesterStudent` enrollment records.

**Guard:** blocked if the student has any `Thesis` record (via any of their `SemesterStudent` rows).

**Responses:**
- `204` — deleted
- `409` — `"Cannot delete student with active thesis work"`
- `404` — student not found

---

## Frontend Design

### Route

`/admin/students` — new `StudentListPage` component under `frontend/src/features/student/components/`.

### Sidebar

Add a "Students" nav link to `/admin/students` in `AppLayout`, positioned above the existing "Import Students" link.

### Page Layout

Follows the `SemesterListPage` pattern:

1. **Page header** — title "Students", subtitle "Manage student profiles."
2. **Filter bar** — three controls side by side:
   - Text search input (searches `fullName`, `studentId`, `email`)
   - "Account" select: All / With Account / No Account
   - "Semester" select: All Semesters + list of semesters (populated from existing semester API)
3. **Table** — columns: Student ID | Full Name | Email | Account | Actions
   - "Account" column: badge `Active` when `hasAccount=true`, `—` otherwise
   - "Actions" column: Edit button + Delete button per row
4. **Pagination** — Prev / Next controls + "Showing X–Y of Z" label

### StudentEditModal

Reuses the `SemesterFormModal` modal pattern.

- Fields: Full Name, Student ID, Email — all editable
- Save / Cancel buttons
- Field-level error display for `400` responses (duplicate studentId/email shown under the relevant field)
- Modal stays open on validation error

### Delete Confirmation

Reuses the `AlertDialog` pattern from `SemesterListPage`.

- Message: `"Delete [fullName]? This cannot be undone."`
- On `409` response: toast error `"Cannot delete — this student has thesis work on record."`

---

## State Management

**Zustand store:** `useStudentStore` — holds `students[]`, `total`, `page`, `loading`. Follows `useSemesterStore` pattern.

**Filter state:** local `useState` in `StudentListPage` (search, hasAccount, semesterId) — no need to persist across navigation.

**Data flow:**
1. Page mounts → fetch semesters (for filter dropdown) + fetch students with default params
2. Filter/search changes → debounced re-fetch (300ms), resets to page 1
3. Edit saved → re-fetch current page
4. Delete confirmed → re-fetch current page

---

## Error Handling

| Scenario | Handling |
|---|---|
| List fetch fails | Toast error; table shows empty state |
| Edit `400` (duplicate field) | Field-level error inside modal; modal stays open |
| Edit `404` | Toast error; re-fetch list |
| Delete `409` (has thesis) | Toast: `"Cannot delete — this student has thesis work on record."` |
| Delete `404` | Toast error; re-fetch list |
| Network error (any) | Toast error |

---

## Access Control

All endpoints require `Role.ADMIN` (same as existing student endpoints via `@Roles(Role.ADMIN)` on the controller).
