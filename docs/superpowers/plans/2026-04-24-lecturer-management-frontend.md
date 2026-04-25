# Lecturer Management — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Lecturer Management UI — a `/admin/lecturers` page with a searchable, paginated table and Create/Edit/Delete actions. On successful create, show the initial password in a Sonner toast so the admin can communicate credentials.

**Architecture:** Mirrors the Student feature (`features/student/`) exactly. Same file structure, same Zustand + Axios pattern, same Dialog/AlertDialog component pattern. The only UI difference is the extra `title` and `maxStudents` fields in the forms, and a credential toast after create.

**Tech Stack:** React 19, TypeScript 6, Zustand 5, Axios, shadcn/ui (Dialog, AlertDialog, Button, Input, Label, Select), Sonner, Tailwind CSS v4, React Router 7

**Prerequisites:** Backend must be running on port 3000 with `GET /lecturers`, `POST /lecturers`, `PATCH /lecturers/:id`, `DELETE /lecturers/:id` endpoints verified working.

---

## File Map

| File | Action |
|------|--------|
| `frontend/src/features/lecturer/api.ts` | Create |
| `frontend/src/features/lecturer/store/lecturerStore.ts` | Create |
| `frontend/src/features/lecturer/components/LecturerCreateModal.tsx` | Create |
| `frontend/src/features/lecturer/components/LecturerEditModal.tsx` | Create |
| `frontend/src/features/lecturer/components/LecturerListPage.tsx` | Create |
| `frontend/src/router/index.tsx` | Modify — add `/admin/lecturers` route |
| `frontend/src/layouts/AppLayout.tsx` | Modify — add "Lecturers" sidebar nav item |

---

## Task 1: API types and calls

**Files:**
- Create: `frontend/src/features/lecturer/api.ts`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p frontend/src/features/lecturer/components
mkdir -p frontend/src/features/lecturer/store
```

- [ ] **Step 2: Write `api.ts`**

Write `frontend/src/features/lecturer/api.ts`:

```typescript
import api from '../../lib/axios'

export interface LecturerItem {
  id: number
  lecturerId: string
  fullName: string
  email: string
  title: string | null
  maxStudents: number
}

export interface LecturerQuery {
  search?: string
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
  lecturerId?: string
  fullName?: string
  email?: string
  title?: string
  maxStudents?: number
}

// ─── Error helper ──────────────────────────────────────────────────────────

export function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const data = (err as { response: { data: { message: unknown } } })
      .response?.data
    if (Array.isArray(data?.message)) return data.message.join(', ')
    if (typeof data?.message === 'string') return data.message
  }
  return 'An unexpected error occurred.'
}

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

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/lecturer
git commit -m "Add lecturer API types and calls"
```

---

## Task 2: Zustand store

**Files:**
- Create: `frontend/src/features/lecturer/store/lecturerStore.ts`

- [ ] **Step 1: Write the store**

Write `frontend/src/features/lecturer/store/lecturerStore.ts`:

```typescript
import { create } from 'zustand'
import { lecturerApi } from '../api'
import type { LecturerItem, LecturerQuery } from '../api'

interface LecturerState {
  lecturers: LecturerItem[]
  total: number
  page: number
  loading: boolean
  error: string | null
  fetchAll: (query?: LecturerQuery) => Promise<void>
}

