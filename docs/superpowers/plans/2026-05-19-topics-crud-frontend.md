# Topics CRUD — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **PREREQUISITE:** The backend plan (`2026-05-19-topics-crud-backend.md`) must be fully implemented and verified by the user before starting this plan.

**Goal:** Build two pages — Topics Bank (all roles, read-only browse) and My Topics (lecturer-only CRUD) — with a shared topic form that supports pre-filling from an existing topic.

**Architecture:** New `frontend/src/features/topic/` feature module following existing patterns. Zustand store per feature. Two pages with a shared form modal. Role-based route guards added to the router. AppLayout extended with per-role sidebar nav.

**Tech Stack:** React 19, TypeScript, Zustand 5, Axios, Tailwind CSS v4, shadcn/ui, React Router 7.

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| `frontend/src/features/topic/api.ts` | Create | Types + axios calls for all topic endpoints |
| `frontend/src/features/topic/store.ts` | Create | Zustand store: bank topics, my topics, semesters, filters |
| `frontend/src/features/topic/components/TopicCard.tsx` | Create | Single topic card used on both pages |
| `frontend/src/features/topic/components/TopicFilters.tsx` | Create | Filter bar: semester picker, status toggle, search |
| `frontend/src/features/topic/components/TopicForm.tsx` | Create | Shared create/edit dialog; accepts optional prefill |
| `frontend/src/features/topic/components/TopicPickerDialog.tsx` | Create | Browse-and-select dialog for pre-filling the form |
| `frontend/src/features/topic/components/TopicsBankPage.tsx` | Create | `/topics` page — all-role read-only browse |
| `frontend/src/features/topic/components/MyTopicsPage.tsx` | Create | `/my-topics` page — lecturer CRUD |
| `frontend/src/router/guards.tsx` | Modify | Add `LecturerRoute` guard |
| `frontend/src/router/index.tsx` | Modify | Add `/topics` and `/my-topics` routes; fix default redirect |
| `frontend/src/layouts/AppLayout.tsx` | Modify | Add per-role sidebar nav; Topics link for all roles |

---

## Task 0: Extend UserProfile Type

**Files:**
- Modify: `frontend/src/features/auth/store/authStore.ts`

The backend plan Task 8.5 extends `buildProfile()` to return `lecturer: { id, maxStudents } | null`. Update the frontend `UserProfile` type to match so that `MyTopicsPage` and `TopicsBankPage` can read the lecturer's id directly from the auth store — no bootstrapping from topic list results needed.

- [ ] **Step 1: Update UserProfile in authStore.ts**

Replace the entire file:

```typescript
// frontend/src/features/auth/store/authStore.ts
import { create } from 'zustand'

export interface UserProfile {
  id: number
  username: string
  role: 'ADMIN' | 'LECTURER' | 'STUDENT'
  fullName: string | null
  email: string | null
  lecturer: { id: number; maxStudents: number } | null
  student: { id: number } | null
}

interface AuthState {
  user: UserProfile | null
  accessToken: string | null
  setAuth: (user: UserProfile, accessToken: string) => void
  setAccessToken: (accessToken: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  setAccessToken: (accessToken) => set({ accessToken }),
  clearAuth: () => set({ user: null, accessToken: null }),
}))
```

`authApi.me()` and `LoginResponse.user` are already typed as `UserProfile`, so the type extension flows through automatically — no other auth files need changes.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/auth/store/authStore.ts
git commit -m "feat(auth): extend UserProfile type with lecturer and student relation fields"
```

---

## Task 1: API Layer

**Files:**
- Create: `frontend/src/features/topic/api.ts`

- [ ] **Step 1: Create api.ts**

```typescript
// frontend/src/features/topic/api.ts
import api from '../../lib/axios'

export type TopicStatus = 'OPEN' | 'FULL' | 'CLOSED'

export interface TopicLecturer {
  id: number
  fullName: string
  email: string
  title: string | null
}

export interface TopicItem {
  id: number
  title: string
  description: string | null
  requirements: string | null
  note: string | null
  status: TopicStatus
  createdAt: string
  semesterId: number
  lecturer: TopicLecturer
}

export interface TopicQuery {
  semesterId?: number
  status?: TopicStatus
  lecturerId?: number
  search?: string
}

export interface CreateTopicDto {
  title: string
  description?: string
  requirements?: string
  note?: string
}

export interface UpdateTopicDto {
  title?: string
  description?: string
  requirements?: string
  note?: string
}

export { extractErrorMessage } from '../../lib/utils'

