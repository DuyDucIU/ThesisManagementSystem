# Student Management — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/admin/students` page — a paginated, searchable student list with edit (modal) and delete (confirmation dialog) actions.

**Architecture:** Extend the existing `frontend/src/features/student/` feature module. Add a Zustand store for the student list, a reusable `StudentEditModal`, and a `StudentListPage`. Wire up the route and sidebar nav. Follows the exact same patterns as the semester feature (`useSemesterStore`, `SemesterFormModal`, `SemesterListPage`).

**Tech Stack:** React 19, TypeScript 6, Zustand 5, Axios 1, React Router 7, Tailwind CSS v4, shadcn/ui (Dialog, AlertDialog, Input, Select, Button), Lucide icons.

**Prerequisite:** Backend plan must be fully implemented and verified before starting this plan.

---

## File Map

| Action | File |
|---|---|
| Modify | `frontend/src/features/student/api.ts` |
| Create | `frontend/src/features/student/store/studentStore.ts` |
| Create | `frontend/src/features/student/components/StudentEditModal.tsx` |
| Create | `frontend/src/features/student/components/StudentListPage.tsx` |
| Modify | `frontend/src/router/index.tsx` |
| Modify | `frontend/src/layouts/AppLayout.tsx` |

---

### Task 1: Extend student API types and calls

**Files:**
- Modify: `frontend/src/features/student/api.ts`

- [ ] **Step 1: Replace `frontend/src/features/student/api.ts` with the extended version**

The existing import/export for `parseImport`/`importStudents` must be preserved exactly. Add new types and calls below them:

```typescript
// frontend/src/features/student/api.ts
import api from '../../lib/axios'

// ─── Import feature types (unchanged) ─────────────────────────────────────

export interface ParseRowError {
  row: number
  reason: string
}

export interface AlreadyEnrolledDetail {
  row: number
  studentId: string
  reason: string
}

export interface ParseImportResult {
  total: number
  valid: number
  alreadyEnrolled: number
  invalid: number
  errors: ParseRowError[]
  alreadyEnrolledDetails: AlreadyEnrolledDetail[]
}

export interface SkippedDetail {
  row: number
  studentId: string | null
  reason: string
}

export interface ImportStudentsResult {
  imported: number
  skipped: number
  skippedDetails: SkippedDetail[]
}

// ─── Management feature types ──────────────────────────────────────────────

export type SemesterStudentStatus = 'AVAILABLE' | 'ASSIGNED' | 'COMPLETED' | 'FAILED'

export interface StudentItem {
  id: number
  studentId: string
  fullName: string
  email: string
  hasAccount: boolean
  semesterStudent?: { status: SemesterStudentStatus } | null
}

export interface StudentQuery {
  search?: string
  hasAccount?: boolean
  semesterId?: number
  page?: number
  limit?: number
}

export interface PaginatedStudentResult {
  data: StudentItem[]
  total: number
  page: number
  limit: number
}

export interface UpdateStudentDto {
  fullName?: string
  email?: string
  studentId?: string
}

// ─── Error helper (shared) ─────────────────────────────────────────────────

export function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const data = (err as { response: { data: { message: unknown } } }).response?.data
    if (Array.isArray(data?.message)) return data.message.join(', ')
    if (typeof data?.message === 'string') return data.message
  }
  return 'An unexpected error occurred.'
}

// ─── API calls ─────────────────────────────────────────────────────────────

export const studentApi = {
  parseImport: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<ParseImportResult>('/students/import?action=parse', form)
  },

  importStudents: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<ImportStudentsResult>('/students/import?action=import', form)
  },

  list: (params?: StudentQuery) =>
    api.get<PaginatedStudentResult>('/students', { params }),

  update: (id: number, dto: UpdateStudentDto) =>
    api.patch<StudentItem>(`/students/${id}`, dto),

  remove: (id: number) =>
    api.delete<void>(`/students/${id}`),
}
```

- [ ] **Step 2: Verify the frontend builds without errors**

Run: `cd frontend && pnpm run build`

Expected: build succeeds. (The existing `StudentImportPage` imports from this file — confirm it still works.)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/student/api.ts
git commit -m "Extend student api.ts with list, update, remove types and calls"
```

---

### Task 2: Add Zustand studentStore

**Files:**
- Create: `frontend/src/features/student/store/studentStore.ts`

- [ ] **Step 1: Create `studentStore.ts`**

```typescript
// frontend/src/features/student/store/studentStore.ts
import { create } from 'zustand'
import { studentApi } from '../api'
import type { StudentItem, StudentQuery } from '../api'

