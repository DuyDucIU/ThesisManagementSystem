# Account Management — Design Spec

**Date:** 2026-04-25
**Branch:** `feature/account-management`
**Scope:** Admin-only account management page (`/admin/accounts`) for activating, deactivating, and reactivating login accounts for both students and lecturers.

---

## Overview

A dedicated Account Management page where admins control login access for all users in the system. Separate from the profile management pages (`/admin/students`, `/admin/lecturers`) which handle personal data (name, email, ID).

**Design rationale:** Following industry practice (Google Workspace, Okta, Microsoft 365), profile data management and account access control are separated by concern. The profile pages handle *who a person is*; the account page handles *whether they can log in*.

---

## Key Business Rules

- **Students** can exist without a login account (`Student.userId` is nullable). Admin explicitly activates them.
- **Lecturers** always have a login account created at the time their profile is created. Only deactivate/reactivate applies to lecturers.
- **Activation** creates a `User` record with `username = studentId` and `password = studentId` (bcrypt-hashed, cost 10).
- **Deactivation** sets `User.isActive = false` — the JWT strategy already blocks login for inactive users.
- **Reactivation** sets `User.isActive = true`.
- Account activation is one-way per student (activate → active state). Deactivate/reactivate toggles `isActive` on the existing `User`.

---

## Schema Changes

**None.** The existing schema already has everything needed:
- `User.isActive: Boolean` — already exists, already enforced by JWT strategy
- `Student.userId: Int?` — nullable by design; `null` means no account

---

## API Contract

### Extensions to existing list endpoints

Both list endpoints gain one new field per item:

**`GET /students`** — adds `isActive: boolean | null`
```json
{
  "id": 1,
  "studentId": "ITITIU21001",
  "fullName": "Nguyen Van A",
  "email": "nvana@student.hcmiu.edu.vn",
  "hasAccount": false,
  "isActive": null
}
```
- `null` when `userId` is null (no account)
- `true` / `false` when a `User` account exists

**`GET /lecturers`** — adds `isActive: boolean`
```json
{
  "id": 1,
  "lecturerId": "GV001",
  "fullName": "Nguyen Van B",
  "email": "nvb@hcmiu.edu.vn",
  "title": "Dr.",
  "maxStudents": 5,
  "isActive": true
}
```

---

### New student endpoints

All endpoints require `Role.ADMIN` (inherited from controller-level `@Roles`).

**Important:** Literal routes (`activate-bulk`, `account-bulk`) must be declared **before** the parameterized `:id` routes in the controller.

#### `POST /students/:id/activate`

Creates a `User` account for a student who has none.

- Username: `studentId`
- Password: bcrypt hash of `studentId` (cost 10)
- `User.role = STUDENT`, `User.isActive = true`
- Links `Student.userId` to the new `User.id` in a transaction

**Responses:**
- `201` — `{ id, studentId, fullName, email, hasAccount: true, isActive: true }`
- `404` — student not found
- `409` — "Student already has an account"

#### `PATCH /students/:id/account`

Toggles `isActive` on an existing student account.

**Body:** `{ isActive: boolean }`

**Responses:**
- `200` — `{ id, studentId, fullName, email, hasAccount: true, isActive: boolean }`
- `404` — student not found
- `409` — "Student has no account to modify"

#### `POST /students/activate-bulk`

Bulk activate students with no account. Skips IDs that already have accounts.

**Body:** `{ ids: number[] }`

**Responses:**
- `200` — `{ activated: number, skipped: number }`
- `400` — if `ids` is empty or invalid

#### `PATCH /students/account-bulk`

Bulk toggle `isActive` for a list of students. Skips IDs that have no account.

**Body:** `{ ids: number[], isActive: boolean }`

**Responses:**
- `200` — `{ updated: number, skipped: number }`
- `400` — if `ids` is empty or invalid

---

### New lecturer endpoints

#### `PATCH /lecturers/:id/account`

Toggles `isActive` on a lecturer's account.

**Body:** `{ isActive: boolean }`

**Responses:**
- `200` — `{ id, lecturerId, fullName, email, title, maxStudents, isActive: boolean }`
- `404` — lecturer not found

#### `PATCH /lecturers/account-bulk`

Bulk toggle `isActive` for a list of lecturers.

**Body:** `{ ids: number[], isActive: boolean }`

**Responses:**
- `200` — `{ updated: number, skipped: number }`
- `400` — if `ids` is empty or invalid

