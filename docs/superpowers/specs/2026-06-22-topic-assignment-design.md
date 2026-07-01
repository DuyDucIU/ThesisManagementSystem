# Topic Assignment — Design Spec

## Overview

Students browse topics in the Topics Bank and contact lecturers via email to express interest. Lecturers then assign students to their topics through the system. Admins can also assign as a fallback. Assignment creates a `Thesis` record — the paperwork container for documents, reviews, and approvals.

## Decisions

| Decision | Choice |
|----------|--------|
| Who assigns? | Both lecturers (own topics) and admins (any topic) |
| Student request flow? | No — direct assignment only; students contact lecturers offline |
| Capacity model | Per-semester via `LecturerSemester` join table |
| Capacity fallback | Current semester → most recent semester → `Lecturer.maxStudents` |
| What is a Thesis? | Paperwork container, not a work-tracking entity |
| Unassign allowed? | Yes, only when `Thesis.status === IN_PROGRESS` |
| Lecturer UI | Dedicated "My Assignments" page (table-based) |
| Admin UI | Dedicated "Topic Assignments" page under `/admin` |
| Thesis detail page | Basic info now; documents/reviews added later |
| Topic Bank page | Stays separate — browsing catalog, not management |
| Student contact flow | "Contact" button on TopicCard opens email client with pre-filled template |

---

## Schema Changes

### New Model: `LecturerSemester`

| Field | Type | Notes |
|-------|------|-------|
| `id` | Int (PK) | Auto-increment |
| `lecturerId` | Int (FK → Lecturer) | |
| `semesterId` | Int (FK → Semester) | |
| `maxStudents` | Int | Default 5. Admin-configurable per semester |

- Unique constraint: `(lecturerId, semesterId)`
- Table name: `lecturer_semesters`

### Existing Model Changes

- **`Lecturer`** — Keep `maxStudents` as the global default (used as final fallback in capacity resolution)
- **`Topic`** — No schema changes. `status` updated automatically based on capacity.
- **`Thesis`** — No schema changes. `title` auto-copied from topic at assignment time.
- **`Enrollment`** — No schema changes. `status` transitions on assign/unassign.

### Capacity Resolution Logic

```
1. LecturerSemester record for the target semester? → use its maxStudents
2. LecturerSemester record for the most recent prior semester (by startDate DESC)? → use its maxStudents
3. Fallback → Lecturer.maxStudents (default 5)
```

"Most recent" means: order semesters by `startDate DESC`, find the first one (before the target semester) that has a `LecturerSemester` row for this lecturer.

---

## API Contract

### Thesis (Assignment) Endpoints

| Method | URL | Role | Description |
|--------|-----|------|-------------|
| `POST` | `/theses` | LECTURER, ADMIN | Assign student to topic |
| `DELETE` | `/theses/:id` | LECTURER, ADMIN | Unassign student |
| `GET` | `/theses` | LECTURER, ADMIN | List assignments with filters |
| `GET` | `/theses/:id` | LECTURER, ADMIN | Get single assignment detail |

#### `POST /theses` — Assign

```json
// Request
{
  "enrollmentId": 12,
  "topicId": 5
}

// Response (201)
{
  "id": 1,
  "title": "AI in Healthcare",
  "status": "IN_PROGRESS",
  "createdAt": "2026-06-15T10:00:00Z",
  "topic": { "id": 5, "title": "AI in Healthcare" },
  "student": { "id": 3, "studentId": "2021001", "fullName": "Nguyen Van A" },
  "enrollment": { "id": 12, "semesterId": 1 }
}
```

**Validations:**
- Enrollment exists and status is `AVAILABLE`
- Topic exists, status is `OPEN`, same semester as enrollment
- Lecturer has not exceeded resolved capacity
- Lecturer: can only assign to own topics. Admin: any topic.

**Side effects on assign (all within a single `prisma.$transaction`):**
- `Enrollment.status`: `AVAILABLE` → `ASSIGNED`
- Recompute topic statuses for this lecturer (see "Idempotent Status Recompute" below)

