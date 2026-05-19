# Topics CRUD — Design Spec

**Date:** 2026-05-19
**Feature:** Topics full CRUD for lecturers, read-only browsing for all roles
**Branch:** `feature/topics-crud`

---

## Overview

Lecturers create and manage thesis topics scoped to the active semester. All users (lecturer, student, admin) can browse a shared Topics Bank. Students identify topics of interest and contact the lecturer directly via email (outside the system). When a lecturer accepts a student, the lecturer formally assigns the student to the topic inside the system — creating a thesis record (future feature).

---

## User Stories

| Role | Can do |
|------|--------|
| Lecturer | Create, edit, delete, copy topics (own topics only, active semester) |
| Lecturer | Browse Topics Bank (all topics, read-only; "Edit" shortcut on own topics) |
| Student | Browse Topics Bank (read-only, view lecturer email for contact) |
| Admin | Browse Topics Bank (read-only, oversight) |

---

## Schema

**No schema changes required.** The `Topic` model already has all necessary fields:

```
Topic {
  id           Int         PK
  semesterId   Int         FK → Semester
  lecturerId   Int         FK → Lecturer
  title        String
  description  String?     (db.Text)
  requirements String?     (db.Text)
  note         String?     (db.Text) — lecturer's public note to students
  status       TopicStatus (OPEN | FULL | CLOSED)
  createdAt    DateTime
}
```

The `Lecturer` model already has `email` — no changes needed for student contact info.

### Status Transition Rules

| Transition | Trigger |
|---|---|
| → `OPEN` | Default on topic create |
| `OPEN` → `FULL` | System: total assigned theses across all lecturer's topics in semester ≥ `lecturer.maxStudents` |
| `FULL` → `OPEN` | System: a thesis is unassigned and a slot frees up |
| `OPEN` / `FULL` → `CLOSED` | System: semester status changes to `CLOSED` |

> **Future development note:** The `FULL` auto-close and `CLOSED` on semester-end are **not implemented in this feature**. They are triggered by the thesis assignment feature (when a thesis record is created linking a student to a topic) and the semester management feature (when semester status is set to CLOSED) respectively. Topics always start as `OPEN` in this phase. When building thesis assignment, add a post-create hook that:
> 1. Counts total theses across all lecturer's OPEN/FULL topics in the semester
> 2. If count ≥ `lecturer.maxStudents`, sets all lecturer's `OPEN` topics in that semester to `FULL`
> When a thesis is deleted/unassigned, check if count drops below `maxStudents` and revert `FULL` → `OPEN`.
> When semester management closes a semester, set all `OPEN` and `FULL` topics in that semester to `CLOSED`.

---

## API Contract

**Architecture:** Single `TopicModule` with one controller (Option A). Role-based guards + ownership checks in the service layer. Follows existing codebase conventions.

### `GET /topics` — all roles

Returns a list of topics. Role-scoping is handled by query params (lecturer always sees all topics like other roles — no forced filter by own ID).

| Query param | Type | Description |
|---|---|---|
| `semesterId` | Int? | Filter by semester; defaults to active semester if omitted |
| `status` | `OPEN\|FULL\|CLOSED`? | Filter by status |
| `lecturerId` | Int? | Filter by lecturer |
| `search` | String? | Keyword search on title |

**Response shape (array):**
```json
[
  {
    "id": 1,
    "title": "Deep Learning for Medical Imaging",
    "description": "...",
    "requirements": "...",
    "note": "...",
    "status": "OPEN",
    "createdAt": "2026-05-19T...",
    "semesterId": 3,
    "lecturer": {
      "id": 2,
      "fullName": "Dr. Nguyen Van A",
      "email": "nguyenvana@university.edu",
      "title": "Associate Professor"
    }
  }
]
```

### `GET /topics/:id` — all roles

Returns single topic with same shape as list item.

### `POST /topics` — lecturer only

Creates a topic in the **active semester**. `semesterId` and `lecturerId` are injected server-side from the active semester and JWT — not sent by the client.

**Request body:**
```json
{
  "title": "string (required)",
  "description": "string (optional)",
  "requirements": "string (optional)",
  "note": "string (optional)"
}
```

Returns `201` with created topic.
Returns `400` if no active semester exists.

### `PATCH /topics/:id` — lecturer only (own topics)

Partial update. Editable fields: `title`, `description`, `requirements`, `note`.
Status is NOT editable by the client (system-managed).

