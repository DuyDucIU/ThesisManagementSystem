import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Plus, SlidersHorizontal } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select'
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
import { useThesisStore } from '../store/thesisStore'
import { extractErrorMessage, thesisApi } from '../api'
import type { ThesisItem, ThesisStatus, CreateThesisDto } from '../api'
import { STATUS_VALUES, statusBadgeClass, formatDate } from '../utils'
import { topicApi } from '../../topic/api'
import { lecturerApi } from '../../lecturer/api'
import type { LecturerItem } from '../../lecturer/api'
import AssignStudentDialog from './AssignStudentDialog'
import ManageCapacityDialog from './ManageCapacityDialog'

// Backend QueryLecturerDto caps limit at 100 (class-validator @Max(100)).
const LECTURERS_LIMIT = 100

export default function AdminAssignmentsPage() {
  const {
    theses,
    loading,
    error,
    semesters,
    fetchTheses,
    assignStudent,
    unassignStudent,
    fetchSemesters,
  } = useThesisStore()

  const [semesterId, setSemesterId] = useState<number | null>(null)
  const [lecturerFilter, setLecturerFilter] = useState<'all' | number>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | ThesisStatus>('all')

  const [lecturers, setLecturers] = useState<LecturerItem[]>([])
  // topicId → lecturer full name, used to render the Lecturer column since the
  // thesis list response does not carry lecturer info.
  const [topicLecturer, setTopicLecturer] = useState<Record<number, string>>({})
  // Unfiltered topicId → assignment count for the assign dialog's "N assigned"
  // hint. Derived from an all-status/all-lecturer thesis fetch so the hint stays
  // correct regardless of the page's active filters.
  const [topicCounts, setTopicCounts] = useState<Record<number, number>>({})

  const [assignOpen, setAssignOpen] = useState(false)
  const [capacityOpen, setCapacityOpen] = useState(false)
  const [unassignTarget, setUnassignTarget] = useState<ThesisItem | null>(null)
  const [unassigning, setUnassigning] = useState(false)

  // Load semesters once and default to the active one (or the first).
  useEffect(() => {
    fetchSemesters()
  }, [fetchSemesters])

  useEffect(() => {
    if (semesterId !== null || semesters.length === 0) return
    const active = semesters.find((s) => s.status === 'ACTIVE')
    setSemesterId(active?.id ?? semesters[0].id)
  }, [semesters, semesterId])

  // Load every lecturer once for the filter dropdown and the assign flow.
  useEffect(() => {
    lecturerApi
      .list({ limit: LECTURERS_LIMIT })
      .then((res) => setLecturers(res.data.data))
      .catch((err) => toast.error(extractErrorMessage(err)))
  }, [])

  // Build the topicId → lecturer name map and the unfiltered topic counts for
  // the current semester. Both are independent of the page's status/lecturer
  // filters, so they key on semesterId alone.
  const loadSemesterMaps = useMemo(
    () => async (sid: number) => {
      try {
        const [topicsRes, allThesesRes] = await Promise.all([
          topicApi.list({ semesterId: sid }),
          thesisApi.list({ semesterId: sid }),
        ])
        const map: Record<number, string> = {}
        for (const t of topicsRes.data) map[t.id] = t.lecturer.fullName
        setTopicLecturer(map)

        const counts: Record<number, number> = {}
        for (const thesis of allThesesRes.data) {
          counts[thesis.topic.id] = (counts[thesis.topic.id] ?? 0) + 1
        }
        setTopicCounts(counts)
      } catch (err) {
        toast.error(extractErrorMessage(err))
      }
    },
    [],
  )

  useEffect(() => {
    if (semesterId === null) return
    void loadSemesterMaps(semesterId)
  }, [semesterId, loadSemesterMaps])

  // Re-fetch theses whenever the scope changes.
  useEffect(() => {
    if (semesterId === null) return
    void fetchTheses({
      semesterId,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      lecturerId: lecturerFilter !== 'all' ? lecturerFilter : undefined,
    })
  }, [semesterId, statusFilter, lecturerFilter, fetchTheses])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  const refresh = () => {
    if (semesterId === null) return
    void fetchTheses({
      semesterId,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      lecturerId: lecturerFilter !== 'all' ? lecturerFilter : undefined,
    })
    // Topic ownership and per-topic counts can shift after an assign/unassign.
    void loadSemesterMaps(semesterId)
  }

  const handleAssign = async (dto: CreateThesisDto) => {
    await assignStudent(dto)
    toast.success('Student assigned successfully.')
    refresh()
  }

  const handleUnassign = async () => {
    if (!unassignTarget) return
    setUnassigning(true)
    try {
      await unassignStudent(unassignTarget.id)
      toast.success('Student unassigned.')
      setUnassignTarget(null)
      refresh()
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setUnassigning(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-on-surface">
            Topic Assignments
          </h1>
          <p className="font-sans text-sm text-muted-foreground mt-1">
            View and manage thesis assignments across all lecturers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => setCapacityOpen(true)}
            disabled={semesterId === null}
            className="font-label text-on-surface hover:bg-surface-container"
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Manage Capacity
          </Button>
          <Button
            onClick={() => setAssignOpen(true)}
            disabled={semesterId === null}
            className="font-label bg-gradient-to-br from-primary to-primary-container text-primary-foreground"
          >
            <Plus className="w-4 h-4 mr-2" />
            Assign Student
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={semesterId !== null ? String(semesterId) : undefined}
          onValueChange={(v) => setSemesterId(Number(v))}
        >
          <SelectTrigger className="w-60 font-sans text-sm">
            <SelectValue placeholder="Semester" />
          </SelectTrigger>
          <SelectContent>
            {semesters.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.code} — {s.name}
                {s.status === 'ACTIVE' ? ' (active)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={lecturerFilter === 'all' ? 'all' : String(lecturerFilter)}
          onValueChange={(v) =>
            setLecturerFilter(v === 'all' ? 'all' : Number(v))
          }
        >
          <SelectTrigger className="w-60 font-sans text-sm">
            <SelectValue placeholder="Lecturer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All lecturers</SelectItem>
            {lecturers.map((l) => (
              <SelectItem key={l.id} value={String(l.id)}>
                {l.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as 'all' | ThesisStatus)}
        >
          <SelectTrigger className="w-48 font-sans text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_VALUES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, ' ')}
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
              <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground w-12">
                #
              </th>
              <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">
                Topic
              </th>
              <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">
                Lecturer
              </th>
              <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">
                Student
              </th>
              <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">
                Student ID
              </th>
              <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">
                Status
              </th>
              <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">
                Assigned
              </th>
              <th className="text-right px-4 py-3 font-label text-xs text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center font-sans text-sm text-muted-foreground"
                >
                  Loading…
                </td>
              </tr>
            )}
            {!loading && theses.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center font-sans text-sm text-muted-foreground"
                >
                  No assignments match these filters.
                </td>
              </tr>
            )}
            {!loading &&
              theses.map((t, idx) => {
                const canUnassign = t.status === 'IN_PROGRESS'
                return (
                  <tr
                    key={t.id}
                    className="hover:bg-surface-container transition-colors"
                  >
                    <td className="px-4 py-3 font-sans text-sm text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 font-sans text-sm font-medium text-on-surface">
                      {t.topic.title}
                    </td>
                    <td className="px-4 py-3 font-sans text-sm text-on-surface">
                      {topicLecturer[t.topic.id] ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-sans text-sm text-on-surface">
                      {t.student.fullName}
                    </td>
                    <td className="px-4 py-3 font-sans text-sm text-muted-foreground">
                      {t.student.studentId}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-label text-xs font-medium px-2 py-0.5 rounded-full ${statusBadgeClass[t.status]}`}
                      >
                        {t.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-sans text-sm text-muted-foreground">
                      {formatDate(t.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!canUnassign}
                        onClick={() => setUnassignTarget(t)}
                        className="font-label text-sm text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        Unassign
                      </Button>
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>

      {/* Assign dialog — admin mode (no lecturerId → all lecturers' topics) */}
      {semesterId !== null && (
        <AssignStudentDialog
          open={assignOpen}
          onOpenChange={setAssignOpen}
          semesterId={semesterId}
          topicCounts={topicCounts}
          onAssign={handleAssign}
        />
      )}

      {/* Manage capacity dialog */}
      {semesterId !== null && (
        <ManageCapacityDialog
          open={capacityOpen}
          onOpenChange={setCapacityOpen}
          semesterId={semesterId}
          onSaved={refresh}
        />
      )}

      {/* Unassign confirmation */}
      <AlertDialog
        open={!!unassignTarget}
        onOpenChange={(open) => !open && setUnassignTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Unassign student?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-sans">
              {unassignTarget?.student.fullName} will be removed from "
              {unassignTarget?.topic.title}". The enrollment returns to
              available. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unassigning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleUnassign()
              }}
              disabled={unassigning}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {unassigning ? 'Unassigning…' : 'Unassign'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
