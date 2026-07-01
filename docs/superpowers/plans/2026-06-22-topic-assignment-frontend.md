# Topic Assignment — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the frontend for topic assignment — a Contact button on TopicCard for students, a "My Assignments" page for lecturers, a "Topic Assignments" page for admins, and a thesis detail page for both roles.

**Architecture:** New `thesis` feature module with API layer, Zustand store, and page components. Follow existing patterns: feature modules under `frontend/src/features/`, shadcn/ui components, design-system tokens. The Contact button is a small TopicCard enhancement in the existing `topic` feature.

**Tech Stack:** React 19, Vite, TypeScript 6, Tailwind CSS v4, shadcn/ui, Zustand 5, Axios, React Router 7

## Global Constraints

- Follow the Scholarly Editorial design system (no borders, surface layering, Manrope/Inter fonts)
- Use existing shadcn/ui components from `frontend/src/components/ui/`
- Follow existing feature module patterns: `api.ts` → `store/` → `components/`
- Use `extractErrorMessage` from `lib/utils` for error display
- Invoke `/frontend-design` skill when building new pages or components
- Run `pnpm run lint` and `pnpm run build` before declaring task complete

---

### Task 1: Thesis API Layer and Types

**Files:**
- Create: `frontend/src/features/thesis/api.ts`

**Interfaces:**
- Consumes: `api` from `lib/axios`
- Produces:
  - `ThesisItem`, `ThesisQuery`, `CreateThesisDto` types
  - `thesisApi.list(params?)`, `.get(id)`, `.assign(dto)`, `.unassign(id)` methods
  - `LecturerSemesterCapacity` type
  - `lecturerSemesterApi.list(semesterId?)`, `.upsert(lecturerId, dto)`, `.getCapacity(lecturerId, semesterId?)` methods

- [ ] **Step 1: Create the API module**

Create `frontend/src/features/thesis/api.ts`:

```typescript
import api from '../../lib/axios'

// ─── Thesis types ─────────────────────────────────────────────────────────

export type ThesisStatus =
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'UNDER_REVIEW'
  | 'REVIEWED'

export interface ThesisStudent {
  id: number
  studentId: string
  fullName: string
}

export interface ThesisTopic {
  id: number
  title: string
}

export interface ThesisItem {
  id: number
  title: string
  status: ThesisStatus
  createdAt: string
  topic: ThesisTopic
  student: ThesisStudent
  enrollment: { id: number; semesterId: number }
}

export interface ThesisQuery {
  semesterId?: number
  status?: ThesisStatus
  lecturerId?: number
  topicId?: number
}

export interface CreateThesisDto {
  enrollmentId: number
  topicId: number
}

// ─── Lecturer-Semester types ──────────────────────────────────────────────

export interface LecturerSemesterItem {
  lecturerId: number
  semesterId: number
  maxStudents: number
  lecturer: { id: number; fullName: string; email: string }
}

export interface LecturerSemesterCapacity {
  lecturerId: number
  semesterId: number
  maxStudents: number
}

export interface UpsertLecturerSemesterDto {
  semesterId: number
  maxStudents: number
}

// ─── API methods ──────────────────────────────────────────────────────────

export const thesisApi = {
  list: (params?: ThesisQuery) =>
    api.get<ThesisItem[]>('/theses', { params }),

  get: (id: number) =>
    api.get<ThesisItem>(`/theses/${id}`),

  assign: (dto: CreateThesisDto) =>
    api.post<ThesisItem>('/theses', dto),

  unassign: (id: number) =>
    api.delete<void>(`/theses/${id}`),
}

export const lecturerSemesterApi = {
  list: (semesterId?: number) =>
    api.get<LecturerSemesterItem[]>('/lecturer-semesters', {
      params: semesterId ? { semesterId } : undefined,
    }),

  upsert: (lecturerId: number, dto: UpsertLecturerSemesterDto) =>
    api.patch<LecturerSemesterCapacity>(
      `/lecturer-semesters/${lecturerId}`,
      dto,
    ),

  getCapacity: (lecturerId: number, semesterId?: number) =>
    api.get<LecturerSemesterCapacity>(
      `/lecturer-semesters/capacity/${lecturerId}`,
      { params: semesterId ? { semesterId } : undefined },
    ),
}

export { extractErrorMessage } from '../../lib/utils'
```