interface StudentState {
  students: StudentItem[]
  total: number
  page: number
  loading: boolean
  fetchAll: (query?: StudentQuery) => Promise<void>
}

export const useStudentStore = create<StudentState>((set) => ({
  students: [],
  total: 0,
  page: 1,
  loading: false,

  fetchAll: async (query) => {
    set({ loading: true })
    try {
      const res = await studentApi.list(query)
      set({
        students: res.data.data,
        total: res.data.total,
        page: res.data.page,
        loading: false,
      })
    } catch {
      set({ loading: false })
    }
  },
}))
```

- [ ] **Step 2: Verify the frontend builds without errors**

Run: `cd frontend && pnpm run build`

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/student/store/studentStore.ts
git commit -m "Add useStudentStore Zustand store for student list"
```

---

### Task 3: Build StudentEditModal

**Files:**
- Create: `frontend/src/features/student/components/StudentEditModal.tsx`

- [ ] **Step 1: Create `StudentEditModal.tsx`**

```tsx
// frontend/src/features/student/components/StudentEditModal.tsx
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { studentApi, extractErrorMessage } from '../api'
import type { StudentItem } from '../api'

interface Props {
  student: StudentItem | null
  onClose: () => void
  onSaved: () => void
}

export default function StudentEditModal({ student, onClose, onSaved }: Props) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [studentId, setStudentId] = useState('')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string
    email?: string
    studentId?: string
  }>({})

  useEffect(() => {
    if (student) {
      setFullName(student.fullName)
      setEmail(student.email)
      setStudentId(student.studentId)
      setFieldErrors({})
    }
  }, [student])

  async function handleSave() {
    if (!student) return
    setLoading(true)
    setFieldErrors({})
    try {
      await studentApi.update(student.id, { fullName, email, studentId })
      toast.success('Student updated.')
      onSaved()
    } catch (err) {
      const msg = extractErrorMessage(err)
      const lower = msg.toLowerCase()
      if (lower.includes('student id') || lower.includes('student_id')) {
        setFieldErrors({ studentId: msg })
      } else if (lower.includes('email')) {
        setFieldErrors({ email: msg })
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={student !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent
        className="bg-surface max-w-md"
        style={{ boxShadow: '0 0 32px 0 rgba(25,28,29,0.06)' }}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-semibold text-on-surface">
            Edit Student
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="font-label text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Full Name
            </label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
              className="font-sans text-sm"
            />
            {fieldErrors.fullName && (
              <p className="font-sans text-xs text-destructive">{fieldErrors.fullName}</p>
            )}
          </div>

          {/* Student ID */}
          <div className="space-y-1.5">
            <label className="font-label text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Student ID
            </label>
            <Input
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              disabled={loading}
              className="font-sans text-sm"
            />
            {fieldErrors.studentId && (
              <p className="font-sans text-xs text-destructive">{fieldErrors.studentId}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="font-label text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="font-sans text-sm"
            />
            {fieldErrors.email && (
              <p className="font-sans text-xs text-destructive">{fieldErrors.email}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="font-label"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="font-label bg-gradient-to-br from-primary to-primary-container text-primary-foreground"
          >
            {loading ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Verify the frontend builds without errors**

Run: `cd frontend && pnpm run build`

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/student/components/StudentEditModal.tsx
git commit -m "Add StudentEditModal component"
```

---

### Task 4: Build StudentListPage

**Files:**
- Create: `frontend/src/features/student/components/StudentListPage.tsx`

- [ ] **Step 1: Create `StudentListPage.tsx`**