export const useLecturerStore = create<LecturerState>((set) => ({
  lecturers: [],
  total: 0,
  page: 1,
  loading: false,
  error: null,

  fetchAll: async (query) => {
    set({ loading: true, error: null })
    try {
      const res = await lecturerApi.list(query)
      set({
        lecturers: res.data.data,
        total: res.data.total,
        page: res.data.page,
        loading: false,
      })
    } catch {
      set({ error: 'Failed to load lecturers.', loading: false })
    }
  },
}))
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/lecturer/store
git commit -m "Add lecturer Zustand store"
```

---

## Task 3: LecturerCreateModal

**Files:**
- Create: `frontend/src/features/lecturer/components/LecturerCreateModal.tsx`

- [ ] **Step 1: Write the component**

Write `frontend/src/features/lecturer/components/LecturerCreateModal.tsx`:

```typescript
import { useState } from 'react'
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
import { Label } from '../../../components/ui/label'
import { lecturerApi, extractErrorMessage } from '../api'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export default function LecturerCreateModal({ open, onClose, onCreated }: Props) {
  const [lecturerId, setLecturerId] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [title, setTitle] = useState('')
  const [maxStudents, setMaxStudents] = useState('5')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{
    lecturerId?: string
    email?: string
  }>({})

  function reset() {
    setLecturerId('')
    setFullName('')
    setEmail('')
    setTitle('')
    setMaxStudents('5')
    setFieldErrors({})
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setFieldErrors({})
    try {
      await lecturerApi.create({
        lecturerId,
        fullName,
        email,
        title: title || undefined,
        maxStudents: Number(maxStudents),
      })
      toast.success(`Lecturer created. Initial password: ${lecturerId}`, {
        duration: 8000,
      })
      reset()
      onCreated()
    } catch (err) {
      const msg = extractErrorMessage(err)
      const lower = msg.toLowerCase()
      if (lower.includes('lecturer id') || lower.includes('lecturer_id')) {
        setFieldErrors({ lecturerId: msg })
      } else if (lower.includes('email')) {
        setFieldErrors({ email: msg })
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent
        className="bg-surface max-w-md"
        style={{ boxShadow: '0 0 32px 0 rgba(25,28,29,0.06)' }}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-semibold text-on-surface">
            Add Lecturer
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Lecturer ID */}
          <div className="space-y-1.5">
            <Label htmlFor="create-lecturerId" className="font-label text-xs font-medium text-on-surface uppercase tracking-wide">
              Lecturer ID
            </Label>
            <Input
              id="create-lecturerId"
              value={lecturerId}
              onChange={(e) => {
                setLecturerId(e.target.value)
                setFieldErrors((prev) => ({ ...prev, lecturerId: undefined }))
              }}
              disabled={loading}
              required
              className="font-sans bg-surface-container-low border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
            {fieldErrors.lecturerId && (
              <p className="font-sans text-xs text-destructive">{fieldErrors.lecturerId}</p>
            )}
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="create-fullName" className="font-label text-xs font-medium text-on-surface uppercase tracking-wide">
              Full Name
            </Label>
            <Input
              id="create-fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
              required
              className="font-sans bg-surface-container-low border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="create-email" className="font-label text-xs font-medium text-on-surface uppercase tracking-wide">
              Email
            </Label>
            <Input
              id="create-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setFieldErrors((prev) => ({ ...prev, email: undefined }))
              }}
              disabled={loading}
              required
              className="font-sans bg-surface-container-low border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
            {fieldErrors.email && (
              <p className="font-sans text-xs text-destructive">{fieldErrors.email}</p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="create-title" className="font-label text-xs font-medium text-on-surface uppercase tracking-wide">
              Title <span className="normal-case text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="create-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              placeholder="e.g. Dr., Prof."
              className="font-sans bg-surface-container-low border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>

          {/* Max Students */}
          <div className="space-y-1.5">
            <Label htmlFor="create-maxStudents" className="font-label text-xs font-medium text-on-surface uppercase tracking-wide">
              Max Students
            </Label>
            <Input
              id="create-maxStudents"
              type="number"
              min={1}
              value={maxStudents}
              onChange={(e) => setMaxStudents(e.target.value)}
              disabled={loading}
              required
              className="font-sans bg-surface-container-low border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={loading}
              className="font-label"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="font-label bg-gradient-to-br from-primary to-primary-container text-primary-foreground"
            >
              {loading ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/lecturer/components/LecturerCreateModal.tsx
git commit -m "Add LecturerCreateModal"
```

---

## Task 4: LecturerEditModal

**Files:**
- Create: `frontend/src/features/lecturer/components/LecturerEditModal.tsx`

- [ ] **Step 1: Write the component**

Write `frontend/src/features/lecturer/components/LecturerEditModal.tsx`:

```typescript
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
import { Label } from '../../../components/ui/label'
import { lecturerApi, extractErrorMessage } from '../api'
import type { LecturerItem } from '../api'

interface Props {
  lecturer: LecturerItem | null
  onClose: () => void
  onSaved: () => void
}

export default function LecturerEditModal({ lecturer, onClose, onSaved }: Props) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [title, setTitle] = useState('')
  const [maxStudents, setMaxStudents] = useState('5')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string }>({})

  useEffect(() => {
    if (lecturer) {
      setFullName(lecturer.fullName)
      setEmail(lecturer.email)
      setTitle(lecturer.title ?? '')
      setMaxStudents(String(lecturer.maxStudents))
      setFieldErrors({})
    }
  }, [lecturer])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!lecturer) return
    setLoading(true)
    setFieldErrors({})
    try {
      await lecturerApi.update(lecturer.id, {
        fullName,
        email,
        title: title || undefined,
        maxStudents: Number(maxStudents),
      })
      toast.success('Lecturer updated.')
      onSaved()
    } catch (err) {
      const msg = extractErrorMessage(err)
      if (msg.toLowerCase().includes('email')) {
        setFieldErrors({ email: msg })
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={lecturer !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent
        className="bg-surface max-w-md"
        style={{ boxShadow: '0 0 32px 0 rgba(25,28,29,0.06)' }}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-semibold text-on-surface">
            Edit Lecturer
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Lecturer ID — read-only, backend does not allow renaming */}
          <div className="space-y-1.5">
            <p className="font-label text-xs font-medium text-on-surface uppercase tracking-wide">
              Lecturer ID
            </p>
            <p className="font-mono text-sm text-on-surface-variant px-3 py-2 rounded-md bg-surface-container-low">
              {lecturer?.lecturerId}
            </p>
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-fullName" className="font-label text-xs font-medium text-on-surface uppercase tracking-wide">
              Full Name
            </Label>
            <Input
              id="edit-fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
              className="font-sans bg-surface-container-low border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-email" className="font-label text-xs font-medium text-on-surface uppercase tracking-wide">
              Email
            </Label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setFieldErrors((prev) => ({ ...prev, email: undefined }))
              }}
              disabled={loading}
              className="font-sans bg-surface-container-low border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
            {fieldErrors.email && (
              <p className="font-sans text-xs text-destructive">{fieldErrors.email}</p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-title" className="font-label text-xs font-medium text-on-surface uppercase tracking-wide">
              Title <span className="normal-case text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              placeholder="e.g. Dr., Prof."
              className="font-sans bg-surface-container-low border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>

          {/* Max Students */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-maxStudents" className="font-label text-xs font-medium text-on-surface uppercase tracking-wide">
              Max Students
            </Label>
            <Input
              id="edit-maxStudents"
              type="number"
              min={1}
              value={maxStudents}
              onChange={(e) => setMaxStudents(e.target.value)}
              disabled={loading}
              className="font-sans bg-surface-container-low border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
              className="font-label"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="font-label bg-gradient-to-br from-primary to-primary-container text-primary-foreground"
            >
              {loading ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/lecturer/components/LecturerEditModal.tsx
git commit -m "Add LecturerEditModal"
```

---

## Task 5: LecturerListPage

**Files:**
- Create: `frontend/src/features/lecturer/components/LecturerListPage.tsx`

- [ ] **Step 1: Write the component**

Write `frontend/src/features/lecturer/components/LecturerListPage.tsx`:

```typescript
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
import { useLecturerStore } from '../store/lecturerStore'
import { lecturerApi, extractErrorMessage } from '../api'
import type { LecturerItem } from '../api'
import LecturerEditModal from './LecturerEditModal'
import LecturerCreateModal from './LecturerCreateModal'

const PAGE_LIMIT = 20

export default function LecturerListPage() {
  const { lecturers, total, page, loading, fetchAll } = useLecturerStore()

  const [search, setSearch] = useState('')
  const [editTarget, setEditTarget] = useState<LecturerItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LecturerItem | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

  const buildQuery = useCallback(
    (p: number) => ({
      search: search || undefined,
      page: p,
      limit: PAGE_LIMIT,
    }),
    [search],
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (isFirstRender.current) {
      isFirstRender.current = false
      void fetchAll(buildQuery(1))
      return
    }
    debounceRef.current = setTimeout(() => {
      void fetchAll(buildQuery(1))
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [fetchAll, buildQuery])

  function handlePageChange(newPage: number) {
    void fetchAll(buildQuery(newPage))
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await lecturerApi.remove(deleteTarget.id)
      toast.success(`Lecturer "${deleteTarget.fullName}" deleted.`)
      setDeleteTarget(null)
      void fetchAll(buildQuery(1))
    } catch (err) {
      const msg = extractErrorMessage(err)
      setDeleteTarget(null)
      toast.error(msg)
    } finally {
      setDeleteLoading(false)
    }
  }

  const totalPages = Math.ceil(total / PAGE_LIMIT)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-on-surface">Lecturers</h1>
          <p className="font-sans text-sm text-muted-foreground mt-0.5">
            {total} lecturer{total !== 1 ? 's' : ''} total
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="font-label bg-gradient-to-br from-primary to-primary-container text-primary-foreground"
        >
          Add Lecturer
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <Input
          placeholder="Search by name, ID, or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm font-sans bg-surface-container-low border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-outline-variant overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-container-highest">
            <tr>
              {['Lecturer ID', 'Full Name', 'Email', 'Title', 'Max Students', ''].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left font-label text-xs font-medium text-muted-foreground uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center font-sans text-sm text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && lecturers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center font-sans text-sm text-muted-foreground">
                  No lecturers found.
                </td>
              </tr>
            )}
            {!loading && lecturers.map((lecturer) => (
              <tr key={lecturer.id} className="bg-surface hover:bg-surface-container transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-on-surface">{lecturer.lecturerId}</td>
                <td className="px-4 py-3 font-sans text-on-surface">{lecturer.fullName}</td>
                <td className="px-4 py-3 font-sans text-on-surface-variant">{lecturer.email}</td>
                <td className="px-4 py-3 font-sans text-on-surface-variant">{lecturer.title ?? '—'}</td>
                <td className="px-4 py-3 font-sans text-on-surface-variant">{lecturer.maxStudents}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditTarget(lecturer)}
                      className="h-8 w-8 text-on-surface-variant hover:text-primary"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(lecturer)}
                      className="h-8 w-8 text-on-surface-variant hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-sans text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1 || loading}
              className="font-label"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages || loading}
              className="font-label"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <LecturerCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false)
          void fetchAll(buildQuery(1))
        }}
      />

      <LecturerEditModal
        lecturer={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => {
          setEditTarget(null)
          void fetchAll(buildQuery(page))
        }}
      />

      {/* Delete confirm */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent className="bg-surface">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-on-surface">Delete Lecturer</AlertDialogTitle>
            <AlertDialogDescription className="font-sans text-on-surface-variant">
              Delete <span className="font-medium text-on-surface">{deleteTarget?.fullName}</span>? This also removes their login account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-label" disabled={deleteLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
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

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/lecturer/components/LecturerListPage.tsx
git commit -m "Add LecturerListPage"
```

---

## Task 6: Register route and sidebar nav

**Files:**
- Modify: `frontend/src/router/index.tsx`
- Modify: `frontend/src/layouts/AppLayout.tsx`

- [ ] **Step 1: Add route to router**

Edit `frontend/src/router/index.tsx` — add the import and the route entry:

```typescript
import { createBrowserRouter, Navigate } from 'react-router'
import { ProtectedRoute, PublicRoute, AdminRoute } from './guards'
import LoginPage from '../features/auth/components/LoginPage'
import AppLayout from '../layouts/AppLayout'
import SemesterListPage from '../features/semester/components/SemesterListPage'
import StudentListPage from '../features/student/components/StudentListPage'
import LecturerListPage from '../features/lecturer/components/LecturerListPage'
import EnrollmentListPage from '../features/enrollment/components/EnrollmentListPage'
import EnrollmentImportPage from '../features/enrollment/components/EnrollmentImportPage'

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

- [ ] **Step 2: Add sidebar nav item**

Edit `frontend/src/layouts/AppLayout.tsx` — add the "Lecturers" `NavLink` between Students and Enrollments:

```typescript
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
              {[
                { to: '/admin/semesters', label: 'Semesters' },
                { to: '/admin/students', label: 'Students' },
                { to: '/admin/lecturers', label: 'Lecturers' },
                { to: '/admin/enrollments', label: 'Enrollments' },
                { to: '/admin/enrollments/import', label: 'Import Enrollments' },
              ].map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-md font-sans text-sm transition-colors ${
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-on-surface hover:bg-surface-container'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
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

- [ ] **Step 3: Start dev servers and verify in browser**

```bash
# Terminal 1
cd backend && pnpm run start:dev

# Terminal 2
cd frontend && pnpm run dev
```

Open `http://localhost:5173`, log in as admin, and verify:
- "Lecturers" appears in the sidebar
- `/admin/lecturers` loads with an empty table
- "Add Lecturer" opens the create modal
- Submitting the form creates a lecturer and shows the toast with the initial password
- Edit and Delete actions work correctly
- Search filters the table in real time (300ms debounce)
- Deleting a lecturer with topics shows an error toast, not a crash

- [ ] **Step 4: Commit**

```bash
git add frontend/src/router/index.tsx frontend/src/layouts/AppLayout.tsx
git commit -m "Register lecturer route and add sidebar nav item"
```