- [ ] **Step 2: Verify the file compiles**

```bash
cd frontend
pnpm run build
```

Expected: build succeeds (new file has no imports from non-existent files).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/thesis/
git commit -m "feat(thesis): add thesis and lecturer-semester API layer"
```

---

### Task 2: Thesis Zustand Store

**Files:**
- Create: `frontend/src/features/thesis/store/thesisStore.ts`

**Interfaces:**
- Consumes: `thesisApi`, `lecturerSemesterApi` from `../api`; `semesterApi` from `semester/api`; `enrollmentApi` from `enrollment/api`
- Produces: `useThesisStore` hook with:
  - `theses`, `loading`, `error` — list state
  - `capacity` — resolved capacity for current lecturer/semester
  - `fetchTheses(query, user)`, `assignStudent(dto)`, `unassignStudent(id)`
  - `fetchCapacity(lecturerId, semesterId?)`
  - `semesters`, `fetchSemesters()`

- [ ] **Step 1: Create the store**

Create `frontend/src/features/thesis/store/thesisStore.ts`:

```typescript
import { create } from 'zustand'
import { thesisApi, lecturerSemesterApi } from '../api'
import type {
  ThesisItem,
  ThesisQuery,
  CreateThesisDto,
  LecturerSemesterCapacity,
} from '../api'
import { semesterApi } from '../../semester/api'
import type { Semester } from '../../semester/api'

interface ThesisState {
  theses: ThesisItem[]
  loading: boolean
  error: string | null

  capacity: LecturerSemesterCapacity | null

  semesters: Semester[]
  semestersLoading: boolean

  fetchTheses: (query?: ThesisQuery) => Promise<void>
  assignStudent: (dto: CreateThesisDto) => Promise<ThesisItem>
  unassignStudent: (id: number) => Promise<void>
  fetchCapacity: (lecturerId: number, semesterId?: number) => Promise<void>
  fetchSemesters: () => Promise<void>
}