Returns `200` with updated topic.
Returns `403` if lecturer tries to edit another lecturer's topic.
Returns `404` if topic not found.

### `DELETE /topics/:id` — lecturer only (own topics)

Returns `204`.
Returns `403` if lecturer tries to delete another lecturer's topic.
Returns `400` if any thesis record is linked to the topic (blocked to prevent orphaned theses).
Returns `404` if topic not found.

There is **no dedicated copy endpoint**. Copying is a frontend UX concern — the client fetches the source topic via `GET /topics/:id`, pre-fills the create form, and the lecturer submits via the normal `POST /topics`.

---

## Frontend

### Pages & Routes

| Page | Route | Guard |
|---|---|---|
| Topics Bank | `/topics` | All authenticated roles |
| My Topics | `/my-topics` | Lecturer only |

### Topics Bank (`/topics`)

- Semester dropdown (defaults to active semester; allows browsing past semesters)
- Filters: status badge toggles, lecturer name search, title keyword search
- Topic cards displaying: title, status badge, lecturer name + email (mailto link), description preview, note (if set)
- If the logged-in user is a lecturer and the card is their own topic → **"Edit"** button on the card that navigates to `/my-topics`
- All topic cards show a **"Copy"** icon (tooltip: "Use as template") visible to lecturers → opens the create form modal pre-filled with that topic's data; lecturer reviews/edits then saves as a new topic in the active semester

### My Topics (`/my-topics`)

- Capacity counter at top: `X / maxStudents students used` (counts theses across all topics in active semester — shows `0 / maxStudents` until thesis assignment feature is built)
- **"New Topic"** button → opens create form modal (empty), with a **"Pre-fill from existing topic"** link inside the form that opens a topic picker (all semesters, all topics) to auto-fill the fields
- Topic list showing their own topics with status badges
- Each topic card has: **Edit**, **Delete**, **Copy** action buttons
- Delete button is disabled (with tooltip) if the topic has theses assigned
- **Copy** on own topic cards opens the same pre-filled create form modal (same as Copy on Topics Bank)

### Topic Form (shared: create & edit)

Fields:
- `title` — text input, required
- `description` — textarea, optional
- `requirements` — textarea, optional
- `note` — textarea, optional, helper text: "Visible to students — use this to set expectations or availability"

**Create form extras:**
- "Pre-fill from existing topic" link inside the empty form → opens a topic picker → selecting a topic auto-fills the form fields; lecturer can edit before submitting
- When triggered by a **Copy** button on any topic card, the form opens already pre-filled (skips the picker step)

Both paths submit via `POST /topics`. Copy is purely a frontend UX concern — no dedicated backend endpoint.

### State Management

```
frontend/src/features/topic/
  api.ts          — axios calls for all topic endpoints
  store.ts        — Zustand store: topic list, filters, loading/error
  components/
    TopicCard.tsx
    TopicForm.tsx        — shared create/edit form; accepts optional prefill data
    TopicFilters.tsx
    TopicPickerDialog.tsx — picker for pre-filling form from an existing topic
```

Single Zustand store with separate slices for bank view and my-topics view (or a shared list with a `scope` flag). The `myTopics` view pre-fills `lecturerId` filter with the logged-in lecturer's ID.

---

## Business Rules & Edge Cases

| Rule | Handling |
|---|---|
| No active semester | `POST /topics` and `POST /topics/:id/copy` return `400 Bad Request` |
| Delete with theses assigned | `DELETE /topics/:id` returns `400`; frontend disables button |
| Lecturer edits/deletes another's topic | Service-layer ownership check; returns `403` |
| Copy source belongs to any lecturer | Allowed — lecturer can copy any topic from the bank |
| Student/admin hitting write endpoints | `@Roles` guard returns `403` |
| `status` sent in PATCH body | Ignored — status is system-managed only |
| Capacity counter on My Topics | Counts linked theses (future); shows `0 / max` until thesis feature is built |

---

## Out of Scope (this feature)

- Student-to-lecturer contact flow (email is displayed; actual contact is outside the system)
- Thesis record creation / student assignment to topic (future feature)
- `FULL` auto-close logic (triggered by thesis assignment feature)
- `CLOSED` on semester end (triggered by semester management feature)
- Admin creating/editing/deleting topics (admin is read-only for topics)
- Pagination on topic lists (can be added later; acceptable to return all for now given expected volume)
- Dedicated backend copy endpoint — copy is handled entirely on the frontend (fetch source topic, pre-fill form, submit via `POST /topics`)
