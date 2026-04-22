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