export const useThesisStore = create<ThesisState>((set) => ({
  theses: [],
  loading: false,
  error: null,

  capacity: null,

  semesters: [],
  semestersLoading: false,

  fetchTheses: async (query) => {
    set({ loading: true, error: null })
    try {
      const res = await thesisApi.list(query)
      set({ theses: res.data })
    } catch {
      set({ error: 'Failed to load assignments' })
    } finally {
      set({ loading: false })
    }
  },

  assignStudent: async (dto) => {
    const res = await thesisApi.assign(dto)
    return res.data
  },

  unassignStudent: async (id) => {
    await thesisApi.unassign(id)
  },

  fetchCapacity: async (lecturerId, semesterId?) => {
    try {
      const res = await lecturerSemesterApi.getCapacity(lecturerId, semesterId)
      set({ capacity: res.data })
    } catch {
      set({ capacity: null })
    }
  },

  fetchSemesters: async () => {
    set({ semestersLoading: true })
    try {
      const res = await semesterApi.list()
      set({ semesters: res.data })
    } finally {
      set({ semestersLoading: false })
    }
  },
}))
```

- [ ] **Step 2: Verify build**

```bash
cd frontend
pnpm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/thesis/store/
git commit -m "feat(thesis): add Zustand store for thesis assignments"
```

---

### Task 3: TopicCard "Contact" Button for Students

**Files:**
- Modify: `frontend/src/features/topic/components/TopicCard.tsx`

**Interfaces:**
- Consumes: `TopicItem` type, `useAuthStore` for current user info
- Produces: "Contact" button visible to students, opens mailto: with template

- [ ] **Step 1: Add the Contact button to TopicCard**

Add a `student` prop to `TopicCardProps`:

```typescript
/** Current student info for Contact button */
student?: { fullName: string; studentId: string } | null
```

After the existing `{isLecturer && (...)}` actions block, add a student contact section:

```tsx
{/* Student Contact — visible only to students */}
{student && (
  <div className="flex items-center gap-2 pt-1">
    <a
      href={buildMailtoUrl(topic, student)}
      className="inline-flex"
    >
      <Button size="sm" variant="outline">
        <Mail className="w-3.5 h-3.5 mr-1.5" />
        Contact
      </Button>
    </a>
  </div>
)}
```

Add `Mail` to the lucide-react import. Add the helper function before the component:

```typescript
function buildMailtoUrl(
  topic: TopicItem,
  student: { fullName: string; studentId: string },
) {
  const subject = encodeURIComponent(
    `[${topic.title}] — Thesis Topic Interest`,
  )
  const body = encodeURIComponent(
    `Dear ${topic.lecturer.title ? topic.lecturer.title + ' ' : ''}${topic.lecturer.fullName},\n\n` +
    `I am ${student.fullName} (Student ID: ${student.studentId}), ` +
    `and I am interested in your topic "${topic.title}".\n\n` +
    `I would like to discuss the possibility of working on this topic for my thesis.\n\n` +
    `Best regards,\n${student.fullName}`,
  )
  return `mailto:${topic.lecturer.email}?subject=${subject}&body=${body}`
}
```

- [ ] **Step 2: Update TopicsBankPage to pass student prop**

In `frontend/src/features/topic/components/TopicsBankPage.tsx`, derive the student info from the auth store:

```typescript
const isStudent = user?.role === 'STUDENT'
const studentInfo = isStudent && user?.student
  ? { fullName: user.fullName ?? '', studentId: '' }
  : null
```

Wait — `UserProfile` has `student: { id: number } | null` but no `studentId` string or `fullName` directly on the student sub-object. The student's `fullName` is on the `UserProfile` itself. But `studentId` (the university ID like "2021001") is not in the auth store — it's only on the `Student` model.

Check the JWT payload: `jwt.strategy.ts` returns the full User with `include: { student: true }`. The `Student` model has `studentId` field. So update `UserProfile` in `authStore.ts` to include it.

Add `studentId: string` to the `student` field in `UserProfile`:

```typescript
student: { id: number; studentId: string } | null
```

Also ensure the auth response includes this. Check the JWT strategy — it already does `include: { student: true }` which includes `studentId`.

Then in `TopicsBankPage.tsx`:

```typescript
const studentInfo = isStudent && user?.student
  ? { fullName: user.fullName ?? user.username, studentId: user.student.studentId }
  : null
```

Pass to each `TopicCard`:
```tsx
<TopicCard
  key={topic.id}
  topic={topic}
  myLecturerId={myLecturerId}
  student={studentInfo}
  onCopy={isLecturer ? handleCopy : undefined}
  onEdit={isLecturer ? handleEdit : undefined}
/>
```

- [ ] **Step 3: Verify build and lint**

```bash
cd frontend
pnpm run build && pnpm run lint
```

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/topic/components/TopicCard.tsx frontend/src/features/topic/components/TopicsBankPage.tsx frontend/src/features/auth/store/authStore.ts
git commit -m "feat(topics): add Contact button for students with mailto template"
```

---

### Task 4: Lecturer "My Assignments" Page

**Files:**
- Create: `frontend/src/features/thesis/components/MyAssignmentsPage.tsx`
- Create: `frontend/src/features/thesis/components/AssignStudentDialog.tsx`
- Modify: `frontend/src/router/index.tsx` — add route `/my-assignments`
- Modify: `frontend/src/layouts/AppLayout.tsx` — add sidebar nav link

**Interfaces:**
- Consumes: `useThesisStore`, `useAuthStore`, `topicApi`, `enrollmentApi`
- Produces: Full "My Assignments" page at `/my-assignments`

Build this task using the `/frontend-design` skill for distinctive UI.

