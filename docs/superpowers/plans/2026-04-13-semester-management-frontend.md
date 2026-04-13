# Semester Management Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the admin semester management UI — list page with filters, create/edit modal, status transition actions, and delete confirmation — connecting to the verified backend API at `/semesters`.

**Architecture:** Feature module at `src/features/semester/` with an API client (`api.ts`), Zustand store (`semesterStore.ts`), and three components (`SemesterStatusBadge`, `SemesterFormModal`, `SemesterListPage`). Routing adds `/admin/semesters` under an `AdminRoute` guard. `AppLayout` gains a conditional left sidebar nav for admin users.

**Tech Stack:** React 19, Zustand 5, Axios (`src/lib/axios.ts`), shadcn/ui (dialog, alert-dialog, select, sonner), Tailwind CSS v4, React Router v7, TypeScript 6.

---

## File Map

| Action | Path |
|--------|------|
| Create | `frontend/src/features/semester/api.ts` |
| Create | `frontend/src/features/semester/store/semesterStore.ts` |
| Create | `frontend/src/features/semester/components/SemesterStatusBadge.tsx` |
| Create | `frontend/src/features/semester/components/SemesterFormModal.tsx` |
| Create | `frontend/src/features/semester/components/SemesterListPage.tsx` |
| Modify | `frontend/src/router/index.tsx` |
| Modify | `frontend/src/router/guards.tsx` |
| Modify | `frontend/src/layouts/AppLayout.tsx` |
| Modify | `frontend/src/App.tsx` |
| Install | shadcn: dialog, alert-dialog, select, sonner |

---

## Task 1: Install shadcn/ui Components

**Files:**
- Install: `frontend/src/components/ui/dialog.tsx`, `alert-dialog.tsx`, `select.tsx`, `sonner.tsx`

- [ ] **Step 1: Install dialog, alert-dialog, select, sonner**

Run from `frontend/` directory:
```bash
cd frontend
npx shadcn@latest add dialog alert-dialog select sonner
```

Expected: Each component appears in `src/components/ui/` — no errors.

- [ ] **Step 2: Verify files exist**

```bash
ls frontend/src/components/ui/
```

Expected output includes: `button.tsx  dialog.tsx  alert-dialog.tsx  input.tsx  label.tsx  select.tsx  sonner.tsx`

- [ ] **Step 3: Add `<Toaster />` to App.tsx**

Modify `frontend/src/App.tsx` — add import and Toaster to the JSX:

```tsx
import { useEffect, useState } from 'react'
import { RouterProvider } from 'react-router'
import axios from 'axios'
import router from './router'
import { useAuthStore } from './features/auth/store/authStore'
import type { UserProfile } from './features/auth/store/authStore'
import { Toaster } from './components/ui/sonner'

export default function App() {
  const [ready, setReady] = useState(false)
  const setAuth = useAuthStore((s) => s.setAuth)

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const refreshRes = await axios.post<{ accessToken: string }>(
          '/api/auth/refresh',
          {},
          { withCredentials: true },
        )
        const { accessToken } = refreshRes.data

        const meRes = await axios.get<UserProfile>('/api/auth/me', {
          withCredentials: true,
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        setAuth(meRes.data, accessToken)
      } catch {
        // No active session — user will see login page
      } finally {
        setReady(true)
      }
    }

    restoreSession()
  }, [setAuth])

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-400 text-sm">
        Loading…
      </div>
    )
  }

  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
    </>
  )
}
```

- [ ] **Step 4: Commit**

```bash
cd frontend && git add src/components/ui/ src/App.tsx && git commit -m "Install shadcn dialog, alert-dialog, select, sonner; add Toaster to App"
```

---

## Task 2: Semester API Client

**Files:**
- Create: `frontend/src/features/semester/api.ts`

- [ ] **Step 1: Create `api.ts`**