#### `DELETE /theses/:id` — Unassign

- Returns `204 No Content`
- Guard: only if `Thesis.status === IN_PROGRESS`
- Lecturer: own topics only. Admin: any topic.

**Side effects on unassign (all within a single `prisma.$transaction`):**
- Delete `Thesis` record
- `Enrollment.status`: `ASSIGNED` → `AVAILABLE`
- Recompute topic statuses for this lecturer (see "Idempotent Status Recompute" below)

#### `GET /theses` — List

Query params: `?semesterId=&status=&lecturerId=&topicId=`

| Filter | Lecturer | Admin |
|--------|----------|-------|
| `semesterId` | Any (for history) | Any |
| `status` | Own theses only | Any |
| `lecturerId` | Ignored (auto-scoped) | Filter by lecturer |
| `topicId` | Own topics only | Any topic |

- Defaults to active semester if `semesterId` omitted
- Lecturers see only their own topics' assignments across any semester

### Lecturer-Semester Capacity Endpoints

| Method | URL | Role | Description |
|--------|-----|------|-------------|
| `GET` | `/lecturer-semesters` | ADMIN | List capacity configs |
| `PATCH` | `/lecturer-semesters/:lecturerId` | ADMIN | Set capacity (upsert) |
| `GET` | `/lecturer-semesters/capacity/:lecturerId` | ADMIN, LECTURER | Get resolved capacity (`?semesterId=`, defaults to active) |

#### `PATCH /lecturer-semesters/:lecturerId`

```json
// Request
{ "semesterId": 1, "maxStudents": 8 }

// Response (200)
{ "lecturerId": 3, "semesterId": 1, "maxStudents": 8 }
```

---

## UI Design

### Topics Bank Enhancement — "Contact" Button (Students)

Add a "Contact" button on `TopicCard`, visible only to students. Clicking it opens the student's default email client (Outlook, etc.) with a pre-filled template.

**Mailto URL structure:**
```
mailto:{lecturer.email}?subject={encoded subject}&body={encoded body}
```

**Template:**
- **Subject:** `[{topic.title}] — Thesis Topic Interest`
- **Body:**
  ```
  Dear {lecturer.title} {lecturer.fullName},

  I am {student.fullName} (Student ID: {student.studentId}), and I am interested
  in your topic "{topic.title}".

  I would like to discuss the possibility of working on this topic for my thesis.

  Best regards,
  {student.fullName}
  ```

**Behavior:**
- Button visible only to users with role `STUDENT`
- Uses `encodeURIComponent()` for URL encoding
- No backend API needed — purely client-side
- Student can edit the message before sending in their email client

---

### Lecturer Page — "My Assignments" (`/my-assignments`)

**Layout:** Table-based management view.

**Header area:**
- Page title: "My Assignments"
- Filters: Semester dropdown (default: active), Status dropdown (ALL / IN_PROGRESS / SUBMITTED / etc.)
- Capacity indicator: "3 / 5 students" (assigned vs. resolved max)
- "Assign Student" button

**Table columns:**

| # | Topic | Student | Student ID | Status | Assigned Date | Actions |
|---|-------|---------|------------|--------|---------------|---------|

**Actions per row:**
- "Unassign" — enabled only for `IN_PROGRESS`, confirmation dialog
- Row click → navigates to `/my-assignments/:thesisId` (detail page)

**Assign Student Dialog (two-step):**
1. Select topic — searchable, only own OPEN topics in selected semester, shows current assignment count
2. Select student — searchable, only AVAILABLE students enrolled in same semester, shows name + student ID

**Empty state:** "No assignments yet for this semester."

### Admin Page — "Topic Assignments" (`/admin/assignments`)

**Layout:** Same table-based approach, wider scope.

**Header area:**
- Page title: "Topic Assignments"
- Filters: Semester dropdown, Lecturer dropdown, Status dropdown
- "Assign Student" button + "Manage Capacity" button