- [ ] **Step 1: Create the AssignStudentDialog component**

Create `frontend/src/features/thesis/components/AssignStudentDialog.tsx`:

A two-step dialog:
1. Step 1: Select a topic (searchable dropdown of own OPEN topics in selected semester)
2. Step 2: Select a student (searchable list of AVAILABLE enrollments in same semester)

The dialog uses:
- `topicApi.list({ lecturerId, semesterId, status: 'OPEN' })` to get eligible topics
- `enrollmentApi.list({ semesterId, status: 'AVAILABLE' })` to get eligible students

Props:
```typescript
interface AssignStudentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lecturerId: number
  semesterId: number
  onAssign: (dto: CreateThesisDto) => Promise<void>
}
```

Use `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` from shadcn/ui.
Use `Input` for search filtering (client-side filter on the fetched lists).
Use `Button` for step navigation and confirmation.

Show topic title + current assignment count in step 1.
Show student name + student ID in step 2.

- [ ] **Step 2: Create the MyAssignmentsPage component**

Create `frontend/src/features/thesis/components/MyAssignmentsPage.tsx`:

Layout:
- Header: "My Assignments" title + capacity indicator + "Assign Student" button
- Filters row: Semester dropdown + Status dropdown
- Table with columns: #, Topic, Student, Student ID, Status, Assigned Date, Actions
- Each row: "Unassign" button (disabled unless IN_PROGRESS), row click → `/my-assignments/:id`

Use:
- `useThesisStore` for fetching theses and capacity
- `useAuthStore` for current user's `lecturer.id`
- Semester dropdown populated from `useThesisStore.fetchSemesters()`
- Status dropdown: ALL + ThesisStatus enum values

Table styling follows the design system:
- `bg-surface-container` for table header row
- `font-label text-xs` for headers
- `font-sans text-sm` for cells
- Hover: `hover:bg-surface-container-low`

Unassign confirmation: use `AlertDialog` from shadcn/ui.

- [ ] **Step 3: Add route and sidebar nav**

In `frontend/src/router/index.tsx`:

```typescript
import MyAssignmentsPage from '../features/thesis/components/MyAssignmentsPage'

// Inside LecturerRoute children:
{ path: '/my-assignments', element: <MyAssignmentsPage /> },
```

In `frontend/src/layouts/AppLayout.tsx`, add below "My Topics" nav link (inside the `isLecturer` block):

```tsx
<NavLink to="/my-assignments" end className={navLinkClass}>
  My Assignments
</NavLink>
```

- [ ] **Step 4: Verify build, lint, and manual test**

```bash
cd frontend
pnpm run build && pnpm run lint
```

Start the dev server (`pnpm run dev`) and test:
- Navigate to `/my-assignments` as a lecturer
- Verify the page loads with filters and table
- Open the Assign Student dialog, verify two-step flow
- Verify unassign button behavior

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/thesis/components/ frontend/src/router/index.tsx frontend/src/layouts/AppLayout.tsx
git commit -m "feat(thesis): add My Assignments page for lecturers with assign/unassign"
```

---

### Task 5: Admin "Topic Assignments" Page

**Files:**
- Create: `frontend/src/features/thesis/components/AdminAssignmentsPage.tsx`
- Create: `frontend/src/features/thesis/components/ManageCapacityDialog.tsx`
- Modify: `frontend/src/router/index.tsx` — add route `/admin/assignments`
- Modify: `frontend/src/layouts/AppLayout.tsx` — add sidebar nav link

**Interfaces:**
- Consumes: `useThesisStore`, `lecturerSemesterApi`, `topicApi`, `enrollmentApi`
- Produces: Full "Topic Assignments" page at `/admin/assignments`

Build this task using the `/frontend-design` skill for distinctive UI.

- [ ] **Step 1: Create the ManageCapacityDialog component**

Create `frontend/src/features/thesis/components/ManageCapacityDialog.tsx`:

Shows a table of lecturers for the selected semester:
- Columns: Lecturer Name, Current Assigned, Max Students (editable input), Actions (Save)
- Uses `lecturerSemesterApi.list(semesterId)` to fetch current configs
- Uses `lecturerSemesterApi.upsert(lecturerId, dto)` to save changes
- Also needs to count current assignments per lecturer from the theses list

Props:
```typescript
interface ManageCapacityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  semesterId: number
}
```

- [ ] **Step 2: Create the AdminAssignmentsPage component**

Create `frontend/src/features/thesis/components/AdminAssignmentsPage.tsx`:

Similar to MyAssignmentsPage but wider scope:
- Header: "Topic Assignments" title + "Assign Student" + "Manage Capacity" buttons
- Filters: Semester dropdown + Lecturer dropdown + Status dropdown
- Table: #, Topic, Lecturer, Student, Student ID, Status, Assigned Date, Actions
- Lecturer dropdown fetches from existing lecturers list

The assign dialog works the same but admin can pick any lecturer's topics (grouped by lecturer in the topic list).

- [ ] **Step 3: Add route and sidebar nav**

In `frontend/src/router/index.tsx`, inside `AdminRoute` children:

```typescript
import AdminAssignmentsPage from '../features/thesis/components/AdminAssignmentsPage'