```typescript
// frontend/src/features/semester/api.ts
import api from '../../lib/axios'

export type SemesterStatus = 'INACTIVE' | 'ACTIVE' | 'CLOSED'

export interface Semester {
  id: number
  code: string
  name: string
  startDate: string   // ISO string — use toDateInput() to get YYYY-MM-DD
  endDate: string     // ISO string
  status: SemesterStatus
  createdAt: string
  updatedAt: string
}

export interface SemesterQuery {
  search?: string
  status?: SemesterStatus
  startDateFrom?: string  // YYYY-MM-DD
  startDateTo?: string    // YYYY-MM-DD
}

export interface CreateSemesterDto {
  code: string
  name: string
  startDate: string   // YYYY-MM-DD
  endDate: string     // YYYY-MM-DD
}

export interface UpdateSemesterDto {
  code?: string
  name?: string
  startDate?: string
  endDate?: string
}

/** Extract YYYY-MM-DD from an ISO datetime string. */
export function toDateInput(isoString: string): string {
  return isoString.slice(0, 10)
}

/** Extract a human-readable error message from an Axios error. */
export function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const data = (err as { response: { data: { message: unknown } } }).response?.data
    if (Array.isArray(data?.message)) return data.message.join(', ')
    if (typeof data?.message === 'string') return data.message
  }
  return 'An unexpected error occurred.'
}

export const semesterApi = {
  list: (params?: SemesterQuery) =>
    api.get<Semester[]>('/semesters', { params }),

  get: (id: number) =>
    api.get<Semester>(`/semesters/${id}`),

  create: (dto: CreateSemesterDto) =>
    api.post<Semester>('/semesters', dto),

  update: (id: number, dto: UpdateSemesterDto) =>
    api.patch<Semester>(`/semesters/${id}`, dto),

  remove: (id: number) =>
    api.delete<void>(`/semesters/${id}`),

  activate: (id: number) =>
    api.post<Semester>(`/semesters/${id}/activate`),

  deactivate: (id: number) =>
    api.post<Semester>(`/semesters/${id}/deactivate`),

  close: (id: number) =>
    api.post<Semester>(`/semesters/${id}/close`),
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd frontend && git add src/features/semester/api.ts && git commit -m "Add semester API client with types and error helper"
```

---

## Task 3: Semester Zustand Store

**Files:**
- Create: `frontend/src/features/semester/store/semesterStore.ts`

- [ ] **Step 1: Create `semesterStore.ts`**

```typescript
// frontend/src/features/semester/store/semesterStore.ts
import { create } from 'zustand'
import { semesterApi } from '../api'
import type { Semester, SemesterQuery } from '../api'

interface SemesterState {
  semesters: Semester[]
  loading: boolean
  error: string | null
  fetchAll: (query?: SemesterQuery) => Promise<void>
}

export const useSemesterStore = create<SemesterState>((set) => ({
  semesters: [],
  loading: false,
  error: null,

  fetchAll: async (query) => {
    set({ loading: true, error: null })
    try {
      const res = await semesterApi.list(query)
      set({ semesters: res.data, loading: false })
    } catch {
      set({ error: 'Failed to load semesters.', loading: false })
    }
  },
}))
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd frontend && git add src/features/semester/store/semesterStore.ts && git commit -m "Add semester Zustand store"
```

---

## Task 4: SemesterStatusBadge Component

**Files:**
- Create: `frontend/src/features/semester/components/SemesterStatusBadge.tsx`

- [ ] **Step 1: Create `SemesterStatusBadge.tsx`**

Design system rules:
- Pill shape (`rounded-full`)
- `label-md` typography (Inter, 0.75rem, font-medium)
- Muted tones only (no bright traffic-light colors)
- `INACTIVE` → grey (`bg-surface-container-high text-on-surface`)
- `ACTIVE` → Oxford Blue tint (`bg-primary/10 text-primary`)
- `CLOSED` → Teal tint (`bg-tertiary/10 text-tertiary`)

```tsx
// frontend/src/features/semester/components/SemesterStatusBadge.tsx
import type { SemesterStatus } from '../api'

const styles: Record<SemesterStatus, string> = {
  INACTIVE: 'bg-surface-container-high text-on-surface',
  ACTIVE: 'bg-primary/10 text-primary',
  CLOSED: 'bg-tertiary/10 text-tertiary',
}

const labels: Record<SemesterStatus, string> = {
  INACTIVE: 'Inactive',
  ACTIVE: 'Active',
  CLOSED: 'Closed',
}

interface Props {
  status: SemesterStatus
}

export default function SemesterStatusBadge({ status }: Props) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-label text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd frontend && git add src/features/semester/components/SemesterStatusBadge.tsx && git commit -m "Add SemesterStatusBadge component"
```

