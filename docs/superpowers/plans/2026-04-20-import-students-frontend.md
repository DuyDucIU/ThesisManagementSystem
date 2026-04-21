# Import Students — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/admin/students/import` page that lets an admin upload an Excel file, preview parse results, confirm, and view the import summary.

**Architecture:** A single page component managing three UI states (upload → parsed → imported) with local React state — no Zustand store needed. API calls live in `features/student/api.ts`. The page is wired into the existing router and admin sidebar.

**Tech Stack:** React 19, TypeScript 6, Tailwind v4, shadcn/ui (Button, AlertDialog), Sonner toasts, Axios instance from `lib/axios`.

---

## File Map

| Action | File |
|--------|------|
| Create | `frontend/src/features/student/api.ts` |
| Create | `frontend/src/features/student/components/StudentImportPage.tsx` |
| Modify | `frontend/src/router/index.tsx` |
| Modify | `frontend/src/layouts/AppLayout.tsx` |

---

### Task 1: Create the student API module

**Files:**
- Create: `frontend/src/features/student/api.ts`

- [ ] **Step 1: Create the file**

```typescript
// frontend/src/features/student/api.ts
import api from '../../lib/axios'

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

export function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const data = (err as { response: { data: { message: unknown } } }).response?.data
    if (Array.isArray(data?.message)) return data.message.join(', ')
    if (typeof data?.message === 'string') return data.message
  }
  return 'An unexpected error occurred.'
}

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
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors related to `api.ts`.

- [ ] **Step 3: Commit**

```bash
cd frontend
git add src/features/student/api.ts
git commit -m "Add student API module for import feature"
```

---

### Task 2: Create the StudentImportPage component

**Files:**
- Create: `frontend/src/features/student/components/StudentImportPage.tsx`

- [ ] **Step 1: Create the component**

```tsx
// frontend/src/features/student/components/StudentImportPage.tsx
import { useRef, useState } from 'react'
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
  studentApi,
  extractErrorMessage,
  type ParseImportResult,
  type ImportStudentsResult,
} from '../api'

type PageState = 'upload' | 'parsed' | 'imported'

export default function StudentImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pageState, setPageState] = useState<PageState>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [parseResult, setParseResult] = useState<ParseImportResult | null>(null)
  const [importResult, setImportResult] = useState<ImportStudentsResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null
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
      const res = await studentApi.parseImport(file)
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
      const res = await studentApi.importStudents(file)
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

  const skipCount = (parseResult?.invalid ?? 0) + (parseResult?.alreadyEnrolled ?? 0)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="font-display text-3xl font-semibold text-on-surface">Import Students</h1>
        <p className="font-sans text-sm font-medium text-muted-foreground mt-1">
          Upload a university Excel export to enroll students into the active semester.
        </p>
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
            className="w-full border-2 border-dashed border-surface-container-highest rounded-lg p-10 flex flex-col items-center gap-3 hover:bg-surface-container transition-colors cursor-pointer"
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
          {/* Summary bar */}
          <div className="bg-surface-container-low rounded-lg p-4 flex gap-8">
            <Stat label="Total" value={parseResult.total} />
            <Stat label="Valid" value={parseResult.valid} highlight="primary" />
            {parseResult.alreadyEnrolled > 0 && (
              <Stat label="Already Enrolled" value={parseResult.alreadyEnrolled} highlight="warning" />
            )}
            {parseResult.invalid > 0 && (
              <Stat label="Invalid" value={parseResult.invalid} highlight="destructive" />
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
                    <tr key={`${d.row}-${d.studentId}`} className="border-t border-surface-container">
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

          {/* All records invalid/enrolled */}
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
          {/* Summary bar */}
          <div className="bg-surface-container-low rounded-lg p-4 flex gap-8">
            <Stat label="Imported" value={importResult.imported} highlight="primary" />
            <Stat label="Skipped" value={importResult.skipped} />
          </div>

          {/* Skipped details table */}
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
                    <tr key={i} className="border-t border-surface-container">
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
            <AlertDialogCancel className="font-label">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void runImport()}
              className="font-label bg-gradient-to-br from-primary to-primary-container text-primary-foreground"
            >
              Import
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
      <p className="font-label text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`font-display text-2xl font-semibold ${valueClass}`}>{value}</p>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors related to `StudentImportPage.tsx`.

- [ ] **Step 3: Commit**

```bash
cd frontend
git add src/features/student/components/StudentImportPage.tsx
git commit -m "Add StudentImportPage component"
```

---

### Task 3: Wire up route and sidebar nav

**Files:**
- Modify: `frontend/src/router/index.tsx`
- Modify: `frontend/src/layouts/AppLayout.tsx`

- [ ] **Step 1: Add route to the router**

Replace the contents of `frontend/src/router/index.tsx` with:

```typescript
// frontend/src/router/index.tsx
import { createBrowserRouter, Navigate } from 'react-router'
import { ProtectedRoute, PublicRoute, AdminRoute } from './guards'
import LoginPage from '../features/auth/components/LoginPage'
import AppLayout from '../layouts/AppLayout'
import SemesterListPage from '../features/semester/components/SemesterListPage'
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

- [ ] **Step 2: Add sidebar nav link in AppLayout**

In `frontend/src/layouts/AppLayout.tsx`, add "Import Students" below the existing "Semesters" `NavLink` inside the `<nav>` block:

```tsx
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
```

The full `<nav>` block should look like:

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

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd frontend
git add src/router/index.tsx src/layouts/AppLayout.tsx
git commit -m "Wire /admin/students/import route and sidebar nav link"
```

---

### Task 4: E2E verification in the browser

**Files:** None

- [ ] **Step 1: Start both servers**

Terminal 1:
```bash
cd backend && pnpm run start:dev
```

Terminal 2:
```bash
cd frontend && pnpm run dev
```

- [ ] **Step 2: Verify sidebar nav link appears**

Open `http://localhost:5173`, log in as admin. Confirm "Import Students" appears in the left sidebar.

- [ ] **Step 3: Test State 1 — clicking Parse without a file**

Navigate to `/admin/students/import`. Click "Parse File" without selecting a file. Expected: inline error message *"Please select a file before parsing."*

- [ ] **Step 4: Test parse with a valid Excel file**

Prepare a `.xlsx` file with header row `Last Name | First Name | Username | StudentID` and a few data rows. Select it and click "Parse File". Expected:
- Page transitions to State 2
- Summary bar shows `Total | Valid | Already Enrolled | Invalid` counts
- No errors if all rows are valid

- [ ] **Step 5: Test parse with invalid rows**

Add a row with empty StudentID to the Excel file. Parse again. Expected:
- Error table shows the row number and reason *"Missing studentId"*
- `valid` count is reduced accordingly

- [ ] **Step 6: Test confirm with skip warning**

With invalid or already-enrolled rows present, click "Confirm Import". Expected: AlertDialog appears with skip count and valid count message. Clicking "Cancel" closes the dialog without importing.

- [ ] **Step 7: Test full import flow**

Click "Confirm Import" → confirm in the dialog. Expected:
- Page transitions to State 3
- Summary shows `Imported: N | Skipped: N`
- Skipped details table shows any skipped rows with reasons
- Toast success notification appears

- [ ] **Step 8: Test re-import (duplicate safety)**

Click "Import Another File" and re-upload the same file. Parse → all rows should appear as "Already Enrolled". Confirm import → `imported: 0`, all rows in `skippedDetails` with "Already enrolled in active semester".

- [ ] **Step 9: Test "Choose Different File"**

From State 2, click "Choose Different File". Expected: page resets to State 1, no parse results visible.
