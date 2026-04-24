# Enrollment Module Split — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tách per-semester enrollment UI ra khỏi Student feature thành feature folder `enrollment/` riêng. Di chuyển trang Import, tạo trang Enrollment List mới (list filter theo semester với default active), trim Student list page về global-only.

**Architecture:** Feature folder mới `frontend/src/features/enrollment/` với `api.ts`, `store/`, `components/`. Routes `/admin/enrollments` và `/admin/enrollments/import`. Menu thêm 2 item "Enrollments" và "Import Enrollments". Student list page bỏ semester filter + status column.

**Tech Stack:** React 19, Vite, TypeScript, Zustand, React Router 7, Tailwind v4, shadcn/ui, sonner (toast), axios, lucide-react.

**Spec:** [docs/superpowers/specs/2026-04-22-enrollment-module-split-design.md](../specs/2026-04-22-enrollment-module-split-design.md)

**Prerequisite:** Backend plan must be fully implemented and verified before frontend implementation cycle begins. Endpoints `GET /enrollments`, `POST /enrollments/import` must exist and respond per spec §5.2.

---

## File Structure

### Files to create

- `frontend/src/features/enrollment/api.ts` — API client
- `frontend/src/features/enrollment/store/enrollmentStore.ts` — Zustand store
- `frontend/src/features/enrollment/components/EnrollmentListPage.tsx` — list view with filters
- `frontend/src/features/enrollment/components/EnrollmentImportPage.tsx` — import flow (moved + enhanced from student version)

### Files to modify

- `frontend/src/features/student/api.ts` — remove import types + methods + `semesterId` query + `semesterStudent` field
- `frontend/src/features/student/components/StudentListPage.tsx` — remove semester filter + status column
- `frontend/src/router/index.tsx` — swap import route, add enrollment routes
- `frontend/src/layouts/AppLayout.tsx` — update menu items

### Files to delete

- `frontend/src/features/student/components/StudentImportPage.tsx`

---

## Task 1: Create enrollment API client

**Files:**
- Create: `frontend/src/features/enrollment/api.ts`

- [ ] **Step 1: Create `frontend/src/features/enrollment/api.ts`**

```typescript
// frontend/src/features/enrollment/api.ts
import api from '../../lib/axios'

// ─── Shared ────────────────────────────────────────────────────────────────

export interface SemesterSummary {
  id: number
  code: string
  name: string
}

// ─── Import types ──────────────────────────────────────────────────────────

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
  semester: SemesterSummary
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

export interface ImportEnrollmentsResult {
  semester: SemesterSummary
  imported: number
  skipped: number
  skippedDetails: SkippedDetail[]
}

// ─── List types ────────────────────────────────────────────────────────────

export type EnrollmentStatus =
  | 'AVAILABLE'
  | 'ASSIGNED'
  | 'COMPLETED'
  | 'FAILED'

export interface EnrollmentStudent {
  id: number
  studentId: string
  fullName: string
  email: string
  hasAccount: boolean
}

export interface EnrollmentItem {
  enrollmentId: number
  status: EnrollmentStatus
  student: EnrollmentStudent
}

export interface EnrollmentQuery {
  semesterId?: number
  status?: EnrollmentStatus
  search?: string
  page?: number
  limit?: number
}

export interface PaginatedEnrollmentResult {
  data: EnrollmentItem[]
  total: number
  page: number
  limit: number
  semester: SemesterSummary
}

// ─── API methods ───────────────────────────────────────────────────────────

export const enrollmentApi = {
  list: (params?: EnrollmentQuery) =>
    api.get<PaginatedEnrollmentResult>('/enrollments', { params }),

  parseImport: (file: File, semesterId?: number) => {
    const form = new FormData()
    form.append('file', file)
    const qs = new URLSearchParams({ action: 'parse' })
    if (semesterId != null) qs.set('semesterId', String(semesterId))
    return api.post<ParseImportResult>(
      `/enrollments/import?${qs.toString()}`,
      form,
    )
  },

  importEnrollments: (file: File, semesterId?: number) => {
    const form = new FormData()
    form.append('file', file)
    const qs = new URLSearchParams({ action: 'import' })
    if (semesterId != null) qs.set('semesterId', String(semesterId))
    return api.post<ImportEnrollmentsResult>(
      `/enrollments/import?${qs.toString()}`,
      form,
    )
  },
}

// ─── Re-export helper for convenience ──────────────────────────────────────

export { extractErrorMessage } from '../student/api'
```

