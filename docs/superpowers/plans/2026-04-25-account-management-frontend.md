# Account Management — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/admin/accounts` page where admins activate, deactivate, and reactivate login accounts for students and lecturers.

**Architecture:** A single `AccountManagementPage` component with local `useState` only (no Zustand store — data is page-scoped). Tab toggle switches between student and lecturer views. A shared `ConfirmState` discriminated union drives a single `AlertDialog` for all destructive confirmations. Account action API calls live in a new `account/api.ts`; type updates (`isActive`) go directly on the existing `StudentItem` / `LecturerItem` interfaces.

**Tech Stack:** React 19, TypeScript 6, Tailwind CSS v4, shadcn/ui (`AlertDialog`, `Button`, `Input`, `Select`), Axios, `sonner` toasts, React Router 7.

**Prerequisite:** Backend plan (`2026-04-25-account-management-backend.md`) must be fully implemented and verified via Postman before starting this plan.

---

## File Map

| Action | File |
|--------|------|
| Modify | `frontend/src/features/student/api.ts` |
| Modify | `frontend/src/features/lecturer/api.ts` |
| Create | `frontend/src/features/account/api.ts` |
| Create | `frontend/src/features/account/components/AccountManagementPage.tsx` |
| Modify | `frontend/src/router/index.tsx` |
| Modify | `frontend/src/layouts/AppLayout.tsx` |

---

## Task 1 — Update types and create `account/api.ts`

**Files:**
- Modify: `frontend/src/features/student/api.ts`
- Modify: `frontend/src/features/lecturer/api.ts`
- Create: `frontend/src/features/account/api.ts`

- [ ] **Step 1: Add `isActive` to `StudentItem` and `accountStatus` to `StudentQuery`**

In `frontend/src/features/student/api.ts`, replace the file with:

```typescript
import api from '../../lib/axios'

export interface StudentItem {
  id: number
  studentId: string
  fullName: string
  email: string
  hasAccount: boolean
  isActive: boolean | null
}

export interface StudentQuery {
  search?: string
  hasAccount?: boolean
  accountStatus?: 'no-account' | 'active' | 'inactive'
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

export interface CreateStudentDto {
  studentId: string
  fullName: string
  email: string
}

// ─── Error helper ──────────────────────────────────────────────────────────

export { extractErrorMessage } from '../../lib/utils'

// ─── API calls ─────────────────────────────────────────────────────────────

export const studentApi = {
  create: (dto: CreateStudentDto) =>
    api.post<StudentItem>('/students', dto),

  list: (params?: StudentQuery) =>
    api.get<PaginatedStudentResult>('/students', { params }),

  update: (id: number, dto: UpdateStudentDto) =>
    api.patch<StudentItem>(`/students/${id}`, dto),

  remove: (id: number) => api.delete<void>(`/students/${id}`),
}
```

- [ ] **Step 2: Add `isActive` to `LecturerItem` and `accountStatus` to `LecturerQuery`**

In `frontend/src/features/lecturer/api.ts`, replace the file with:

```typescript
import api from '../../lib/axios'

export interface LecturerItem {
  id: number
  lecturerId: string
  fullName: string
  email: string
  title: string | null
  maxStudents: number
  isActive: boolean
}

export interface LecturerQuery {
  search?: string
  accountStatus?: 'active' | 'inactive'
  page?: number
  limit?: number
}

export interface PaginatedLecturerResult {
  data: LecturerItem[]
  total: number
  page: number
  limit: number
}

export interface CreateLecturerDto {
  lecturerId: string
  fullName: string
  email: string
  title?: string
  maxStudents?: number
}

export interface UpdateLecturerDto {
  fullName?: string
  email?: string
  title?: string
  maxStudents?: number
}

// ─── Error helper ──────────────────────────────────────────────────────────

export { extractErrorMessage } from '../../lib/utils'

// ─── API calls ─────────────────────────────────────────────────────────────

export const lecturerApi = {
  create: (dto: CreateLecturerDto) =>
    api.post<LecturerItem>('/lecturers', dto),

  list: (params?: LecturerQuery) =>
    api.get<PaginatedLecturerResult>('/lecturers', { params }),

  get: (id: number) =>
    api.get<LecturerItem>(`/lecturers/${id}`),

  update: (id: number, dto: UpdateLecturerDto) =>
    api.patch<LecturerItem>(`/lecturers/${id}`, dto),

  remove: (id: number) =>
    api.delete<void>(`/lecturers/${id}`),
}
```