```tsx
// frontend/src/features/student/components/StudentListPage.tsx
import { useEffect, useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { Pencil, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select'
import { useStudentStore } from '../store/studentStore'
import { studentApi, extractErrorMessage } from '../api'
import type { StudentItem } from '../api'
import { semesterApi } from '../../semester/api'
import type { Semester } from '../../semester/api'
import StudentEditModal from './StudentEditModal'

const PAGE_LIMIT = 20

export default function StudentListPage() {
  const { students, total, page, loading, fetchAll } = useStudentStore()

  const [search, setSearch] = useState('')
  const [hasAccountFilter, setHasAccountFilter] = useState<'all' | 'true' | 'false'>('all')
  const [semesterIdFilter, setSemesterIdFilter] = useState<string>('all')
  const [semesters, setSemesters] = useState<Semester[]>([])

  const [editTarget, setEditTarget] = useState<StudentItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StudentItem | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const buildQuery = useCallback(
    (p: number) => ({
      search: search || undefined,
      hasAccount:
        hasAccountFilter === 'true'
          ? true
          : hasAccountFilter === 'false'
            ? false
            : undefined,
      semesterId: semesterIdFilter !== 'all' ? Number(semesterIdFilter) : undefined,
      page: p,
      limit: PAGE_LIMIT,
    }),
    [search, hasAccountFilter, semesterIdFilter],
  )

  // Load semesters for filter dropdown once
  useEffect(() => {
    semesterApi.list().then((res) => setSemesters(res.data)).catch(() => {})
  }, [])

  // Debounced re-fetch when filters change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void fetchAll(buildQuery(1))
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search, hasAccountFilter, semesterIdFilter, fetchAll, buildQuery])

  function handlePageChange(newPage: number) {
    void fetchAll(buildQuery(newPage))
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await studentApi.remove(deleteTarget.id)
      toast.success(`"${deleteTarget.fullName}" deleted.`)
      setDeleteTarget(null)
      void fetchAll(buildQuery(page))
    } catch (err) {
      const msg = extractErrorMessage(err)
      toast.error(msg)
      setDeleteTarget(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT))
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_LIMIT + 1
  const rangeEnd = Math.min(page * PAGE_LIMIT, total)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="font-display text-3xl font-semibold text-on-surface">Students</h1>
        <p className="font-sans text-sm font-medium text-muted-foreground mt-1">
          Manage student profiles.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by name, student ID, or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="font-sans text-sm max-w-xs"
        />

        <Select
          value={hasAccountFilter}
          onValueChange={(v) => setHasAccountFilter(v as 'all' | 'true' | 'false')}
        >
          <SelectTrigger className="w-44 font-sans text-sm">
            <SelectValue placeholder="Account status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All accounts</SelectItem>
            <SelectItem value="true">With account</SelectItem>
            <SelectItem value="false">No account</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={semesterIdFilter}
          onValueChange={setSemesterIdFilter}
        >
          <SelectTrigger className="w-52 font-sans text-sm">
            <SelectValue placeholder="All semesters" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All semesters</SelectItem>
            {semesters.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-surface-container-low rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-container">
              <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">
                Student ID
              </th>
              <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">
                Full Name
              </th>
              <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">
                Email
              </th>
              <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">
                Account
              </th>
              {semesterIdFilter !== 'all' && (
                <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">
                  Status
                </th>
              )}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={semesterIdFilter !== 'all' ? 6 : 5}
                  className="px-4 py-8 text-center font-sans text-sm text-muted-foreground"
                >
                  Loading…
                </td>
              </tr>
            )}
            {!loading && students.length === 0 && (
              <tr>
                <td
                  colSpan={semesterIdFilter !== 'all' ? 6 : 5}
                  className="px-4 py-8 text-center font-sans text-sm text-muted-foreground"
                >
                  No students found.
                </td>
              </tr>
            )}
            {!loading &&
              students.map((s) => (
                <tr
                  key={s.id}
                  className="border-t border-surface-container hover:bg-surface-container transition-colors"
                >
                  <td className="px-4 py-3 font-sans text-sm font-medium text-on-surface">
                    {s.studentId}
                  </td>
                  <td className="px-4 py-3 font-sans text-sm text-on-surface">
                    {s.fullName}
                  </td>
                  <td className="px-4 py-3 font-sans text-sm text-muted-foreground">
                    {s.email}
                  </td>
                  <td className="px-4 py-3">
                    {s.hasAccount ? (
                      <span className="font-label text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        Active
                      </span>
                    ) : (
                      <span className="font-sans text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                  {semesterIdFilter !== 'all' && (
                    <td className="px-4 py-3 font-sans text-sm text-muted-foreground">
                      {s.semesterStudent?.status ?? '—'}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditTarget(s)}
                        className="font-label text-xs h-7 px-2"
                      >
                        <Pencil className="w-3.5 h-3.5 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(s)}
                        className="font-label text-xs h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between">
          <p className="font-sans text-sm text-muted-foreground">
            Showing {rangeStart}–{rangeEnd} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1 || loading}
              className="font-label text-sm"
            >
              Previous
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages || loading}
              className="font-label text-sm"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <StudentEditModal
        student={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => {
          setEditTarget(null)
          void fetchAll(buildQuery(page))
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
      >
        <AlertDialogContent
          className="bg-surface"
          style={{ boxShadow: '0 0 32px 0 rgba(25,28,29,0.06)' }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-lg font-semibold text-on-surface">
              Delete Student
            </AlertDialogTitle>
            <AlertDialogDescription className="font-sans text-sm text-muted-foreground">
              {`Delete "${deleteTarget?.fullName}"? This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading} className="font-label">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteLoading}
              onClick={() => void handleDelete()}
              className="font-label bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