---

## Task 5: SemesterFormModal Component

**Files:**
- Create: `frontend/src/features/semester/components/SemesterFormModal.tsx`

This modal is used for both Create and Edit. When `semester` prop is provided it's edit mode.

- [ ] **Step 1: Create `SemesterFormModal.tsx`**

```tsx
// frontend/src/features/semester/components/SemesterFormModal.tsx
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { semesterApi, toDateInput, extractErrorMessage } from '../api'
import type { Semester } from '../api'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  semester?: Semester   // provided for edit mode; undefined for create
}

interface FormState {
  code: string
  name: string
  startDate: string   // YYYY-MM-DD
  endDate: string     // YYYY-MM-DD
}

export default function SemesterFormModal({ open, onClose, onSuccess, semester }: Props) {
  const isEdit = !!semester

  const [form, setForm] = useState<FormState>({ code: '', name: '', startDate: '', endDate: '' })
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Populate form when editing
  useEffect(() => {
    if (open && semester) {
      setForm({
        code: semester.code,
        name: semester.name,
        startDate: toDateInput(semester.startDate),
        endDate: toDateInput(semester.endDate),
      })
    } else if (open && !semester) {
      setForm({ code: '', name: '', startDate: '', endDate: '' })
    }
    setFieldError(null)
  }, [open, semester])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setFieldError(null)
  }

  function validate(): string | null {
    if (!form.code.trim()) return 'Code is required.'
    if (!form.name.trim()) return 'Name is required.'
    if (!form.startDate) return 'Start date is required.'
    if (!form.endDate) return 'End date is required.'
    if (form.endDate <= form.startDate) return 'End date must be after start date.'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validate()
    if (err) { setFieldError(err); return }

    setSubmitting(true)
    try {
      if (isEdit) {
        await semesterApi.update(semester!.id, {
          code: form.code,
          name: form.name,
          startDate: form.startDate,
          endDate: form.endDate,
        })
        toast.success('Semester updated.')
      } else {
        await semesterApi.create({
          code: form.code,
          name: form.name,
          startDate: form.startDate,
          endDate: form.endDate,
        })
        toast.success('Semester created.')
      }
      onSuccess()
      onClose()
    } catch (err) {
      setFieldError(extractErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md bg-surface" style={{ boxShadow: '0 0 32px 0 rgba(25,28,29,0.06)' }}>
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-semibold text-on-surface">
            {isEdit ? 'Edit Semester' : 'Create Semester'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="code" className="font-label text-xs font-medium text-on-surface uppercase tracking-wide">
              Code
            </Label>
            <Input
              id="code"
              name="code"
              value={form.code}
              onChange={handleChange}
              placeholder="e.g. HK1-2025"
              className="font-sans bg-surface-container-low border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name" className="font-label text-xs font-medium text-on-surface uppercase tracking-wide">
              Name
            </Label>
            <Input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Học kỳ 1 năm 2025-2026"
              className="font-sans bg-surface-container-low border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startDate" className="font-label text-xs font-medium text-on-surface uppercase tracking-wide">
                Start Date
              </Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                value={form.startDate}
                onChange={handleChange}
                className="font-sans bg-surface-container-low border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate" className="font-label text-xs font-medium text-on-surface uppercase tracking-wide">
                End Date
              </Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                value={form.endDate}
                onChange={handleChange}
                className="font-sans bg-surface-container-low border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
              />
            </div>
          </div>

          {fieldError && (
            <p className="font-sans text-sm text-destructive">{fieldError}</p>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
              className="font-label"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="font-label bg-gradient-to-br from-primary to-primary-container text-primary-foreground"
            >
              {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd frontend && git add src/features/semester/components/SemesterFormModal.tsx && git commit -m "Add SemesterFormModal for create/edit"
```

---

## Task 6: SemesterListPage Component

**Files:**
- Create: `frontend/src/features/semester/components/SemesterListPage.tsx`