- [ ] **Step 3: Create `frontend/src/features/account/api.ts`**

Create the directory `frontend/src/features/account/components/` (mkdir is not needed — just create the files and the directory is implicit).

Create `frontend/src/features/account/api.ts`:

```typescript
import api from '../../lib/axios'
import type { StudentItem } from '../student/api'
import type { LecturerItem } from '../lecturer/api'

export const accountApi = {
  // ─── Student account actions ──────────────────────────────────────────────

  activateStudent: (id: number) =>
    api.post<StudentItem>(`/students/${id}/activate`),

  toggleStudentAccount: (id: number, isActive: boolean) =>
    api.patch<StudentItem>(`/students/${id}/account`, { isActive }),

  activateStudentsBulk: (ids: number[]) =>
    api.post<{ activated: number; skipped: number }>('/students/activate-bulk', { ids }),

  toggleStudentsAccountBulk: (ids: number[], isActive: boolean) =>
    api.patch<{ updated: number; skipped: number }>('/students/account-bulk', { ids, isActive }),

  // ─── Lecturer account actions ─────────────────────────────────────────────

  toggleLecturerAccount: (id: number, isActive: boolean) =>
    api.patch<LecturerItem>(`/lecturers/${id}/account`, { isActive }),

  toggleLecturersAccountBulk: (ids: number[], isActive: boolean) =>
    api.patch<{ updated: number; skipped: number }>('/lecturers/account-bulk', { ids, isActive }),
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd frontend && pnpm run build 2>&1 | head -30
```

Expected: No TypeScript errors. Build may succeed or fail due to missing `AccountManagementPage` import — that's fine, it will be added in Task 2.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/student/api.ts frontend/src/features/lecturer/api.ts frontend/src/features/account/api.ts
git commit -m "Add isActive to student/lecturer types and create account API module"
```

---

## Task 2 — Route + sidebar nav link

**Files:**
- Modify: `frontend/src/router/index.tsx`
- Modify: `frontend/src/layouts/AppLayout.tsx`

- [ ] **Step 1: Add the route**

In `frontend/src/router/index.tsx`, replace the file with:

```typescript
// frontend/src/router/index.tsx
import { createBrowserRouter, Navigate } from 'react-router'
import { ProtectedRoute, PublicRoute, AdminRoute } from './guards'
import LoginPage from '../features/auth/components/LoginPage'
import AppLayout from '../layouts/AppLayout'
import SemesterListPage from '../features/semester/components/SemesterListPage'
import StudentListPage from '../features/student/components/StudentListPage'
import LecturerListPage from '../features/lecturer/components/LecturerListPage'
import EnrollmentListPage from '../features/enrollment/components/EnrollmentListPage'
import EnrollmentImportPage from '../features/enrollment/components/EnrollmentImportPage'
import AccountManagementPage from '../features/account/components/AccountManagementPage'

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
              { path: '/admin/lecturers', element: <LecturerListPage /> },
              { path: '/admin/enrollments', element: <EnrollmentListPage /> },
              { path: '/admin/enrollments/import', element: <EnrollmentImportPage /> },
              { path: '/admin/accounts', element: <AccountManagementPage /> },
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

- [ ] **Step 2: Add "Accounts" nav link to the sidebar**

In `frontend/src/layouts/AppLayout.tsx`, add the Accounts `NavLink` after the Lecturers link (around line 97). Insert this block:

```tsx
<NavLink
  to="/admin/accounts"
  end
  className={({ isActive }) =>
    `block px-3 py-2 rounded-md font-sans text-sm transition-colors ${
      isActive
        ? 'bg-primary/10 text-primary font-medium'
        : 'text-on-surface hover:bg-surface-container'
    }`
  }
>
  Accounts
</NavLink>
```