- [ ] **Step 2: Verify the frontend builds without errors**

Run: `cd frontend && pnpm run build`

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/student/components/StudentListPage.tsx
git commit -m "Add StudentListPage with search, filters, pagination, edit and delete"
```

---

### Task 5: Wire up route and sidebar nav

**Files:**
- Modify: `frontend/src/router/index.tsx`
- Modify: `frontend/src/layouts/AppLayout.tsx`

- [ ] **Step 1: Add the `/admin/students` route in `router/index.tsx`**

Replace the contents of `frontend/src/router/index.tsx`:

```typescript
// frontend/src/router/index.tsx
import { createBrowserRouter, Navigate } from 'react-router'
import { ProtectedRoute, PublicRoute, AdminRoute } from './guards'
import LoginPage from '../features/auth/components/LoginPage'
import AppLayout from '../layouts/AppLayout'
import SemesterListPage from '../features/semester/components/SemesterListPage'
import StudentListPage from '../features/student/components/StudentListPage'
import StudentImportPage from '../features/student/components/StudentImportPage'

const router = createBrowserRouter([
  {
    element: <PublicRoute />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <Navigate to="/admin/semesters" replace /> },
          {
            element: <AdminRoute />,
            children: [
              { path: '/admin/semesters', element: <SemesterListPage /> },
              { path: '/admin/students', element: <StudentListPage /> },
              { path: '/admin/students/import', element: <StudentImportPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/login" replace /> },
])

export default router
```

- [ ] **Step 2: Add the "Students" sidebar link in `AppLayout.tsx`**

In `frontend/src/layouts/AppLayout.tsx`, add the Students nav link directly above the "Import Students" link. Replace the `<nav>` block:

```tsx
<nav className="space-y-0.5">
  <NavLink
    to="/admin/semesters"
    className={({ isActive }) =>
      `block px-3 py-2 rounded-md font-sans text-sm transition-colors ${
        isActive
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-on-surface hover:bg-surface-container'
      }`
    }
  >
    Semesters
  </NavLink>
  <NavLink
    to="/admin/students"
    end
    className={({ isActive }) =>
      `block px-3 py-2 rounded-md font-sans text-sm transition-colors ${
        isActive
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-on-surface hover:bg-surface-container'
      }`
    }
  >
    Students
  </NavLink>
  <NavLink
    to="/admin/students/import"
    className={({ isActive }) =>
      `block px-3 py-2 rounded-md font-sans text-sm transition-colors ${
        isActive
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-on-surface hover:bg-surface-container'
      }`
    }
  >
    Import Students
  </NavLink>
</nav>
```

> **Note:** The `end` prop on the `/admin/students` link prevents it from matching as active when the user is on `/admin/students/import`.

- [ ] **Step 3: Verify the frontend builds without errors**

Run: `cd frontend && pnpm run build`

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 4: Start the dev server and manually verify the feature**

Run: `cd frontend && pnpm run dev`

Open `http://localhost:5173` and verify:
1. Sidebar shows "Students" link above "Import Students"
2. Clicking "Students" navigates to `/admin/students`
3. Student list loads with the correct columns
4. Search input filters results (debounced)
5. "Account" filter works (With Account / No Account)
6. Semester filter adds the Status column and filters the list
7. Clicking Edit opens the modal pre-filled with the student's data
8. Saving a valid edit updates the row and shows a success toast
9. Saving with a duplicate studentId/email shows a field-level error in the modal
10. Clicking Delete opens the confirmation dialog
11. Confirming delete removes the student and shows a success toast
12. Deleting a student with thesis work shows an error toast and does not delete
13. Pagination Previous/Next works correctly
14. "Import Students" link still works and its active state is independent of "Students"

- [ ] **Step 5: Commit**

```bash
git add frontend/src/router/index.tsx \
        frontend/src/layouts/AppLayout.tsx
git commit -m "Add /admin/students route and Students sidebar nav link"
```