export const topicApi = {
  list: (params?: TopicQuery) =>
    api.get<TopicItem[]>('/topics', { params }),

  get: (id: number) =>
    api.get<TopicItem>(`/topics/${id}`),

  create: (dto: CreateTopicDto) =>
    api.post<TopicItem>('/topics', dto),

  update: (id: number, dto: UpdateTopicDto) =>
    api.patch<TopicItem>(`/topics/${id}`, dto),

  remove: (id: number) =>
    api.delete<void>(`/topics/${id}`),
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/topic/api.ts
git commit -m "feat(topics): add topic API layer with types and axios calls"
```

---

## Task 2: Zustand Store

**Files:**
- Create: `frontend/src/features/topic/store.ts`

The store has two independent topic lists (bank and my-topics) to avoid cross-contamination between the two pages. Semesters are fetched once and shared.

- [ ] **Step 1: Create store.ts**

```typescript
// frontend/src/features/topic/store.ts
import { create } from 'zustand'
import { topicApi, TopicItem, TopicQuery, CreateTopicDto, UpdateTopicDto } from './api'
import { semesterApi, Semester } from '../semester/api'

interface TopicState {
  // Topics Bank
  bankTopics: TopicItem[]
  bankLoading: boolean
  bankError: string | null

  // My Topics
  myTopics: TopicItem[]
  myLoading: boolean
  myError: string | null

  // Shared semester list for filter dropdowns
  semesters: Semester[]
  semestersLoading: boolean

  fetchBankTopics: (query?: TopicQuery) => Promise<void>
  fetchMyTopics: (lecturerId: number, semesterId?: number) => Promise<void>
  fetchSemesters: () => Promise<void>
  createTopic: (dto: CreateTopicDto) => Promise<TopicItem>
  updateTopic: (id: number, dto: UpdateTopicDto) => Promise<TopicItem>
  deleteTopic: (id: number) => Promise<void>
}

export const useTopicStore = create<TopicState>((set) => ({
  bankTopics: [],
  bankLoading: false,
  bankError: null,

  myTopics: [],
  myLoading: false,
  myError: null,

  semesters: [],
  semestersLoading: false,

  fetchBankTopics: async (query) => {
    set({ bankLoading: true, bankError: null })
    try {
      const res = await topicApi.list(query)
      set({ bankTopics: res.data })
    } catch {
      set({ bankError: 'Failed to load topics' })
    } finally {
      set({ bankLoading: false })
    }
  },

  fetchMyTopics: async (lecturerId, semesterId) => {
    set({ myLoading: true, myError: null })
    try {
      const res = await topicApi.list({ lecturerId, semesterId })
      set({ myTopics: res.data })
    } catch {
      set({ myError: 'Failed to load your topics' })
    } finally {
      set({ myLoading: false })
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

  createTopic: async (dto) => {
    const res = await topicApi.create(dto)
    return res.data
  },

  updateTopic: async (id, dto) => {
    const res = await topicApi.update(id, dto)
    return res.data
  },

  deleteTopic: async (id) => {
    await topicApi.remove(id)
  },
}))
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/topic/store.ts
git commit -m "feat(topics): add Zustand topic store with bank, my-topics, and semester actions"
```

---

## Task 3: Router Guards + Routes + AppLayout Nav

**Files:**
- Modify: `frontend/src/router/guards.tsx`
- Modify: `frontend/src/router/index.tsx`
- Modify: `frontend/src/layouts/AppLayout.tsx`

- [ ] **Step 1: Add `LecturerRoute` guard to guards.tsx**

```typescript
// frontend/src/router/guards.tsx
import { Navigate, Outlet } from 'react-router'
import { useAuthStore } from '../features/auth/store/authStore'

export function ProtectedRoute() {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

export function PublicRoute() {
  const user = useAuthStore((s) => s.user)
  if (user) return <Navigate to="/" replace />
  return <Outlet />
}

export function AdminRoute() {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'ADMIN') return <Navigate to="/" replace />
  return <Outlet />
}

export function LecturerRoute() {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'LECTURER') return <Navigate to="/" replace />
  return <Outlet />
}
```

- [ ] **Step 2: Update router index.tsx**

```typescript
// frontend/src/router/index.tsx
import { createBrowserRouter, Navigate } from 'react-router'
import { ProtectedRoute, PublicRoute, AdminRoute, LecturerRoute } from './guards'
import LoginPage from '../features/auth/components/LoginPage'
import AppLayout from '../layouts/AppLayout'
import SemesterListPage from '../features/semester/components/SemesterListPage'
import StudentListPage from '../features/student/components/StudentListPage'
import LecturerListPage from '../features/lecturer/components/LecturerListPage'
import EnrollmentListPage from '../features/enrollment/components/EnrollmentListPage'
import EnrollmentImportPage from '../features/enrollment/components/EnrollmentImportPage'
import AccountManagementPage from '../features/account/components/AccountManagementPage'
import TopicsBankPage from '../features/topic/components/TopicsBankPage'
import MyTopicsPage from '../features/topic/components/MyTopicsPage'

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
          { path: '/', element: <Navigate to="/topics" replace /> },
          { path: '/topics', element: <TopicsBankPage /> },
          {
            element: <AdminRoute />,
            children: [
              { path: '/admin/semesters', element: <SemesterListPage /> },
              { path: '/admin/students', element: <StudentListPage /> },
              { path: '/admin/lecturers', element: <LecturerListPage /> },
              { path: '/admin/accounts', element: <AccountManagementPage /> },
              { path: '/admin/enrollments', element: <EnrollmentListPage /> },
              { path: '/admin/enrollments/import', element: <EnrollmentImportPage /> },
            ],
          },
          {
            element: <LecturerRoute />,
            children: [
              { path: '/my-topics', element: <MyTopicsPage /> },
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

- [ ] **Step 3: Update AppLayout.tsx to show per-role sidebar nav**

Replace the full `AppLayout.tsx`:

```tsx
// frontend/src/layouts/AppLayout.tsx
import { NavLink, useNavigate, Outlet } from 'react-router'
import { useAuthStore } from '../features/auth/store/authStore'
import { authApi } from '../features/auth/api'
import { Button } from '../components/ui/button'

const roleBadgeClass: Record<string, string> = {
  ADMIN: 'bg-primary/10 text-primary',
  LECTURER: 'bg-tertiary/10 text-tertiary',
  STUDENT: 'bg-surface-container-high text-on-surface',
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block px-3 py-2 rounded-md font-sans text-sm transition-colors ${
    isActive
      ? 'bg-primary/10 text-primary font-medium'
      : 'text-on-surface hover:bg-surface-container'
  }`

export default function AppLayout() {
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore — still clear local state
    }
    clearAuth()
    navigate('/login')
  }

  const isAdmin = user?.role === 'ADMIN'
  const isLecturer = user?.role === 'LECTURER'
  const isStudent = user?.role === 'STUDENT'

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Topbar */}
      <header className="sticky top-0 z-50 backdrop-blur-[12px] bg-surface/80 px-6 py-4 flex items-center justify-between">
        <span className="font-display text-xl font-semibold text-primary">
          Thesis Management System
        </span>
        <div className="flex items-center gap-4">
          <span className="font-sans text-sm text-on-surface">{user?.username}</span>
          {user?.role && (
            <span
              className={`font-label text-xs font-medium px-2.5 py-0.5 rounded-full ${roleBadgeClass[user.role] ?? 'bg-surface-container-high text-on-surface'}`}
            >
              {user.role}
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={handleLogout} className="font-label text-sm">
            Sign out
          </Button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-56 bg-surface-container-highest shrink-0 px-3 py-6">
          {/* Shared: Topics Bank — visible to all roles */}
          <p className="font-label text-xs font-medium text-muted-foreground uppercase tracking-widest px-3 mb-3">
            Topics
          </p>
          <nav className="space-y-0.5 mb-6">
            <NavLink to="/topics" end className={navLinkClass}>
              Topics Bank
            </NavLink>
            {isLecturer && (
              <NavLink to="/my-topics" end className={navLinkClass}>
                My Topics
              </NavLink>
            )}
          </nav>

          {/* Admin-only section */}
          {isAdmin && (
            <>
              <p className="font-label text-xs font-medium text-muted-foreground uppercase tracking-widest px-3 mb-3">
                Administration
              </p>
              <nav className="space-y-0.5">
                <NavLink to="/admin/semesters" end className={navLinkClass}>Semesters</NavLink>
                <NavLink to="/admin/students" end className={navLinkClass}>Students</NavLink>
                <NavLink to="/admin/lecturers" end className={navLinkClass}>Lecturers</NavLink>
                <NavLink to="/admin/accounts" end className={navLinkClass}>Accounts</NavLink>
                <NavLink to="/admin/enrollments" end className={navLinkClass}>Enrollments</NavLink>
                <NavLink to="/admin/enrollments/import" className={navLinkClass}>Import Enrollments</NavLink>
              </nav>
            </>
          )}

          {/* Student-only section — placeholder for future student features */}
          {isStudent && (
            <p className="font-label text-xs text-muted-foreground px-3">
              Browse topics and contact lecturers via email.
            </p>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/router/guards.tsx frontend/src/router/index.tsx frontend/src/layouts/AppLayout.tsx
git commit -m "feat(topics): add LecturerRoute guard, topic routes, and per-role sidebar nav"
```

---

## Task 3.5: Install Missing shadcn/ui Components

**Files:**
- None (CLI installs to `frontend/src/components/ui/`)

Tasks 4–7 use `Badge`, `Tooltip`, `ScrollArea`, and `Textarea` from shadcn/ui. These are not yet installed. Add them now before writing any components that import them.

- [ ] **Step 1: Install the four missing components**

```bash
cd frontend
npx shadcn@latest add badge
npx shadcn@latest add tooltip
npx shadcn@latest add scroll-area
npx shadcn@latest add textarea
```

Each command generates a file under `frontend/src/components/ui/`. Accept the defaults (overwrite is fine on a fresh install).

- [ ] **Step 2: Verify files exist**

```bash
ls frontend/src/components/ui/
```

Expected: `badge.tsx`, `tooltip.tsx`, `scroll-area.tsx`, `textarea.tsx` present in the list.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/badge.tsx frontend/src/components/ui/tooltip.tsx frontend/src/components/ui/scroll-area.tsx frontend/src/components/ui/textarea.tsx
git commit -m "chore(ui): add badge, tooltip, scroll-area, textarea shadcn components"
```

---

## Task 4: TopicCard Component

**Files:**
- Create: `frontend/src/features/topic/components/TopicCard.tsx`

The card is used on both pages. On the bank page it shows a Copy button for lecturers and an Edit shortcut for own topics. On My Topics it shows Edit, Delete, Copy.

- [ ] **Step 1: Create TopicCard.tsx**

```tsx
// frontend/src/features/topic/components/TopicCard.tsx
import { Copy, Pencil, Trash2 } from 'lucide-react'
import { TopicItem } from '../api'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../../../components/ui/tooltip'

const statusColors: Record<string, string> = {
  OPEN: 'bg-emerald-100 text-emerald-800',
  FULL: 'bg-amber-100 text-amber-800',
  CLOSED: 'bg-surface-container-high text-muted-foreground',
}

interface TopicCardProps {
  topic: TopicItem
  /** Current user's lecturer id, if the user is a lecturer */
  myLecturerId?: number
  /** Called when Copy button clicked — passes the topic as prefill */
  onCopy?: (topic: TopicItem) => void
  /** Called when Edit button clicked (My Topics only) */
  onEdit?: (topic: TopicItem) => void
  /** Called when Delete button clicked (My Topics only) */
  onDelete?: (topic: TopicItem) => void
  /** When true, shows Edit + Delete + Copy (My Topics mode) */
  showActions?: boolean
  /** When true, delete button is disabled (topic has theses) */
  deleteDisabled?: boolean
}

export default function TopicCard({
  topic,
  myLecturerId,
  onCopy,
  onEdit,
  onDelete,
  showActions = false,
  deleteDisabled = false,
}: TopicCardProps) {
  const isOwn = myLecturerId !== undefined && topic.lecturer.id === myLecturerId
  const isLecturer = myLecturerId !== undefined

  return (
    <div className="bg-surface-container rounded-xl p-5 flex flex-col gap-3 border border-outline-variant/30 hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-sans text-base font-semibold text-on-surface leading-snug flex-1">
          {topic.title}
        </h3>
        <span className={`font-label text-xs font-medium px-2.5 py-0.5 rounded-full shrink-0 ${statusColors[topic.status]}`}>
          {topic.status}
        </span>
      </div>

      {/* Lecturer info */}
      <div className="flex flex-col gap-0.5">
        <span className="font-sans text-sm font-medium text-on-surface">
          {topic.lecturer.fullName}
          {topic.lecturer.title && (
            <span className="text-muted-foreground font-normal"> · {topic.lecturer.title}</span>
          )}
        </span>
        <a
          href={`mailto:${topic.lecturer.email}`}
          className="font-sans text-xs text-primary hover:underline"
        >
          {topic.lecturer.email}
        </a>
      </div>

      {/* Description preview */}
      {topic.description && (
        <p className="font-sans text-sm text-muted-foreground line-clamp-3">
          {topic.description}
        </p>
      )}

      {/* Note */}
      {topic.note && (
        <div className="bg-surface-container-high rounded-lg px-3 py-2">
          <p className="font-sans text-xs text-on-surface italic">{topic.note}</p>
        </div>
      )}

      {/* Actions */}
      {(showActions || isLecturer) && (
        <div className="flex items-center gap-2 pt-1">
          {/* My Topics actions */}
          {showActions && isOwn && (
            <>
              <Button size="sm" variant="outline" onClick={() => onEdit?.(topic)}>
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                Edit
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete?.(topic)}
                      disabled={deleteDisabled}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Delete
                    </Button>
                  </span>
                </TooltipTrigger>
                {deleteDisabled && (
                  <TooltipContent>Cannot delete — topic has assigned theses</TooltipContent>
                )}
              </Tooltip>
            </>
          )}

          {/* Copy — visible to any lecturer on both pages */}
          {isLecturer && (
            <>
              {/* Edit shortcut on bank page for own topics */}
              {!showActions && isOwn && (
                <Button size="sm" variant="outline" onClick={() => onEdit?.(topic)}>
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  Edit
                </Button>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" onClick={() => onCopy?.(topic)}>
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    Copy
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Use as template for a new topic</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/topic/components/TopicCard.tsx
git commit -m "feat(topics): add TopicCard component"
```

---

## Task 5: TopicFilters Component

**Files:**
- Create: `frontend/src/features/topic/components/TopicFilters.tsx`

- [ ] **Step 1: Create TopicFilters.tsx**

```tsx
// frontend/src/features/topic/components/TopicFilters.tsx
import { useEffect } from 'react'
import { TopicStatus, TopicQuery } from '../api'
import { Semester } from '../../semester/api'
import { Input } from '../../../components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select'
import { Badge } from '../../../components/ui/badge'

const STATUSES: TopicStatus[] = ['OPEN', 'FULL', 'CLOSED']

const statusColors: Record<TopicStatus, string> = {
  OPEN: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 cursor-pointer',
  FULL: 'bg-amber-100 text-amber-800 hover:bg-amber-200 cursor-pointer',
  CLOSED: 'bg-surface-container-high text-muted-foreground hover:bg-surface-container cursor-pointer',
}

interface TopicFiltersProps {
  filters: TopicQuery
  semesters: Semester[]
  onChange: (filters: TopicQuery) => void
}

export default function TopicFilters({ filters, semesters, onChange }: TopicFiltersProps) {
  const toggleStatus = (s: TopicStatus) => {
    onChange({ ...filters, status: filters.status === s ? undefined : s })
  }

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Semester picker */}
      <Select
        value={filters.semesterId?.toString() ?? 'active'}
        onValueChange={(val) =>
          onChange({ ...filters, semesterId: val === 'active' ? undefined : Number(val) })
        }
      >
        <SelectTrigger className="w-52 font-sans text-sm">
          <SelectValue placeholder="Active semester" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Active semester</SelectItem>
          {semesters.map((sem) => (
            <SelectItem key={sem.id} value={sem.id.toString()}>
              {sem.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status toggles */}
      <div className="flex gap-1.5">
        {STATUSES.map((s) => (
          <span
            key={s}
            onClick={() => toggleStatus(s)}
            className={`font-label text-xs font-medium px-2.5 py-1 rounded-full border transition-all select-none ${
              filters.status === s
                ? statusColors[s] + ' ring-2 ring-offset-1 ring-current'
                : statusColors[s] + ' opacity-60'
            }`}
          >
            {s}
          </span>
        ))}
      </div>

      {/* Search */}
      <Input
        placeholder="Search by title…"
        value={filters.search ?? ''}
        onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
        className="w-56 font-sans text-sm"
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/topic/components/TopicFilters.tsx
git commit -m "feat(topics): add TopicFilters component"
```

---

## Task 6: TopicPickerDialog Component

**Files:**
- Create: `frontend/src/features/topic/components/TopicPickerDialog.tsx`

This dialog lets a lecturer browse all topics (with semester filter) and pick one to use as a template. Clicking a topic calls `onSelect` with the topic, which the parent uses to pre-fill the form.

- [ ] **Step 1: Create TopicPickerDialog.tsx**

```tsx
// frontend/src/features/topic/components/TopicPickerDialog.tsx
import { useState, useEffect } from 'react'
import { topicApi, TopicItem } from '../api'
import { Semester } from '../../semester/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select'
import { Input } from '../../../components/ui/input'
import { ScrollArea } from '../../../components/ui/scroll-area'

interface TopicPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  semesters: Semester[]
  onSelect: (topic: TopicItem) => void
}

export default function TopicPickerDialog({
  open,
  onOpenChange,
  semesters,
  onSelect,
}: TopicPickerDialogProps) {
  const [semesterId, setSemesterId] = useState<number | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [topics, setTopics] = useState<TopicItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    topicApi
      .list({ semesterId, search: search || undefined })
      .then((res) => setTopics(res.data))
      .catch(() => setTopics([]))
      .finally(() => setLoading(false))
  }, [open, semesterId, search])

  const handleSelect = (topic: TopicItem) => {
    onSelect(topic)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Choose a topic to copy</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mt-2">
          <Select
            value={semesterId?.toString() ?? 'all'}
            onValueChange={(val) => setSemesterId(val === 'all' ? undefined : Number(val))}
          >
            <SelectTrigger className="w-48 font-sans text-sm">
              <SelectValue placeholder="All semesters" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All semesters</SelectItem>
              {semesters.map((sem) => (
                <SelectItem key={sem.id} value={sem.id.toString()}>
                  {sem.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Search title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 font-sans text-sm"
          />
        </div>

        <ScrollArea className="h-80 mt-3">
          {loading && (
            <p className="font-sans text-sm text-muted-foreground text-center py-8">Loading…</p>
          )}
          {!loading && topics.length === 0 && (
            <p className="font-sans text-sm text-muted-foreground text-center py-8">No topics found.</p>
          )}
          <div className="flex flex-col gap-2 pr-3">
            {topics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => handleSelect(topic)}
                className="text-left p-3 rounded-lg border border-outline-variant/30 hover:bg-surface-container transition-colors"
              >
                <p className="font-sans text-sm font-medium text-on-surface">{topic.title}</p>
                <p className="font-sans text-xs text-muted-foreground mt-0.5">
                  {topic.lecturer.fullName}
                </p>
              </button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/topic/components/TopicPickerDialog.tsx
git commit -m "feat(topics): add TopicPickerDialog for copy pre-fill flow"
```

---

## Task 7: TopicForm Component

**Files:**
- Create: `frontend/src/features/topic/components/TopicForm.tsx`

Shared form for both create and edit. When `mode='create'`, shows "Pre-fill from existing topic" link that opens `TopicPickerDialog`. Accepts optional `prefill` prop (used when Copy button is clicked directly on a card — skips the picker step).

- [ ] **Step 1: Create TopicForm.tsx**

```tsx
// frontend/src/features/topic/components/TopicForm.tsx
import { useState, useEffect } from 'react'
import { TopicItem, CreateTopicDto, UpdateTopicDto, extractErrorMessage } from '../api'
import { Semester } from '../../semester/api'
import TopicPickerDialog from './TopicPickerDialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Textarea } from '../../../components/ui/textarea'
import { Label } from '../../../components/ui/label'

interface TopicFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  /** Existing topic data when mode='edit' */
  topic?: TopicItem
  /** Pre-filled data when opened via Copy button */
  prefill?: Partial<CreateTopicDto>
  semesters: Semester[]
  onSubmit: (dto: CreateTopicDto | UpdateTopicDto) => Promise<void>
}

export default function TopicForm({
  open,
  onOpenChange,
  mode,
  topic,
  prefill,
  semesters,
  onSubmit,
}: TopicFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [requirements, setRequirements] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  // Populate form when opened
  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && topic) {
      setTitle(topic.title)
      setDescription(topic.description ?? '')
      setRequirements(topic.requirements ?? '')
      setNote(topic.note ?? '')
    } else if (prefill) {
      setTitle(prefill.title ?? '')
      setDescription(prefill.description ?? '')
      setRequirements(prefill.requirements ?? '')
      setNote(prefill.note ?? '')
    } else {
      setTitle('')
      setDescription('')
      setRequirements('')
      setNote('')
    }
    setError(null)
  }, [open, mode, topic, prefill])

  const handlePickerSelect = (picked: TopicItem) => {
    setTitle(picked.title)
    setDescription(picked.description ?? '')
    setRequirements(picked.requirements ?? '')
    setNote(picked.note ?? '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setSubmitting(true)
    setError(null)

    try {
      const dto: CreateTopicDto | UpdateTopicDto = {
        title: title.trim(),
        description: description.trim() || undefined,
        requirements: requirements.trim() || undefined,
        note: note.trim() || undefined,
      }
      await onSubmit(dto)
      onOpenChange(false)
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              {mode === 'create' ? 'New Topic' : 'Edit Topic'}
            </DialogTitle>
          </DialogHeader>

          {mode === 'create' && (
            <div className="flex items-center justify-between">
              <span className="font-sans text-sm text-muted-foreground">
                Start fresh or copy from an existing topic.
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="font-label text-sm text-primary"
                onClick={() => setPickerOpen(true)}
              >
                Pre-fill from existing
              </Button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title" className="font-label text-sm">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Topic title"
                required
                className="font-sans text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description" className="font-label text-sm">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the research topic…"
                rows={3}
                className="font-sans text-sm resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="requirements" className="font-label text-sm">Requirements</Label>
              <Textarea
                id="requirements"
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="Prerequisites or skills needed…"
                rows={2}
                className="font-sans text-sm resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="note" className="font-label text-sm">
                Note
                <span className="font-normal text-muted-foreground ml-1">
                  (visible to students)
                </span>
              </Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Availability, preferences, or any message to students…"
                rows={2}
                className="font-sans text-sm resize-none"
              />
            </div>

            {error && (
              <p className="font-sans text-sm text-destructive">{error}</p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !title.trim()}>
                {submitting ? 'Saving…' : mode === 'create' ? 'Create Topic' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <TopicPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        semesters={semesters}
        onSelect={handlePickerSelect}
      />
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/topic/components/TopicForm.tsx
git commit -m "feat(topics): add shared TopicForm with prefill and picker support"
```

---

## Task 8: TopicsBankPage

**Files:**
- Create: `frontend/src/features/topic/components/TopicsBankPage.tsx`

- [ ] **Step 1: Create TopicsBankPage.tsx**

```tsx
// frontend/src/features/topic/components/TopicsBankPage.tsx
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { useTopicStore } from '../store'
import { useAuthStore } from '../../auth/store/authStore'
import { TopicItem, TopicQuery, CreateTopicDto } from '../api'
import TopicCard from './TopicCard'
import TopicFilters from './TopicFilters'
import TopicForm from './TopicForm'

export default function TopicsBankPage() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  const {
    bankTopics,
    bankLoading,
    bankError,
    semesters,
    fetchBankTopics,
    fetchSemesters,
    createTopic,
  } = useTopicStore()

  const [filters, setFilters] = useState<TopicQuery>({})
  const [formOpen, setFormOpen] = useState(false)
  const [prefill, setPrefill] = useState<Partial<CreateTopicDto> | undefined>()

  const isLecturer = user?.role === 'LECTURER'
  const myLecturerId = user?.lecturer?.id

  useEffect(() => {
    fetchSemesters()
    fetchBankTopics(filters)
  }, [])

  const handleFilterChange = useCallback((newFilters: TopicQuery) => {
    setFilters(newFilters)
    fetchBankTopics(newFilters)
  }, [fetchBankTopics])

  const handleCopy = (topic: TopicItem) => {
    setPrefill({
      title: topic.title,
      description: topic.description ?? undefined,
      requirements: topic.requirements ?? undefined,
      note: topic.note ?? undefined,
    })
    setFormOpen(true)
  }

  const handleEditShortcut = () => {
    navigate('/my-topics')
  }

  const handleCreate = async (dto: CreateTopicDto) => {
    await createTopic(dto)
    fetchBankTopics(filters)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-on-surface">Topics Bank</h1>
      </div>

      <TopicFilters
        filters={filters}
        semesters={semesters}
        onChange={handleFilterChange}
      />

      {bankLoading && (
        <p className="font-sans text-sm text-muted-foreground">Loading topics…</p>
      )}

      {bankError && (
        <p className="font-sans text-sm text-destructive">{bankError}</p>
      )}

      {!bankLoading && !bankError && bankTopics.length === 0 && (
        <div className="text-center py-16">
          <p className="font-sans text-base text-muted-foreground">No topics found for this semester.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {bankTopics.map((topic) => (
          <TopicCard
            key={topic.id}
            topic={topic}
            myLecturerId={myLecturerId}
            onCopy={isLecturer ? handleCopy : undefined}
            onEdit={isLecturer ? handleEditShortcut : undefined}
          />
        ))}
      </div>

      {isLecturer && (
        <TopicForm
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open)
            if (!open) setPrefill(undefined)
          }}
          mode="create"
          prefill={prefill}
          semesters={semesters}
          onSubmit={handleCreate}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/topic/components/TopicsBankPage.tsx
git commit -m "feat(topics): add TopicsBankPage with filters, copy flow, and role-aware actions"
```

---

## Task 9: MyTopicsPage

**Files:**
- Create: `frontend/src/features/topic/components/MyTopicsPage.tsx`

- [ ] **Step 1: Create MyTopicsPage.tsx**

```tsx
// frontend/src/features/topic/components/MyTopicsPage.tsx
import { useEffect, useState } from 'react'
import { useTopicStore } from '../store'
import { useAuthStore } from '../../auth/store/authStore'
import { TopicItem, CreateTopicDto, UpdateTopicDto, extractErrorMessage } from '../api'
import TopicCard from './TopicCard'
import TopicForm from './TopicForm'
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
import { Plus } from 'lucide-react'

export default function MyTopicsPage() {
  const user = useAuthStore((s) => s.user)
  const myLecturerId = user?.lecturer?.id

  const {
    myTopics,
    myLoading,
    myError,
    semesters,
    fetchMyTopics,
    fetchSemesters,
    createTopic,
    updateTopic,
    deleteTopic,
  } = useTopicStore()

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingTopic, setEditingTopic] = useState<TopicItem | undefined>()
  const [prefill, setPrefill] = useState<Partial<CreateTopicDto> | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<TopicItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchSemesters()
    if (myLecturerId !== undefined) {
      fetchMyTopics(myLecturerId)
    }
  }, [])

  const openCreate = () => {
    setFormMode('create')
    setEditingTopic(undefined)
    setPrefill(undefined)
    setFormOpen(true)
  }

  const openEdit = (topic: TopicItem) => {
    setFormMode('edit')
    setEditingTopic(topic)
    setPrefill(undefined)
    setFormOpen(true)
  }

  const openCopy = (topic: TopicItem) => {
    setFormMode('create')
    setEditingTopic(undefined)
    setPrefill({
      title: topic.title,
      description: topic.description ?? undefined,
      requirements: topic.requirements ?? undefined,
      note: topic.note ?? undefined,
    })
    setFormOpen(true)
  }

  const handleSubmit = async (dto: CreateTopicDto | UpdateTopicDto) => {
    if (formMode === 'create') {
      await createTopic(dto as CreateTopicDto)
    } else if (editingTopic) {
      await updateTopic(editingTopic.id, dto as UpdateTopicDto)
    }
    if (myLecturerId !== undefined) fetchMyTopics(myLecturerId)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteTopic(deleteTarget.id)
      setDeleteTarget(null)
      if (myLecturerId !== undefined) fetchMyTopics(myLecturerId)
    } catch (err) {
      setDeleteError(extractErrorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-on-surface">My Topics</h1>
          <p className="font-sans text-sm text-muted-foreground mt-0.5">
            0 / {user?.lecturer?.maxStudents ?? '?'} capacity — full tracking after thesis assignment feature
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          New Topic
        </Button>
      </div>

      {myLoading && (
        <p className="font-sans text-sm text-muted-foreground">Loading your topics…</p>
      )}

      {myError && (
        <p className="font-sans text-sm text-destructive">{myError}</p>
      )}

      {!myLoading && !myError && myTopics.length === 0 && (
        <div className="text-center py-16">
          <p className="font-sans text-base text-muted-foreground">You have no topics yet.</p>
          <Button variant="outline" className="mt-4" onClick={openCreate}>
            Create your first topic
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {myTopics.map((topic) => (
          <TopicCard
            key={topic.id}
            topic={topic}
            myLecturerId={myLecturerId}
            showActions
            onEdit={openEdit}
            onDelete={setDeleteTarget}
            onCopy={openCopy}
            deleteDisabled={false}
          />
        ))}
      </div>

      <TopicForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) {
            setPrefill(undefined)
            setEditingTopic(undefined)
          }
        }}
        mode={formMode}
        topic={editingTopic}
        prefill={prefill}
        semesters={semesters}
        onSubmit={handleSubmit}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Delete topic?</AlertDialogTitle>
            <AlertDialogDescription className="font-sans">
              "{deleteTarget?.title}" will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="font-sans text-sm text-destructive px-1">{deleteError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/topic/components/MyTopicsPage.tsx
git commit -m "feat(topics): add MyTopicsPage with CRUD, copy, and delete confirmation"
```

---

## Task 10: Manual E2E Verification

Start both servers and verify the full user journey.

- [ ] **Step 1: Start both servers**

```bash
# Terminal 1
cd backend && pnpm run start:dev

# Terminal 2
cd frontend && pnpm run dev
```

- [ ] **Step 2: Verify routing — login as admin**

- Login as admin → should land on `/topics` (Topics Bank)
- Admin sidebar shows both Topics section and Administration section
- Admin can browse Topics Bank, change semester, filter by status, search
- Admin cannot see Copy or Edit buttons on cards (no lecturer actions)

- [ ] **Step 3: Verify routing — login as student**

- Login as student → lands on `/topics`
- Sidebar shows Topics only
- No Copy or Edit buttons visible
- Lecturer email shows as `mailto:` link

- [ ] **Step 4: Verify Topics Bank — lecturer**

- Login as lecturer → lands on `/topics`
- Sidebar shows "Topics" and "My Topics"
- Copy button appears on all topic cards
- Edit button appears only on own topic cards
- Clicking Copy on a card opens the create form pre-filled with that topic's data
- Editing pre-filled content and submitting creates a new topic in the active semester
- Clicking "Pre-fill from existing" inside an empty create form opens the picker dialog

- [ ] **Step 5: Verify My Topics — lecturer**

- Navigate to `/my-topics`
- Empty state shows "You have no topics yet" with Create button
- Click "New Topic" → empty form opens
- Create a topic → appears in the list
- Edit a topic → form opens with existing data
- Copy a topic → form opens pre-filled, submitting creates a new one
- Delete a topic → confirmation dialog, topic removed on confirm

- [ ] **Step 6: Verify role guards**

- As student, navigate to `/my-topics` → redirected to `/`
- As admin, navigate to `/my-topics` → redirected to `/`
- As lecturer, navigate to `/admin/semesters` → redirected to `/`