{ path: '/admin/assignments', element: <AdminAssignmentsPage /> },
```

In `frontend/src/layouts/AppLayout.tsx`, add inside admin nav section (after "Enrollments"):

```tsx
<NavLink to="/admin/assignments" end className={navLinkClass}>Topic Assignments</NavLink>
```

- [ ] **Step 4: Verify build, lint, and manual test**

```bash
cd frontend
pnpm run build && pnpm run lint
```

Test as admin:
- Navigate to `/admin/assignments`
- Verify filters work (semester, lecturer, status)
- Test assign dialog with any lecturer's topics
- Test Manage Capacity dialog
- Test unassign

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/thesis/components/ frontend/src/router/index.tsx frontend/src/layouts/AppLayout.tsx
git commit -m "feat(thesis): add Topic Assignments admin page with capacity management"
```

---

### Task 6: Thesis Detail Page

**Files:**
- Create: `frontend/src/features/thesis/components/ThesisDetailPage.tsx`
- Modify: `frontend/src/router/index.tsx` — add routes `/my-assignments/:id` and `/admin/assignments/:id`

**Interfaces:**
- Consumes: `thesisApi.get(id)`, `useAuthStore`, route param `:id`
- Produces: Read-only thesis detail page with unassign capability

- [ ] **Step 1: Create ThesisDetailPage component**

Create `frontend/src/features/thesis/components/ThesisDetailPage.tsx`:

Layout (read-only summary card):
- Topic title and description
- Student name and student ID
- Status badge
- Assigned date
- Unassign button (with guard rails — only for IN_PROGRESS, lecturer must own topic)

Use `useParams()` from React Router to get the thesis ID.
Fetch thesis data via `thesisApi.get(id)` on mount.

The same component is used by both lecturer and admin routes — behavior adapts based on the user's role from `useAuthStore`.

- [ ] **Step 2: Add routes**

In `frontend/src/router/index.tsx`:

```typescript
import ThesisDetailPage from '../features/thesis/components/ThesisDetailPage'

// Inside LecturerRoute children:
{ path: '/my-assignments/:id', element: <ThesisDetailPage /> },

// Inside AdminRoute children:
{ path: '/admin/assignments/:id', element: <ThesisDetailPage /> },
```

- [ ] **Step 3: Verify build and lint**

```bash
cd frontend
pnpm run build && pnpm run lint
```

- [ ] **Step 4: Manual test**

- Click a thesis row on My Assignments → navigates to detail page
- Verify all fields display correctly
- Test unassign button on IN_PROGRESS thesis
- Verify disabled state for non-IN_PROGRESS theses

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/thesis/components/ThesisDetailPage.tsx frontend/src/router/index.tsx
git commit -m "feat(thesis): add thesis detail page with unassign capability"
```

---