- [ ] **Step 2: Verify TypeScript compile**

Run from `frontend/`:
```bash
pnpm run build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/enrollment/api.ts
git commit -m "Add enrollment feature API client"
```

---

## Task 2: Create enrollment store

**Files:**
- Create: `frontend/src/features/enrollment/store/enrollmentStore.ts`

- [ ] **Step 1: Create store**

```typescript
// frontend/src/features/enrollment/store/enrollmentStore.ts
import { create } from 'zustand'
import { enrollmentApi } from '../api'
import type {
  EnrollmentItem,
  EnrollmentQuery,
  SemesterSummary,
} from '../api'

interface EnrollmentState {
  enrollments: EnrollmentItem[]
  total: number
  page: number
  currentSemester: SemesterSummary | null
  loading: boolean
  error: string | null
  fetchAll: (query?: EnrollmentQuery) => Promise<void>
}

export const useEnrollmentStore = create<EnrollmentState>((set) => ({
  enrollments: [],
  total: 0,
  page: 1,
  currentSemester: null,
  loading: false,
  error: null,

  fetchAll: async (query) => {
    set({ loading: true, error: null })
    try {
      const res = await enrollmentApi.list(query)
      set({
        enrollments: res.data.data,
        total: res.data.total,
        page: res.data.page,
        currentSemester: res.data.semester,
        loading: false,
      })
    } catch {
      set({ error: 'Failed to load enrollments.', loading: false })
    }
  },
}))
```

- [ ] **Step 2: Verify compile**

```bash
pnpm run build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/enrollment/store/
git commit -m "Add enrollment Zustand store"
```

---

## Task 3: Create EnrollmentListPage

**Files:**
- Create: `frontend/src/features/enrollment/components/EnrollmentListPage.tsx`

- [ ] **Step 1: Create component**

```typescript
// frontend/src/features/enrollment/components/EnrollmentListPage.tsx
import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Upload } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select'
import { useEnrollmentStore } from '../store/enrollmentStore'
import type { EnrollmentStatus } from '../api'
import { semesterApi } from '../../semester/api'
import type { Semester } from '../../semester/api'

const PAGE_LIMIT = 20

export default function EnrollmentListPage() {
  const { enrollments, total, page, loading, currentSemester, fetchAll } =
    useEnrollmentStore()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | EnrollmentStatus>('all')
  const [semesterIdFilter, setSemesterIdFilter] = useState<string>('active')
  const [semesters, setSemesters] = useState<Semester[]>([])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

  const buildQuery = useCallback(
    (p: number) => ({
      semesterId:
        semesterIdFilter !== 'active'
          ? Number(semesterIdFilter)
          : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      search: search || undefined,
      page: p,
      limit: PAGE_LIMIT,
    }),
    [search, statusFilter, semesterIdFilter],
  )

  // Load semesters for dropdown once
  useEffect(() => {
    semesterApi
      .list()
      .then((res) => setSemesters(res.data))
      .catch(() => toast.error('Failed to load semesters.'))
  }, [])

  // Debounced re-fetch when filters change
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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT))
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_LIMIT + 1
  const rangeEnd = Math.min(page * PAGE_LIMIT, total)

  const activeSemesterId = semesters.find((s) => s.status === 'ACTIVE')?.id

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-on-surface">
            Enrollments
          </h1>
          <p className="font-sans text-sm font-medium text-muted-foreground mt-1">
            {currentSemester
              ? `Viewing: ${currentSemester.code} — ${currentSemester.name}`
              : 'Per-semester student enrollment records.'}
          </p>
        </div>
        <Link to="/admin/enrollments/import">
          <Button className="font-label bg-gradient-to-br from-primary to-primary-container text-primary-foreground">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by name, student ID, or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="font-sans text-sm max-w-xs"
        />

        <Select value={semesterIdFilter} onValueChange={setSemesterIdFilter}>
          <SelectTrigger className="w-60 font-sans text-sm">
            <SelectValue placeholder="Semester" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active semester (default)</SelectItem>
            {semesters.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.code} — {s.name}
                {s.id === activeSemesterId ? ' (active)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as 'all' | EnrollmentStatus)}
        >
          <SelectTrigger className="w-44 font-sans text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="AVAILABLE">Available</SelectItem>
            <SelectItem value="ASSIGNED">Assigned</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
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
              <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center font-sans text-sm text-muted-foreground"
                >
                  Loading…
                </td>
              </tr>
            )}
            {!loading && enrollments.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center font-sans text-sm text-muted-foreground"
                >
                  No enrollments found.
                </td>
              </tr>
            )}
            {!loading &&
              enrollments.map((e) => (
                <tr
                  key={e.enrollmentId}
                  className="border-t border-surface-container hover:bg-surface-container transition-colors"
                >
                  <td className="px-4 py-3 font-sans text-sm font-medium text-on-surface">
                    {e.student.studentId}
                  </td>
                  <td className="px-4 py-3 font-sans text-sm text-on-surface">
                    {e.student.fullName}
                  </td>
                  <td className="px-4 py-3 font-sans text-sm text-muted-foreground">
                    {e.student.email}
                  </td>
                  <td className="px-4 py-3">
                    {e.student.hasAccount ? (
                      <span className="font-label text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        Active
                      </span>
                    ) : (
                      <span className="font-sans text-sm text-muted-foreground">
                        —
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-sans text-sm text-muted-foreground">
                    {e.status}
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
    </div>
  )
}
```