---

## Frontend Design

### Route

`/admin/accounts` — `AccountManagementPage` component under `frontend/src/features/account/components/`.

Wrapped in the existing `ProtectedRoute → AppLayout → AdminRoute` guard chain.

### Sidebar

Add "Accounts" nav link to `AppLayout.tsx` sidebar, positioned after "Lecturers".

### Page Layout

1. **Header** — title "Account Management", subtitle "Manage login access for students and lecturers."

2. **Tab toggle** — pill-style toggle: `Students` | `Lecturers`. Students tab is default. Switching resets selection and re-fetches with the appropriate API.

3. **Filter bar:**
   - Search input (name, ID, email) — debounced 300ms
   - Account status select:
     - Students tab: All / No Account / Active / Inactive
     - Lecturers tab: All / Active / Inactive

4. **Bulk action toolbar** — visible only when ≥1 checkbox is checked:
   - Shows "X selected"
   - Students tab: "Activate Selected" + "Deactivate Selected" buttons
   - Lecturers tab: "Deactivate Selected" + "Reactivate Selected" buttons
   - Selection clears after action completes

5. **Table — Students tab:**

   | ☐ | Student ID | Full Name | Email | Status | Actions |
   |---|---|---|---|---|---|
   | ☐ | ITITIU21001 | Nguyen Van A | … | `No Account` | Activate |
   | ☐ | ITITIU21002 | Tran Thi B | … | `Active` | Deactivate |
   | ☐ | ITITIU21003 | Le Van C | … | `Inactive` | Reactivate |

6. **Table — Lecturers tab:**

   | ☐ | Lecturer ID | Full Name | Email | Status | Actions |
   |---|---|---|---|---|---|
   | ☐ | GV001 | Prof. A | … | `Active` | Deactivate |
   | ☐ | GV002 | Prof. B | … | `Inactive` | Reactivate |

7. **Status badges:**
   - `No Account` — neutral grey (`text-muted-foreground` background)
   - `Active` — green/primary (`bg-primary/10 text-primary`)
   - `Inactive` — amber (`bg-amber-100 text-amber-700`)

8. **Pagination** — same Prev/Next + "Showing X–Y of Z" pattern as all other list pages.

### Confirmation dialogs

| Action | Dialog message |
|---|---|
| Activate single | "Activate account for [fullName]? They will be able to log in with their student ID." |
| Deactivate single | "Deactivate [fullName]'s account? They will lose login access immediately." |
| Reactivate single | No confirmation — non-destructive, inline action |
| Bulk activate | "Activate accounts for X students? They will be able to log in with their student ID." |
| Bulk deactivate | "Deactivate X accounts? These users will lose login access immediately." |
| Bulk reactivate | No confirmation — non-destructive |

### State management

No Zustand store — `AccountManagementPage` uses local `useState` only (data is page-scoped, not shared across the app). Same pattern as `EnrollmentImportPage`.

### Files to create / modify

| Action | File |
|---|---|
| Create | `frontend/src/features/account/components/AccountManagementPage.tsx` |
| Create | `frontend/src/features/account/api.ts` |
| Modify | `frontend/src/router/index.tsx` — add `/admin/accounts` route |
| Modify | `frontend/src/layouts/AppLayout.tsx` — add "Accounts" sidebar nav link |
| Modify | `frontend/src/features/student/api.ts` — add `isActive` to `StudentItem`; add activate/account action calls |
| Modify | `frontend/src/features/lecturer/api.ts` — add `isActive` to `LecturerItem`; add account action calls |

---

## Error Handling

| Scenario | Backend response | Frontend |
|---|---|---|
| Activate already-activated student | `409` "Student already has an account" | Toast error |
| Toggle account on student with no account | `409` "Student has no account to modify" | Toast error |
| Student / Lecturer not found | `404` | Toast error + re-fetch list |
| Bulk activate — some already activated | Skip, return `{ activated, skipped }` | Toast: "X activated, Y already had accounts" |
| Bulk deactivate — some have no account | Skip, return `{ updated, skipped }` | Toast: "X updated, Y skipped (no account)" |
| List fetch fails | — | Inline error row in table |
| Network error | — | Toast error |

---

## Access Control

- All new backend endpoints are admin-only via `@Roles(Role.ADMIN)` at controller level — no additional decorator work needed on individual handlers.
- Frontend route `/admin/accounts` is protected by the existing `AdminRoute` guard.
