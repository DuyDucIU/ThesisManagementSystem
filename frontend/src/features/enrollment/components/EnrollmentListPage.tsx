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
  const { enrollments, total, page, loading, currentSemester, error, fetchAll } =
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

  // Display error toast when fetch fails
  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  function handlePageChange(newPage: number) {
    void fetchAll(buildQuery(newPage))
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT))
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_LIMIT + 1
  const rangeEnd = Math.min(page * PAGE_LIMIT, total)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-on-surface">
            Enrollments
          </h1>
          <p className="font-sans text-sm font-medium text-muted-foreground mt-1">
            Per-semester student enrollment records.
          </p>
        </div>
        <Link to="/admin/enrollments/import">
          <Button className="font-label bg-gradient-to-br from-primary to-primary-container text-primary-foreground">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
        </Link>
      </div>

      {/* Current semester card */}
      {currentSemester && (
        <div className="bg-surface-container-low rounded-lg px-4 py-3 flex items-center gap-3 max-w-md">
          <span className="font-label text-xs font-medium text-muted-foreground uppercase tracking-wide shrink-0">
            Viewing
          </span>
          <span className="font-sans text-sm font-semibold text-on-surface">
            {currentSemester.code} — {currentSemester.name}
          </span>
        </div>
      )}

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
            <SelectItem value="active">Current semester</SelectItem>
            {semesters.filter((s) => s.status !== 'ACTIVE').map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.code} — {s.name} ({s.status})
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