- [ ] **Step 2: Verify compile**

```bash
pnpm run build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/enrollment/components/EnrollmentListPage.tsx
git commit -m "Add EnrollmentListPage with semester + status + search filters"
```

---

## Task 4: Create EnrollmentImportPage

**Files:**
- Create: `frontend/src/features/enrollment/components/EnrollmentImportPage.tsx`

- [ ] **Step 1: Create component (adapted from StudentImportPage, adds semester dropdown)**

```typescript
// frontend/src/features/enrollment/components/EnrollmentImportPage.tsx
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Upload } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select'
import {
  enrollmentApi,
  extractErrorMessage,
  type ParseImportResult,
  type ImportEnrollmentsResult,
} from '../api'
import { semesterApi } from '../../semester/api'
import type { Semester } from '../../semester/api'

type PageState = 'upload' | 'parsed' | 'imported'

export default function EnrollmentImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pageState, setPageState] = useState<PageState>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [parseResult, setParseResult] = useState<ParseImportResult | null>(null)
  const [importResult, setImportResult] = useState<ImportEnrollmentsResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const [semesters, setSemesters] = useState<Semester[]>([])
  const [semesterIdSelect, setSemesterIdSelect] = useState<string>('active')

  useEffect(() => {
    semesterApi
      .list()
      .then((res) => setSemesters(res.data))
      .catch(() => toast.error('Failed to load semesters.'))
  }, [])

  const activeSemester = semesters.find((s) => s.status === 'ACTIVE')
  const selectableSemesters = semesters.filter((s) => s.status !== 'CLOSED')
  const chosenSemesterId =
    semesterIdSelect !== 'active' ? Number(semesterIdSelect) : undefined

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null
    if (selected && selected.size > 5 * 1024 * 1024) {
      setFileError('File exceeds the 5 MB limit. Please reduce the file size.')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    setFile(selected)
    setFileError(null)
    setParseResult(null)
    setPageState('upload')
  }

  async function handleParse() {
    if (!file) {
      setFileError('Please select a file before parsing.')
      return
    }
    setLoading(true)
    try {
      const res = await enrollmentApi.parseImport(file, chosenSemesterId)
      setParseResult(res.data)
      setPageState('parsed')
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  function handleChooseDifferent() {
    setFile(null)
    setParseResult(null)
    setFileError(null)
    setPageState('upload')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleConfirmClick() {
    if (!parseResult) return
    if (parseResult.invalid > 0 || parseResult.alreadyEnrolled > 0) {
      setConfirmOpen(true)
    } else {
      void runImport()
    }
  }

  async function runImport() {
    if (!file) return
    setConfirmOpen(false)
    setLoading(true)
    try {
      const res = await enrollmentApi.importEnrollments(file, chosenSemesterId)
      setImportResult(res.data)
      setPageState('imported')
      toast.success(`Import complete — ${res.data.imported} student(s) enrolled.`)
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  function handleImportAnother() {
    setFile(null)
    setParseResult(null)
    setImportResult(null)
    setFileError(null)
    setPageState('upload')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const skipCount =
    (parseResult?.invalid ?? 0) + (parseResult?.alreadyEnrolled ?? 0)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="font-display text-3xl font-semibold text-on-surface">
          Import Enrollments
        </h1>
        <p className="font-sans text-sm font-medium text-muted-foreground mt-1">
          Upload a university Excel export to enroll students into a semester.
        </p>
      </div>

      {/* Semester selector (always visible) */}
      <div className="bg-surface-container-low rounded-lg p-4 max-w-xl">
        <label className="font-label text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
          Target Semester
        </label>
        <Select
          value={semesterIdSelect}
          onValueChange={setSemesterIdSelect}
          disabled={pageState !== 'upload' || loading}
        >
          <SelectTrigger className="font-sans text-sm">
            <SelectValue placeholder="Select semester" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">
              {activeSemester
                ? `${activeSemester.code} — ${activeSemester.name} (active, default)`
                : 'Active semester (none available)'}
            </SelectItem>
            {selectableSemesters.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.code} — {s.name}
                {s.id === activeSemester?.id ? ' (active)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* State 1 — Upload */}
      {pageState === 'upload' && (
        <div className="bg-surface-container-low rounded-lg p-8 space-y-4 max-w-xl">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="w-full border-2 border-dashed border-surface-container-highest rounded-lg p-10 flex flex-col items-center gap-3 hover:bg-surface-container transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload className="w-8 h-8 text-muted-foreground" />
            <div className="text-center">
              <p className="font-sans text-sm font-medium text-on-surface">
                {file ? file.name : 'Click to select a file'}
              </p>
              <p className="font-sans text-xs text-muted-foreground mt-1">
                .xlsx or .xls files only
              </p>
            </div>
          </button>

          {fileError && (
            <p className="font-sans text-sm text-destructive">{fileError}</p>
          )}

          <Button
            onClick={handleParse}
            disabled={loading}
            className="font-label bg-gradient-to-br from-primary to-primary-container text-primary-foreground"
          >
            {loading ? 'Parsing…' : 'Parse File'}
          </Button>
        </div>
      )}

      {/* State 2 — Parse Results */}
      {pageState === 'parsed' && parseResult && (
        <div className="space-y-4 max-w-2xl">
          {/* Target banner */}
          <p className="font-sans text-sm text-muted-foreground">
            Importing into: <strong className="text-on-surface">
              {parseResult.semester.code} — {parseResult.semester.name}
            </strong>
          </p>

          {/* Summary bar */}
          <div className="bg-surface-container-low rounded-lg p-4 flex gap-8">
            <Stat label="Total" value={parseResult.total} />
            <Stat label="Valid" value={parseResult.valid} highlight="primary" />
            {parseResult.alreadyEnrolled > 0 && (
              <Stat
                label="Already Enrolled"
                value={parseResult.alreadyEnrolled}
                highlight="warning"
              />
            )}
            {parseResult.invalid > 0 && (
              <Stat
                label="Invalid"
                value={parseResult.invalid}
                highlight="destructive"
              />
            )}
          </div>

          {/* Already enrolled table */}
          {parseResult.alreadyEnrolledDetails.length > 0 && (
            <div className="bg-surface-container-low rounded-lg overflow-hidden">
              <p className="px-4 py-3 font-label text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-surface-container">
                Already Enrolled — will be skipped
              </p>
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-container">
                    <th className="text-left px-4 py-2 font-label text-xs text-muted-foreground">Row</th>
                    <th className="text-left px-4 py-2 font-label text-xs text-muted-foreground">Student ID</th>
                    <th className="text-left px-4 py-2 font-label text-xs text-muted-foreground">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {parseResult.alreadyEnrolledDetails.map((d) => (
                    <tr
                      key={`${d.row}-${d.studentId}`}
                      className="border-t border-surface-container"
                    >
                      <td className="px-4 py-3 font-sans text-sm text-muted-foreground">{d.row}</td>
                      <td className="px-4 py-3 font-sans text-sm font-medium text-on-surface">{d.studentId}</td>
                      <td className="px-4 py-3 font-sans text-sm text-muted-foreground">{d.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Invalid rows table */}
          {parseResult.errors.length > 0 && (
            <div className="bg-surface-container-low rounded-lg overflow-hidden">
              <p className="px-4 py-3 font-label text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-surface-container">
                Invalid Rows — will be skipped
              </p>
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-container">
                    <th className="text-left px-4 py-2 font-label text-xs text-muted-foreground">Row</th>
                    <th className="text-left px-4 py-2 font-label text-xs text-muted-foreground">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {parseResult.errors.map((e) => (
                    <tr key={e.row} className="border-t border-surface-container">
                      <td className="px-4 py-3 font-sans text-sm text-muted-foreground">{e.row}</td>
                      <td className="px-4 py-3 font-sans text-sm text-destructive">{e.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {parseResult.valid === 0 && (
            <p className="font-sans text-sm text-muted-foreground bg-surface-container-low rounded-lg px-4 py-3">
              All records are invalid or already enrolled. Please fix the file and re-upload.
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={handleChooseDifferent}
              disabled={loading}
              className="font-label"
            >
              Choose Different File
            </Button>
            {parseResult.valid > 0 && (
              <Button
                onClick={handleConfirmClick}
                disabled={loading}
                className="font-label bg-gradient-to-br from-primary to-primary-container text-primary-foreground"
              >
                {loading ? 'Importing…' : 'Confirm Import'}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* State 3 — Import Results */}
      {pageState === 'imported' && importResult && (
        <div className="space-y-4 max-w-2xl">
          <p className="font-sans text-sm text-muted-foreground">
            Imported into: <strong className="text-on-surface">
              {importResult.semester.code} — {importResult.semester.name}
            </strong>
          </p>

          <div className="bg-surface-container-low rounded-lg p-4 flex gap-8">
            <Stat label="Imported" value={importResult.imported} highlight="primary" />
            <Stat label="Skipped" value={importResult.skipped} />
          </div>

          {importResult.skippedDetails.length > 0 && (
            <div className="bg-surface-container-low rounded-lg overflow-hidden">
              <p className="px-4 py-3 font-label text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-surface-container">
                Skipped Records
              </p>
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-container">
                    <th className="text-left px-4 py-2 font-label text-xs text-muted-foreground">Row</th>
                    <th className="text-left px-4 py-2 font-label text-xs text-muted-foreground">Student ID</th>
                    <th className="text-left px-4 py-2 font-label text-xs text-muted-foreground">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {importResult.skippedDetails.map((d, i) => (
                    <tr
                      key={`${d.row}-${d.studentId ?? i}`}
                      className="border-t border-surface-container"
                    >
                      <td className="px-4 py-3 font-sans text-sm text-muted-foreground">{d.row}</td>
                      <td className="px-4 py-3 font-sans text-sm font-medium text-on-surface">{d.studentId ?? '—'}</td>
                      <td className="px-4 py-3 font-sans text-sm text-muted-foreground">{d.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Button
            onClick={handleImportAnother}
            className="font-label bg-gradient-to-br from-primary to-primary-container text-primary-foreground"
          >
            Import Another File
          </Button>
        </div>
      )}

      {/* Confirmation alert dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent
          className="bg-surface"
          style={{ boxShadow: '0 0 32px 0 rgba(25,28,29,0.06)' }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-lg font-semibold text-on-surface">
              Confirm Import
            </AlertDialogTitle>
            <AlertDialogDescription className="font-sans text-sm text-muted-foreground">
              {`${skipCount} record(s) will be skipped (${parseResult?.invalid ?? 0} invalid, ${parseResult?.alreadyEnrolled ?? 0} already enrolled). Only ${parseResult?.valid ?? 0} valid record(s) will be imported. Continue?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading} className="font-label">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={loading}
              onClick={() => void runImport()}
              className="font-label bg-gradient-to-br from-primary to-primary-container text-primary-foreground"
            >
              {loading ? 'Importing…' : 'Import'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string
  value: number
  highlight?: 'primary' | 'destructive' | 'warning'
}) {
  const valueClass =
    highlight === 'primary'
      ? 'text-primary'
      : highlight === 'destructive'
        ? 'text-destructive'
        : highlight === 'warning'
          ? 'text-amber-600'
          : 'text-on-surface'

  return (
    <div>
      <p className="font-label text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <p className={`font-display text-2xl font-semibold ${valueClass}`}>
        {value}
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Verify compile**

```bash
pnpm run build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/enrollment/components/EnrollmentImportPage.tsx
git commit -m "Add EnrollmentImportPage with target semester selector"
```

---

## Task 5: Register routes and update menu

**Files:**
- Modify: `frontend/src/router/index.tsx`
- Modify: `frontend/src/layouts/AppLayout.tsx`

- [ ] **Step 1: Update `frontend/src/router/index.tsx`**

Replace imports at top:
```typescript
import StudentListPage from '../features/student/components/StudentListPage'
import EnrollmentListPage from '../features/enrollment/components/EnrollmentListPage'
import EnrollmentImportPage from '../features/enrollment/components/EnrollmentImportPage'
```

(Remove the `StudentImportPage` import.)

Replace admin routes:
```typescript
{
  element: <AdminRoute />,
  children: [
    { path: '/admin/semesters', element: <SemesterListPage /> },
    { path: '/admin/students', element: <StudentListPage /> },
    { path: '/admin/enrollments', element: <EnrollmentListPage /> },
    { path: '/admin/enrollments/import', element: <EnrollmentImportPage /> },
  ],
},
```

- [ ] **Step 2: Update `frontend/src/layouts/AppLayout.tsx` menu**

In the `<nav>` block (around lines 58-97), replace the "Import Students" NavLink with two new items. Final nav block:

```tsx
<nav className="space-y-0.5">
  <NavLink
    to="/admin/semesters"
    end
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
    to="/admin/enrollments"
    end
    className={({ isActive }) =>
      `block px-3 py-2 rounded-md font-sans text-sm transition-colors ${
        isActive
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-on-surface hover:bg-surface-container'
      }`
    }
  >
    Enrollments
  </NavLink>
  <NavLink
    to="/admin/enrollments/import"
    className={({ isActive }) =>
      `block px-3 py-2 rounded-md font-sans text-sm transition-colors ${
        isActive
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-on-surface hover:bg-surface-container'
      }`
    }
  >
    Import Enrollments
  </NavLink>
</nav>
```

- [ ] **Step 3: Verify compile**

```bash
pnpm run build
```

Expected: No errors.

- [ ] **Step 4: Smoke test in browser**

Run dev server:
```bash
pnpm run dev
```

Login as admin, navigate to:
- `http://localhost:5173/admin/enrollments` — should load list of active semester enrollments (assuming backend has data)
- `http://localhost:5173/admin/enrollments/import` — should show semester selector + upload area

Kill dev server.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/router/index.tsx frontend/src/layouts/AppLayout.tsx
git commit -m "Wire enrollment routes and menu items, remove old student import route"
```

---

## Task 6: Trim Student API and store

**Files:**
- Modify: `frontend/src/features/student/api.ts`
- Modify: `frontend/src/features/student/store/studentStore.ts` (no content change expected — verify)

- [ ] **Step 1: Strip `frontend/src/features/student/api.ts`**

Replace file content with:

```typescript
// frontend/src/features/student/api.ts
import api from '../../lib/axios'

export interface StudentItem {
  id: number
  studentId: string
  fullName: string
  email: string
  hasAccount: boolean
}

export interface StudentQuery {
  search?: string
  hasAccount?: boolean
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

Removed: `SemesterStudentStatus` type, `semesterStudent` field on `StudentItem`, `semesterId` on `StudentQuery`, `ParseRowError`, `AlreadyEnrolledDetail`, `ParseImportResult`, `SkippedDetail`, `ImportStudentsResult`, `parseImport` method, `importStudents` method.

- [ ] **Step 2: Verify `studentStore.ts` still compiles**

The store uses `StudentItem` and `StudentQuery` but not removed fields. Should compile unchanged. If the build reports errors, remove references to deleted types.

- [ ] **Step 3: Verify compile**

```bash
pnpm run build
```

Expected: At this point, `StudentListPage` and `StudentImportPage` (still existing) may error because they reference removed types. That is expected — Task 7 and Task 8 fix them.

If the build fails here on other files, stop and investigate.

- [ ] **Step 4: Do NOT commit yet** — wait for Task 7 and 8 to finish the cleanup.

---

## Task 7: Trim StudentListPage

**Files:**
- Modify: `frontend/src/features/student/components/StudentListPage.tsx`

- [ ] **Step 1: Replace file content with simplified version**

```typescript
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
import StudentEditModal from './StudentEditModal'
import StudentCreateModal from './StudentCreateModal'

const PAGE_LIMIT = 20

export default function StudentListPage() {
  const { students, total, page, loading, fetchAll } = useStudentStore()

  const [search, setSearch] = useState('')
  const [hasAccountFilter, setHasAccountFilter] = useState<
    'all' | 'true' | 'false'
  >('all')

  const [editTarget, setEditTarget] = useState<StudentItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StudentItem | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

  const buildQuery = useCallback(
    (p: number) => ({
      search: search || undefined,
      hasAccount:
        hasAccountFilter === 'true'
          ? true
          : hasAccountFilter === 'false'
            ? false
            : undefined,
      page: p,
      limit: PAGE_LIMIT,
    }),
    [search, hasAccountFilter],
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
      await studentApi.remove(deleteTarget.id)
      toast.success(`"${deleteTarget.fullName}" deleted.`)
      setDeleteTarget(null)
      const nextPage = Math.max(
        1,
        Math.min(page, Math.ceil((total - 1) / PAGE_LIMIT)),
      )
      void fetchAll(buildQuery(nextPage))
    } catch (err) {
      toast.error(extractErrorMessage(err))
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-on-surface">
            Students
          </h1>
          <p className="font-sans text-sm font-medium text-muted-foreground mt-1">
            Global student directory.
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="font-label bg-gradient-to-br from-primary to-primary-container text-primary-foreground"
        >
          + Create Student
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by name, student ID, or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="font-sans text-sm max-w-xs"
        />

        <Select
          value={hasAccountFilter}
          onValueChange={(v) =>
            setHasAccountFilter(v as 'all' | 'true' | 'false')
          }
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
      </div>

      <div className="bg-surface-container-low rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-container">
              <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">Student ID</th>
              <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">Full Name</th>
              <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">Email</th>
              <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">Account</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center font-sans text-sm text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && students.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center font-sans text-sm text-muted-foreground">
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
                  <td className="px-4 py-3 font-sans text-sm font-medium text-on-surface">{s.studentId}</td>
                  <td className="px-4 py-3 font-sans text-sm text-on-surface">{s.fullName}</td>
                  <td className="px-4 py-3 font-sans text-sm text-muted-foreground">{s.email}</td>
                  <td className="px-4 py-3">
                    {s.hasAccount ? (
                      <span className="font-label text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        Active
                      </span>
                    ) : (
                      <span className="font-sans text-sm text-muted-foreground">—</span>
                    )}
                  </td>
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

      <StudentEditModal
        student={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => {
          setEditTarget(null)
          void fetchAll(buildQuery(page))
        }}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
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

      <StudentCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false)
          void fetchAll(buildQuery(1))
        }}
      />
    </div>
  )
}
```

Removed: `semesterIdFilter` state, `semesters` state + fetch, semester dropdown, conditional status column, `semesterApi` import, `Semester` type import.

- [ ] **Step 2: Verify compile**

```bash
pnpm run build
```

Expected: `StudentImportPage.tsx` will still error (referencing removed API). That is expected — Task 8 deletes it.

---

## Task 8: Delete StudentImportPage

**Files:**
- Delete: `frontend/src/features/student/components/StudentImportPage.tsx`

- [ ] **Step 1: Delete the file**

```bash
rm frontend/src/features/student/components/StudentImportPage.tsx
```

- [ ] **Step 2: Verify compile**

```bash
pnpm run build
```

Expected: No errors. Router no longer imports this file (was removed in Task 5).

- [ ] **Step 3: Run lint**

```bash
pnpm run lint
```

Expected: No errors.

- [ ] **Step 4: Commit everything from Tasks 6, 7, 8 together**

```bash
git add frontend/src/features/student/
git commit -m "Trim Student feature: remove import page, semester filter, status column"
```

---

## Task 9: E2E browser verification

**Files:** None

- [ ] **Step 1: Start backend**

```bash
cd backend && pnpm run start:dev
```

- [ ] **Step 2: Start frontend**

In another terminal:
```bash
cd frontend && pnpm run dev
```

- [ ] **Step 3: Login as admin and verify Student page**

Navigate to `http://localhost:5173/admin/students`.

Verify:
- Header says "Students" with subtitle "Global student directory."
- Only 2 filters visible: search input + account dropdown. NO semester dropdown.
- Table has 4 data columns + actions: Student ID | Full Name | Email | Account | (actions). NO Status column.
- Create button works, creates student without touching enrollment.
- Edit modal works.
- Delete works (on a student with no thesis).

- [ ] **Step 4: Verify Enrollment list**

Navigate to `http://localhost:5173/admin/enrollments`.

Verify:
- Header shows "Enrollments" with subtitle like "Viewing: <code> — <name>" reflecting active semester.
- 3 filters: search, semester dropdown (first option "Active semester (default)"), status dropdown.
- Table: Student ID | Full Name | Email | Account | Status.
- Import button navigates to `/admin/enrollments/import`.
- Switching semester in dropdown re-fetches with the selected semesterId.
- Status filter works.
- Search filter works.
- Pagination works.

- [ ] **Step 5: Verify Enrollment import**

Navigate to `http://localhost:5173/admin/enrollments/import`.

Verify:
- Target Semester card shows at top. First option labeled "<code> — <name> (active, default)".
- Changing to an INACTIVE semester then parsing → preview shows "Importing into: <that semester>".
- Attempting to select a CLOSED semester: **it should not appear in the dropdown** (CLOSED excluded).
- Upload a valid xlsx → parse works → confirm import → success toast, result page shows "Imported into: <semester>".
- Navigate back to `/admin/enrollments` with that semester selected → new records visible.

- [ ] **Step 6: Kill both servers**

- [ ] **Step 7: Commit (verification only — no changes)**

No commit needed. This task is verification.

## Self-Review Notes

Completed against spec [docs/superpowers/specs/2026-04-22-enrollment-module-split-design.md](../specs/2026-04-22-enrollment-module-split-design.md):

- §4.3 Frontend module layout — Tasks 1, 2, 3, 4 create the folder structure
- §4.4 Routes — Task 5 registers the new routes
- §5.2 GET /enrollments — `enrollmentApi.list` in Task 1 matches shape
- §5.2 POST /enrollments/import — `parseImport` and `importEnrollments` in Task 1
- §8.3 EnrollmentListPage — Task 3 matches layout description
- §8.4 EnrollmentImportPage — Task 4 adds semester dropdown, excludes CLOSED
- §8.5 StudentListPage trim — Task 7 removes semester filter and status column
- §8.6 Routes — Task 5 matches
- §11.3 Frontend E2E — Task 9 covers all 7 manual test scenarios