**Table columns:**

| # | Topic | Lecturer | Student | Student ID | Status | Assigned Date | Actions |
|---|-------|----------|---------|------------|--------|---------------|---------|

**Actions per row:**
- "Unassign" — same guard as lecturer page
- Row click → navigates to `/admin/assignments/:thesisId`

**Assign Dialog:** Same two-step but admin can pick any lecturer's OPEN topics.

**Manage Capacity Dialog:**
- Table of lecturers for the selected semester
- Shows: Lecturer name, current assigned count, resolved max
- Editable max field with save

### Thesis Detail Page (`/my-assignments/:id` and `/admin/assignments/:id`)

**For now (this feature):**
- Read-only summary: topic title, description, student info, status, assigned date
- Unassign button (with guard rails)

**Future additions (not this feature):**
- Documents tab (upload, review, approve)
- Review tab (scoring, comments)
- Status timeline

---

## Business Rules

### Assignment Rules
- One thesis per student per semester (enforced by unique `enrollmentId` on Thesis)
- Student must have `Enrollment.status === AVAILABLE`
- Topic must have `Topic.status === OPEN`
- Topic and enrollment must belong to the same semester
- Capacity checked via fallback chain

### Idempotent Status Recompute

After every assign or unassign, run the same recompute function for the topic owner's lecturer:

1. Count the lecturer's assigned theses in that semester (`Thesis` records where `topic.lecturerId = X` and `topic.semesterId = Y`)
2. Resolve the lecturer's capacity for that semester (fallback chain)
3. If `assignedCount >= capacity`: set all the lecturer's `OPEN` topics in that semester to `FULL`
4. If `assignedCount < capacity`: set all the lecturer's `FULL` topics in that semester to `OPEN`
5. Never touch `CLOSED` topics — those are manually closed by the lecturer

This avoids the bug where a conditional "was at capacity" flip produces wrong results when capacity has been reduced below the current assignment count.

**Capacity is always checked against the topic owner's lecturer**, not the current user. When an admin assigns to Dr. X's topic, the capacity check is against Dr. X.

### Auto-Status Updates

**On assign (within `$transaction`):**
- `Enrollment.status`: `AVAILABLE` → `ASSIGNED`
- Run idempotent recompute for the topic's lecturer

**On unassign (within `$transaction`):**
- Delete `Thesis` record
- `Enrollment.status`: `ASSIGNED` → `AVAILABLE`
- Run idempotent recompute for the topic's lecturer

### Unassign Guard Rails
- Only allowed when `Thesis.status === IN_PROGRESS`
- Lecturer: own topics only
- Admin: any topic

### Capacity Edge Cases
- Admin reduces capacity below current count → allowed, no assignments removed, topics stay FULL
- New lecturer with no history → falls back to `Lecturer.maxStudents`

### UI Prevents Invalid Actions
- Student picker: only AVAILABLE students in same semester
- Topic picker: only OPEN topics
- Assign button: disabled at capacity (tooltip explains)
- Unassign button: disabled beyond IN_PROGRESS (tooltip explains)
- API validates defensively as safety net for race conditions

---

## Error Responses

| Scenario | HTTP | Message |
|----------|------|---------|
| Student already assigned this semester | 409 | "Student already has a thesis this semester" |
| Enrollment not AVAILABLE | 400 | "Student is not available for assignment" |
| Topic not OPEN | 400 | "Topic is not open for assignment" |
| Semester mismatch | 400 | "Topic and enrollment must be in the same semester" |
| Lecturer at capacity | 400 | "Lecturer has reached maximum student capacity for this semester" |
| Unassign non-IN_PROGRESS | 400 | "Cannot unassign — thesis has progressed beyond initial stage" |
| Not topic owner | 403 | "You do not own this topic" |

---

## Out of Scope (Future Features)

- Student request/application flow
- Document upload and review workflow
- Thesis scoring and reviews
- Enrollment drop/withdrawal lifecycle
- Notifications on assignment/unassignment