Place it directly after the closing `</NavLink>` of the Lecturers link and before the Enrollments link. The sidebar nav order becomes: Semesters → Students → Lecturers → **Accounts** → Enrollments → Import Enrollments.

- [ ] **Step 3: Create a stub `AccountManagementPage` so TypeScript compiles**

Create `frontend/src/features/account/components/AccountManagementPage.tsx` with a minimal stub:

```typescript
export default function AccountManagementPage() {
  return <div className="p-6 font-sans text-on-surface">Account Management — coming soon</div>
}
```

- [ ] **Step 4: Run the dev server and verify the route works**

```bash
cd frontend && pnpm run dev
```

Open `http://localhost:5173`, log in as admin. Verify:
- "Accounts" appears in the sidebar after "Lecturers"
- Clicking "Accounts" navigates to `/admin/accounts`
- The stub text renders without errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/router/index.tsx frontend/src/layouts/AppLayout.tsx frontend/src/features/account/components/AccountManagementPage.tsx
git commit -m "Add /admin/accounts route and Accounts sidebar nav link"
```

---

## Task 3 — `AccountManagementPage` — full implementation

**Files:**
- Modify: `frontend/src/features/account/components/AccountManagementPage.tsx`

This is a single-file component. The steps below show the complete final file — write it in one pass, then verify.

- [ ] **Step 1: Write the full component**

Replace `frontend/src/features/account/components/AccountManagementPage.tsx` with:

```typescript
import { useEffect, useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
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
import { studentApi, extractErrorMessage } from '../../student/api'
import { lecturerApi } from '../../lecturer/api'
import { accountApi } from '../api'
import type { StudentItem } from '../../student/api'
import type { LecturerItem } from '../../lecturer/api'

const PAGE_LIMIT = 20

type Tab = 'students' | 'lecturers'
type StudentStatusFilter = 'all' | 'no-account' | 'active' | 'inactive'
type LecturerStatusFilter = 'all' | 'active' | 'inactive'

type ConfirmState =
  | { kind: 'activate-single'; item: StudentItem }
  | { kind: 'deactivate-single'; item: StudentItem | LecturerItem; tab: Tab }
  | { kind: 'activate-bulk'; ids: number[] }
  | { kind: 'deactivate-bulk'; ids: number[]; tab: Tab }
  | null

// ─── Status badges (defined outside to avoid re-creating on every render) ──

function StudentStatusBadge({ item }: { item: StudentItem }) {
  if (!item.hasAccount) {
    return (
      <span className="font-label text-xs font-medium px-2 py-0.5 rounded-full bg-surface-container text-muted-foreground">
        No Account
      </span>
    )
  }
  if (item.isActive) {
    return (
      <span className="font-label text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
        Active
      </span>
    )
  }
  return (
    <span className="font-label text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
      Inactive
    </span>
  )
}

function LecturerStatusBadge({ item }: { item: LecturerItem }) {
  if (item.isActive) {
    return (
      <span className="font-label text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
        Active
      </span>
    )
  }
  return (
    <span className="font-label text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
      Inactive
    </span>
  )
}

// ─── Page component ─────────────────────────────────────────────────────────

export default function AccountManagementPage() {
  const [activeTab, setActiveTab] = useState<Tab>('students')

  const [students, setStudents] = useState<StudentItem[]>([])
  const [studentTotal, setStudentTotal] = useState(0)
  const [studentPage, setStudentPage] = useState(1)

  const [lecturers, setLecturers] = useState<LecturerItem[]>([])
  const [lecturerTotal, setLecturerTotal] = useState(0)
  const [lecturerPage, setLecturerPage] = useState(1)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [studentStatus, setStudentStatus] = useState<StudentStatusFilter>('all')
  const [lecturerStatus, setLecturerStatus] = useState<LecturerStatusFilter>('all')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [confirmDialog, setConfirmDialog] = useState<ConfirmState>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

  // ─── Data fetchers ────────────────────────────────────────────────────────

  const fetchStudents = useCallback(
    async (p: number) => {
      setLoading(true)
      setError(null)
      try {
        const res = await studentApi.list({
          search: search || undefined,
          accountStatus: studentStatus !== 'all' ? studentStatus : undefined,
          page: p,
          limit: PAGE_LIMIT,
        })
        setStudents(res.data.data)
        setStudentTotal(res.data.total)
        setStudentPage(res.data.page)
      } catch (err) {
        setError(extractErrorMessage(err))
      } finally {
        setLoading(false)
      }
    },
    [search, studentStatus],
  )

  const fetchLecturers = useCallback(
    async (p: number) => {
      setLoading(true)
      setError(null)
      try {
        const res = await lecturerApi.list({
          search: search || undefined,
          accountStatus: lecturerStatus !== 'all' ? lecturerStatus : undefined,
          page: p,
          limit: PAGE_LIMIT,
        })
        setLecturers(res.data.data)
        setLecturerTotal(res.data.total)
        setLecturerPage(res.data.page)
      } catch (err) {
        setError(extractErrorMessage(err))
      } finally {
        setLoading(false)
      }
    },
    [search, lecturerStatus],
  )

  // ─── Debounced effect — re-fetches on filter or tab change ────────────────

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (isFirstRender.current) {
      isFirstRender.current = false
      void fetchStudents(1)
      return
    }
    debounceRef.current = setTimeout(() => {
      if (activeTab === 'students') void fetchStudents(1)
      else void fetchLecturers(1)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [activeTab, fetchStudents, fetchLecturers])

  // ─── Tab switch ───────────────────────────────────────────────────────────

  function switchTab(tab: Tab) {
    setActiveTab(tab)
    setSelectedIds(new Set())
    setSearch('')
    setStudentStatus('all')
    setLecturerStatus('all')
  }

  // ─── Pagination ───────────────────────────────────────────────────────────

  function handlePageChange(p: number) {
    if (activeTab === 'students') void fetchStudents(p)
    else void fetchLecturers(p)
  }

  const total = activeTab === 'students' ? studentTotal : lecturerTotal
  const currentPage = activeTab === 'students' ? studentPage : lecturerPage
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT))
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * PAGE_LIMIT + 1
  const rangeEnd = Math.min(currentPage * PAGE_LIMIT, total)

  // ─── Selection helpers ────────────────────────────────────────────────────

  const currentIds =
    activeTab === 'students' ? students.map((s) => s.id) : lecturers.map((l) => l.id)
  const allSelected =
    currentIds.length > 0 && currentIds.every((id) => selectedIds.has(id))

  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set(currentIds))
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ─── Action handlers ──────────────────────────────────────────────────────

  async function handleActivateSingle(student: StudentItem) {
    setActionLoading(true)
    try {
      await accountApi.activateStudent(student.id)
      toast.success(`Account activated for ${student.fullName}.`)
      void fetchStudents(studentPage)
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setActionLoading(false)
      setConfirmDialog(null)
    }
  }

  async function handleToggleSingle(
    item: StudentItem | LecturerItem,
    tab: Tab,
    isActive: boolean,
  ) {
    setActionLoading(true)
    try {
      if (tab === 'students') {
        await accountApi.toggleStudentAccount(item.id, isActive)
      } else {
        await accountApi.toggleLecturerAccount(item.id, isActive)
      }
      const verb = isActive ? 'reactivated' : 'deactivated'
      toast.success(`${item.fullName}'s account ${verb}.`)
      if (tab === 'students') void fetchStudents(studentPage)
      else void fetchLecturers(lecturerPage)
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setActionLoading(false)
      setConfirmDialog(null)
    }
  }

  async function handleActivateBulk(ids: number[]) {
    setActionLoading(true)
    try {
      const res = await accountApi.activateStudentsBulk(ids)
      const { activated, skipped } = res.data
      toast.success(
        skipped > 0
          ? `${activated} activated, ${skipped} already had accounts.`
          : `${activated} accounts activated.`,
      )
      setSelectedIds(new Set())
      void fetchStudents(studentPage)
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setActionLoading(false)
      setConfirmDialog(null)
    }
  }

  async function handleToggleBulk(ids: number[], tab: Tab, isActive: boolean) {
    setActionLoading(true)
    try {
      let updated: number, skipped: number
      if (tab === 'students') {
        const res = await accountApi.toggleStudentsAccountBulk(ids, isActive)
        updated = res.data.updated
        skipped = res.data.skipped
      } else {
        const res = await accountApi.toggleLecturersAccountBulk(ids, isActive)
        updated = res.data.updated
        skipped = res.data.skipped
      }
      const verb = isActive ? 'reactivated' : 'deactivated'
      toast.success(
        skipped > 0
          ? `${updated} ${verb}, ${skipped} skipped (no account).`
          : `${updated} accounts ${verb}.`,
      )
      setSelectedIds(new Set())
      if (tab === 'students') void fetchStudents(studentPage)
      else void fetchLecturers(lecturerPage)
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setActionLoading(false)
      setConfirmDialog(null)
    }
  }

  function confirmAction() {
    if (!confirmDialog) return
    switch (confirmDialog.kind) {
      case 'activate-single':
        void handleActivateSingle(confirmDialog.item)
        break
      case 'deactivate-single':
        void handleToggleSingle(confirmDialog.item, confirmDialog.tab, false)
        break
      case 'activate-bulk':
        void handleActivateBulk(confirmDialog.ids)
        break
      case 'deactivate-bulk':
        void handleToggleBulk(confirmDialog.ids, confirmDialog.tab, false)
        break
    }
  }

  // ─── Confirmation dialog content ──────────────────────────────────────────

  type DialogContent = { title: string; description: string; actionLabel: string; isDangerous: boolean }

  function getDialogContent(): DialogContent {
    if (!confirmDialog) return { title: '', description: '', actionLabel: '', isDangerous: false }
    switch (confirmDialog.kind) {
      case 'activate-single':
        return {
          title: 'Activate Account',
          description: `Activate account for ${confirmDialog.item.fullName}? They will be able to log in with their student ID.`,
          actionLabel: 'Activate',
          isDangerous: false,
        }
      case 'deactivate-single':
        return {
          title: 'Deactivate Account',
          description: `Deactivate ${confirmDialog.item.fullName}'s account? They will lose login access immediately.`,
          actionLabel: 'Deactivate',
          isDangerous: true,
        }
      case 'activate-bulk':
        return {
          title: 'Activate Accounts',
          description: `Activate accounts for ${confirmDialog.ids.length} students? They will be able to log in with their student ID.`,
          actionLabel: 'Activate All',
          isDangerous: false,
        }
      case 'deactivate-bulk':
        return {
          title: 'Deactivate Accounts',
          description: `Deactivate ${confirmDialog.ids.length} accounts? These users will lose login access immediately.`,
          actionLabel: 'Deactivate All',
          isDangerous: true,
        }
    }
  }

  const dialogContent = getDialogContent()
  const selectedCount = selectedIds.size

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-semibold text-on-surface">
          Account Management
        </h1>
        <p className="font-sans text-sm font-medium text-muted-foreground mt-1">
          Manage login access for students and lecturers.
        </p>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 p-1 bg-surface-container rounded-lg w-fit">
        {(['students', 'lecturers'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => switchTab(tab)}
            className={`px-5 py-1.5 rounded-md font-label text-sm capitalize transition-colors ${
              activeTab === tab
                ? 'bg-surface shadow-sm text-primary font-medium'
                : 'text-muted-foreground hover:text-on-surface'
            }`}
          >
            {tab === 'students' ? 'Students' : 'Lecturers'}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder={
            activeTab === 'students'
              ? 'Search by name, student ID, or email…'
              : 'Search by name, lecturer ID, or email…'
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="font-sans text-sm max-w-xs"
        />
        {activeTab === 'students' ? (
          <Select
            value={studentStatus}
            onValueChange={(v) => setStudentStatus(v as StudentStatusFilter)}
          >
            <SelectTrigger className="w-44 font-sans text-sm">
              <SelectValue placeholder="Account status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="no-account">No Account</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Select
            value={lecturerStatus}
            onValueChange={(v) => setLecturerStatus(v as LecturerStatusFilter)}
          >
            <SelectTrigger className="w-44 font-sans text-sm">
              <SelectValue placeholder="Account status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Bulk action toolbar — visible only when ≥1 row is checked */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-4 px-4 py-3 bg-primary/5 rounded-lg">
          <span className="font-label text-sm font-medium text-primary">
            {selectedCount} selected
          </span>
          <div className="flex gap-2">
            {activeTab === 'students' && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={actionLoading}
                  onClick={() =>
                    setConfirmDialog({
                      kind: 'activate-bulk',
                      ids: Array.from(selectedIds),
                    })
                  }
                  className="font-label text-xs h-7 px-3 bg-primary/10 text-primary hover:bg-primary/20"
                >
                  Activate Selected
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={actionLoading}
                  onClick={() =>
                    setConfirmDialog({
                      kind: 'deactivate-bulk',
                      ids: Array.from(selectedIds),
                      tab: 'students',
                    })
                  }
                  className="font-label text-xs h-7 px-3 text-destructive hover:bg-destructive/10"
                >
                  Deactivate Selected
                </Button>
              </>
            )}
            {activeTab === 'lecturers' && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={actionLoading}
                  onClick={() =>
                    setConfirmDialog({
                      kind: 'deactivate-bulk',
                      ids: Array.from(selectedIds),
                      tab: 'lecturers',
                    })
                  }
                  className="font-label text-xs h-7 px-3 text-destructive hover:bg-destructive/10"
                >
                  Deactivate Selected
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={actionLoading}
                  onClick={() =>
                    void handleToggleBulk(Array.from(selectedIds), 'lecturers', true)
                  }
                  className="font-label text-xs h-7 px-3 bg-primary/10 text-primary hover:bg-primary/20"
                >
                  Reactivate Selected
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-surface-container-low rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-container">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded accent-primary cursor-pointer"
                />
              </th>
              {activeTab === 'students' ? (
                <>
                  <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">Student ID</th>
                  <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">Full Name</th>
                  <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">Status</th>
                  <th className="px-4 py-3" />
                </>
              ) : (
                <>
                  <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">Lecturer ID</th>
                  <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">Full Name</th>
                  <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">Status</th>
                  <th className="px-4 py-3" />
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center font-sans text-sm text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center font-sans text-sm text-destructive">
                  {error}
                </td>
              </tr>
            )}

            {/* Students rows */}
            {!loading && !error && activeTab === 'students' && students.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center font-sans text-sm text-muted-foreground">
                  No students found.
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              activeTab === 'students' &&
              students.map((s) => (
                <tr
                  key={s.id}
                  className="border-t border-surface-container hover:bg-surface-container transition-colors"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(s.id)}
                      onChange={() => toggleSelect(s.id)}
                      className="h-4 w-4 rounded accent-primary cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 font-sans text-sm font-medium text-on-surface">
                    {s.studentId}
                  </td>
                  <td className="px-4 py-3 font-sans text-sm text-on-surface">{s.fullName}</td>
                  <td className="px-4 py-3 font-sans text-sm text-muted-foreground">{s.email}</td>
                  <td className="px-4 py-3">
                    <StudentStatusBadge item={s} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {!s.hasAccount && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={actionLoading}
                          onClick={() =>
                            setConfirmDialog({ kind: 'activate-single', item: s })
                          }
                          className="font-label text-xs h-7 px-2 bg-primary/10 text-primary hover:bg-primary/20"
                        >
                          Activate
                        </Button>
                      )}
                      {s.hasAccount && s.isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={actionLoading}
                          onClick={() =>
                            setConfirmDialog({
                              kind: 'deactivate-single',
                              item: s,
                              tab: 'students',
                            })
                          }
                          className="font-label text-xs h-7 px-2 text-destructive hover:bg-destructive/10"
                        >
                          Deactivate
                        </Button>
                      )}
                      {s.hasAccount && !s.isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={actionLoading}
                          onClick={() => void handleToggleSingle(s, 'students', true)}
                          className="font-label text-xs h-7 px-2 bg-primary/10 text-primary hover:bg-primary/20"
                        >
                          Reactivate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

            {/* Lecturers rows */}
            {!loading && !error && activeTab === 'lecturers' && lecturers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center font-sans text-sm text-muted-foreground">
                  No lecturers found.
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              activeTab === 'lecturers' &&
              lecturers.map((l) => (
                <tr
                  key={l.id}
                  className="border-t border-surface-container hover:bg-surface-container transition-colors"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(l.id)}
                      onChange={() => toggleSelect(l.id)}
                      className="h-4 w-4 rounded accent-primary cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 font-sans text-sm font-medium text-on-surface">
                    {l.lecturerId}
                  </td>
                  <td className="px-4 py-3 font-sans text-sm text-on-surface">{l.fullName}</td>
                  <td className="px-4 py-3 font-sans text-sm text-muted-foreground">{l.email}</td>
                  <td className="px-4 py-3">
                    <LecturerStatusBadge item={l} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {l.isActive ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={actionLoading}
                          onClick={() =>
                            setConfirmDialog({
                              kind: 'deactivate-single',
                              item: l,
                              tab: 'lecturers',
                            })
                          }
                          className="font-label text-xs h-7 px-2 text-destructive hover:bg-destructive/10"
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={actionLoading}
                          onClick={() => void handleToggleSingle(l, 'lecturers', true)}
                          className="font-label text-xs h-7 px-2 bg-primary/10 text-primary hover:bg-primary/20"
                        >
                          Reactivate
                        </Button>
                      )}
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
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || loading}
              className="font-label text-sm"
            >
              Previous
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
              className="font-label text-sm"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation dialog — single instance, parameterized by confirmDialog state */}
      <AlertDialog
        open={confirmDialog !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog(null)
        }}
      >
        <AlertDialogContent
          className="bg-surface"
          style={{ boxShadow: '0 0 32px 0 rgba(25,28,29,0.06)' }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-lg font-semibold text-on-surface">
              {dialogContent.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="font-sans text-sm text-muted-foreground">
              {dialogContent.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading} className="font-label">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading}
              onClick={confirmAction}
              className={`font-label ${
                dialogContent.isDangerous
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : 'bg-gradient-to-br from-primary to-primary-container text-primary-foreground'
              }`}
            >
              {actionLoading ? 'Processing…' : dialogContent.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd frontend && pnpm run build 2>&1 | head -50
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 3: Commit the component**

```bash
git add frontend/src/features/account/components/AccountManagementPage.tsx
git commit -m "Implement AccountManagementPage with tab toggle, filters, bulk actions, and confirmations"
```

---

## Task 4 — Browser verification

**Files:** None (verification only)

- [ ] **Step 1: Start the dev server (backend + frontend)**

In one terminal:
```bash
cd backend && pnpm run start:dev
```

In another terminal:
```bash
cd frontend && pnpm run dev
```

- [ ] **Step 2: Verify the Students tab — display and filtering**

1. Log in as admin and navigate to `/admin/accounts`
2. Confirm the page header reads "Account Management"
3. Confirm "Students" tab is active by default and shows the student list with Status column
4. Confirm students without accounts show the grey "No Account" badge
5. Confirm students with active accounts show the blue "Active" badge
6. Confirm deactivated students show the amber "Inactive" badge
7. Type in the search box — confirm results filter after ~300ms
8. Select "No Account" from the dropdown — confirm only no-account students appear
9. Select "Active" — confirm only active students appear
10. Clear filters — confirm all students return

- [ ] **Step 3: Verify the Students tab — single actions**

1. Find a student with no account → click "Activate" → confirm dialog appears with correct message → click "Activate" → confirm success toast + student now shows "Active" badge
2. Find that student again → click "Deactivate" → confirm dialog appears → click "Deactivate" → confirm success toast + student now shows "Inactive" badge
3. Find that student again → click "Reactivate" → confirm NO dialog appears — action fires immediately → confirm success toast + student now shows "Active" badge

- [ ] **Step 4: Verify the Students tab — bulk actions**

1. Check 3 students with no account → confirm bulk toolbar appears showing "3 selected"
2. Click "Activate Selected" → confirm dialog with count → confirm → confirm success toast with activated/skipped breakdown → toolbar disappears
3. Check 2 active students → click "Deactivate Selected" → confirm dialog → confirm → success toast → students show "Inactive"
4. Select all (header checkbox) → verify all rows become checked → deselect all → verify all unchecked

- [ ] **Step 5: Verify the Lecturers tab**

1. Click "Lecturers" tab — confirm selection resets, search clears, lecturer data loads
2. Confirm "Active"/"Inactive" badges render correctly
3. No "Activate" button for lecturers (they always have accounts)
4. Deactivate a lecturer → confirm dialog + toast + badge updates
5. Reactivate same lecturer → immediate (no dialog) + toast + badge back to "Active"
6. Bulk deactivate — confirm dialog + toast
7. Bulk reactivate — NO dialog — fires immediately + toast

- [ ] **Step 6: Verify error handling**

1. Stop the backend server
2. Navigate to `/admin/accounts` — confirm inline error message appears in the table body
3. Restart backend — refresh — data loads again

- [ ] **Step 7: Verify the Lecturers filter dropdown**

1. On Lecturers tab: status dropdown shows "All / Active / Inactive" (no "No Account" option)
2. Selecting "Inactive" filters to only inactive lecturers

- [ ] **Step 8: Final commit**

```bash
git add .
git commit -m "Verify AccountManagementPage end-to-end — all actions and edge cases pass"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Route `/admin/accounts` behind `ProtectedRoute → AppLayout → AdminRoute` (Task 2)
- ✅ "Accounts" nav link after "Lecturers" in sidebar (Task 2)
- ✅ Header: "Account Management" + subtitle (Task 3)
- ✅ Tab toggle: Students (default) | Lecturers — resets selection on switch (Task 3)
- ✅ Search input debounced 300ms — searches name, ID, email (Task 3)
- ✅ Students status filter: All / No Account / Active / Inactive (Task 3)
- ✅ Lecturers status filter: All / Active / Inactive (Task 3)
- ✅ Status badges: grey No Account, blue Active, amber Inactive (Task 3)
- ✅ Students table columns: ☐ / Student ID / Full Name / Email / Status / Actions (Task 3)
- ✅ Lecturers table columns: ☐ / Lecturer ID / Full Name / Email / Status / Actions (Task 3)
- ✅ Students actions: Activate (no account) / Deactivate (active) / Reactivate (inactive) (Task 3)
- ✅ Lecturers actions: Deactivate (active) / Reactivate (inactive) — no Activate (Task 3)
- ✅ Bulk toolbar — visible when ≥1 selected, shows "X selected" (Task 3)
- ✅ Students bulk: "Activate Selected" + "Deactivate Selected" (Task 3)
- ✅ Lecturers bulk: "Deactivate Selected" + "Reactivate Selected" (Task 3)
- ✅ Pagination: Prev/Next + "Showing X–Y of Z" (Task 3)
- ✅ Confirmation dialogs: activate-single, deactivate-single, activate-bulk, deactivate-bulk (Task 3)
- ✅ No confirmation for reactivate (non-destructive) — fires inline (Task 3)
- ✅ Toast: success on action, error on API failure (Task 3)
- ✅ Toast skipped message for bulk ops: "X activated, Y already had accounts" (Task 3)
- ✅ Inline error row in table on list fetch failure (Task 3)
- ✅ No Zustand store — all state is local `useState` (Task 3)
- ✅ `isActive` added to `StudentItem` / `LecturerItem` types (Task 1)
- ✅ `accountStatus` query param added to `StudentQuery` / `LecturerQuery` (Task 1)