This is the main page. It handles filters, table, and all actions (edit, activate, deactivate, close, delete). Confirmation dialogs are required before deactivate, close, and delete.

- [ ] **Step 1: Create `SemesterListPage.tsx`**

```tsx
// frontend/src/features/semester/components/SemesterListPage.tsx
import { useEffect, useState, useCallback } from 'react'
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
import SemesterStatusBadge from './SemesterStatusBadge'
import SemesterFormModal from './SemesterFormModal'
import { useSemesterStore } from '../store/semesterStore'
import { semesterApi, toDateInput, extractErrorMessage } from '../api'
import type { Semester, SemesterStatus } from '../api'

type ConfirmAction =
  | { type: 'deactivate'; semester: Semester }
  | { type: 'close'; semester: Semester }
  | { type: 'delete'; semester: Semester }

const confirmMessages: Record<ConfirmAction['type'], (name: string) => string> = {
  deactivate: (name) => `Deactivate "${name}"? It will return to Inactive status.`,
  close: (name) => `Close "${name}"? This cannot be undone — Closed is a terminal state.`,
  delete: (name) => `Delete "${name}"? This action is permanent.`,
}

export default function SemesterListPage() {
  const { semesters, loading, fetchAll } = useSemesterStore()

  // Filter state
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<SemesterStatus | ''>('')
  const [startDateFrom, setStartDateFrom] = useState('')
  const [startDateTo, setStartDateTo] = useState('')

  // Modal state
  const [formOpen, setFormOpen] = useState(false)
  const [editSemester, setEditSemester] = useState<Semester | undefined>(undefined)

  // Confirm dialog state
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const loadSemesters = useCallback(() => {
    fetchAll({
      search: search || undefined,
      status: statusFilter || undefined,
      startDateFrom: startDateFrom || undefined,
      startDateTo: startDateTo || undefined,
    })
  }, [fetchAll, search, statusFilter, startDateFrom, startDateTo])

  useEffect(() => {
    loadSemesters()
  }, [loadSemesters])

  function openCreate() {
    setEditSemester(undefined)
    setFormOpen(true)
  }

  function openEdit(semester: Semester) {
    setEditSemester(semester)
    setFormOpen(true)
  }

  async function handleActivate(semester: Semester) {
    try {
      await semesterApi.activate(semester.id)
      toast.success(`"${semester.name}" activated.`)
      loadSemesters()
    } catch (err) {
      toast.error(extractErrorMessage(err))
    }
  }

  async function handleConfirm() {
    if (!confirmAction) return
    setActionLoading(true)
    try {
      if (confirmAction.type === 'deactivate') {
        await semesterApi.deactivate(confirmAction.semester.id)
        toast.success(`"${confirmAction.semester.name}" deactivated.`)
      } else if (confirmAction.type === 'close') {
        await semesterApi.close(confirmAction.semester.id)
        toast.success(`"${confirmAction.semester.name}" closed.`)
      } else if (confirmAction.type === 'delete') {
        await semesterApi.remove(confirmAction.semester.id)
        toast.success(`"${confirmAction.semester.name}" deleted.`)
      }
      setConfirmAction(null)
      loadSemesters()
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-on-surface">Semesters</h1>
          <p className="font-sans text-sm text-muted-foreground mt-1">
            Manage academic semesters. Only one semester may be active at a time.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="font-label bg-gradient-to-br from-primary to-primary-container text-primary-foreground"
        >
          + Create Semester
        </Button>
      </div>

      {/* Filters toolbar */}
      <div className="flex flex-wrap gap-3 bg-surface-container-low rounded-lg p-4">
        <Input
          placeholder="Search by name or code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-56 font-sans bg-surface border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
        />

        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v === 'ALL' ? '' : v as SemesterStatus)}
        >
          <SelectTrigger className="w-36 font-sans bg-surface border-0 focus:ring-1 focus:ring-primary/30">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <span className="font-label text-xs text-muted-foreground uppercase tracking-wide">From</span>
          <Input
            type="date"
            value={startDateFrom}
            onChange={(e) => setStartDateFrom(e.target.value)}
            className="w-36 font-sans bg-surface border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="font-label text-xs text-muted-foreground uppercase tracking-wide">To</span>
          <Input
            type="date"
            value={startDateTo}
            onChange={(e) => setStartDateTo(e.target.value)}
            className="w-36 font-sans bg-surface border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
          />
        </div>

        {(search || statusFilter || startDateFrom || startDateTo) && (
          <Button
            variant="ghost"
            size="sm"
            className="font-label text-muted-foreground"
            onClick={() => {
              setSearch('')
              setStatusFilter('')
              setStartDateFrom('')
              setStartDateTo('')
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-surface-container-low rounded-lg overflow-hidden">
        {loading ? (
          <div className="py-16 text-center font-sans text-sm text-muted-foreground">
            Loading…
          </div>
        ) : semesters.length === 0 ? (
          <div className="py-16 text-center font-sans text-sm text-muted-foreground">
            No semesters found.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-surface-container">
                <th className="text-left px-4 py-3 font-label text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Code
                </th>
                <th className="text-left px-4 py-3 font-label text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Name
                </th>
                <th className="text-left px-4 py-3 font-label text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Start Date
                </th>
                <th className="text-left px-4 py-3 font-label text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  End Date
                </th>
                <th className="text-left px-4 py-3 font-label text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Status
                </th>
                <th className="text-right px-4 py-3 font-label text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {semesters.map((sem) => (
                <tr
                  key={sem.id}
                  className="border-t border-surface-container hover:bg-surface-container transition-colors"
                >
                  <td className="px-4 py-4 font-sans text-sm font-medium text-on-surface">
                    {sem.code}
                  </td>
                  <td className="px-4 py-4 font-sans text-sm text-on-surface">
                    {sem.name}
                  </td>
                  <td className="px-4 py-4 font-sans text-sm text-on-surface">
                    {toDateInput(sem.startDate)}
                  </td>
                  <td className="px-4 py-4 font-sans text-sm text-on-surface">
                    {toDateInput(sem.endDate)}
                  </td>
                  <td className="px-4 py-4">
                    <SemesterStatusBadge status={sem.status} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {/* Edit — INACTIVE only */}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={sem.status !== 'INACTIVE'}
                        onClick={() => openEdit(sem)}
                        className="font-label text-xs"
                        title={sem.status !== 'INACTIVE' ? 'Only inactive semesters can be edited' : 'Edit'}
                      >
                        Edit
                      </Button>

                      {/* Activate — INACTIVE only */}
                      {sem.status === 'INACTIVE' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleActivate(sem)}
                          className="font-label text-xs text-primary hover:text-primary"
                        >
                          Activate
                        </Button>
                      )}

                      {/* Deactivate — ACTIVE only */}
                      {sem.status === 'ACTIVE' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmAction({ type: 'deactivate', semester: sem })}
                          className="font-label text-xs"
                        >
                          Deactivate
                        </Button>
                      )}

                      {/* Close — ACTIVE only */}
                      {sem.status === 'ACTIVE' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmAction({ type: 'close', semester: sem })}
                          className="font-label text-xs text-tertiary hover:text-tertiary"
                        >
                          Close
                        </Button>
                      )}

                      {/* Delete — INACTIVE only */}
                      {sem.status === 'INACTIVE' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmAction({ type: 'delete', semester: sem })}
                          className="font-label text-xs text-destructive hover:text-destructive"
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit modal */}
      <SemesterFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={loadSemesters}
        semester={editSemester}
      />

      {/* Confirmation dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(v) => { if (!v) setConfirmAction(null) }}>
        <AlertDialogContent className="bg-surface" style={{ boxShadow: '0 0 32px 0 rgba(25,28,29,0.06)' }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-lg font-semibold text-on-surface">
              {confirmAction?.type === 'delete'
                ? 'Delete Semester?'
                : confirmAction?.type === 'close'
                ? 'Close Semester?'
                : 'Deactivate Semester?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="font-sans text-sm text-muted-foreground">
              {confirmAction
                ? confirmMessages[confirmAction.type](confirmAction.semester.name)
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={actionLoading}
              className="font-label"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading}
              onClick={handleConfirm}
              className={`font-label ${
                confirmAction?.type === 'delete' || confirmAction?.type === 'close'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              {actionLoading ? 'Processing…' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd frontend && git add src/features/semester/components/SemesterListPage.tsx && git commit -m "Add SemesterListPage with filters, table, and action dialogs"
```

---

## Task 7: Routing and Navigation

**Files:**
- Modify: `frontend/src/router/guards.tsx`
- Modify: `frontend/src/router/index.tsx`
- Modify: `frontend/src/layouts/AppLayout.tsx`

This task wires up the `/admin/semesters` route behind an `AdminRoute` guard and adds a sidebar nav link for admin users in `AppLayout`.

- [ ] **Step 1: Add `AdminRoute` to guards.tsx**

Replace the entire `frontend/src/router/guards.tsx` with:

```tsx
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
```

- [ ] **Step 2: Update router to add the admin semester route**

Replace the entire `frontend/src/router/index.tsx` with:

```tsx
// frontend/src/router/index.tsx
import { createBrowserRouter, Navigate } from 'react-router'
import { ProtectedRoute, PublicRoute, AdminRoute } from './guards'
import LoginPage from '../features/auth/components/LoginPage'
import AppLayout from '../layouts/AppLayout'
import SemesterListPage from '../features/semester/components/SemesterListPage'

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

> **Note:** The root `/` redirect to `/admin/semesters` is a placeholder — later when student/lecturer pages exist, `/` should render a role-aware dashboard. The `AdminRoute` guard already handles non-admin users gracefully (redirects to `/`).

- [ ] **Step 3: Update AppLayout to add admin sidebar nav**

Replace the entire `frontend/src/layouts/AppLayout.tsx` with:

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
        {/* Admin sidebar */}
        {isAdmin && (
          <aside className="w-56 bg-surface-container-highest shrink-0 px-3 py-6">
            <p className="font-label text-xs font-medium text-muted-foreground uppercase tracking-widest px-3 mb-3">
              Administration
            </p>
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
            </nav>
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 p-6 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/router/guards.tsx src/router/index.tsx src/layouts/AppLayout.tsx && git commit -m "Add AdminRoute guard, /admin/semesters route, admin sidebar nav"
```

---

## Manual Verification Checklist

Start both servers:

```bash
# Terminal 1
cd backend && pnpm run start:dev

# Terminal 2
cd frontend && pnpm run dev
```

Open `http://localhost:5173` and log in as an admin user.

**Navigation:**
- [ ] Admin sidebar is visible with "Semesters" link
- [ ] Clicking "Semesters" navigates to `/admin/semesters`
- [ ] Page title "Semesters" renders in Newsreader font

**Create:**
- [ ] "Create Semester" button opens modal
- [ ] Submitting empty form shows validation error
- [ ] endDate ≤ startDate shows validation error
- [ ] Valid form creates semester → success toast → list refreshes
- [ ] Duplicate code shows "Semester code already exists" inline error

**Edit:**
- [ ] Edit button on INACTIVE row opens modal pre-filled with existing values
- [ ] Edit button on ACTIVE/CLOSED row is disabled (grayed out)
- [ ] Saving edit updates list → success toast

**Status transitions:**
- [ ] Activate button appears on INACTIVE rows; clicking activates → success toast → badge turns Active
- [ ] Activating a second semester when one is already ACTIVE shows error toast with backend message
- [ ] Deactivate button appears on ACTIVE rows; clicking shows confirmation dialog → confirm → success toast
- [ ] Close button appears on ACTIVE rows; clicking shows red confirmation dialog → confirm → success toast
- [ ] CLOSED rows have no action buttons (except disabled Edit)

**Delete:**
- [ ] Delete button appears on INACTIVE rows; clicking shows confirmation dialog → confirm → success toast → row removed
- [ ] Delete on INACTIVE with linked data shows error toast with backend message

**Filters:**
- [ ] Search input filters by name or code (debounce is not implemented — filter fires on each keypress via useEffect dependency)
- [ ] Status dropdown filters list
- [ ] Date range filters list
- [ ] "Clear filters" button appears when any filter is set; clicking it resets all

**Status badges:**
- [ ] INACTIVE → grey pill
- [ ] ACTIVE → blue (primary) tinted pill
- [ ] CLOSED → teal (tertiary) tinted pill
