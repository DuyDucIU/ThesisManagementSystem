import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Plus, Users } from 'lucide-react'
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
import { useAuthStore } from '../../auth/store/authStore'
import { extractErrorMessage, thesisApi } from '../api'
import type { ThesisItem, ThesisStatus, CreateThesisDto } from '../api'
import AssignStudentDialog from './AssignStudentDialog'

const STATUS_VALUES: ThesisStatus[] = [
  'IN_PROGRESS',
  'SUBMITTED',
  'APPROVED',
  'UNDER_REVIEW',
  'REVIEWED',
]

const statusBadgeClass: Record<ThesisStatus, string> = {
  IN_PROGRESS: 'bg-primary/10 text-primary',
  SUBMITTED: 'bg-tertiary/10 text-tertiary',
  UNDER_REVIEW: 'bg-tertiary/10 text-tertiary',
  REVIEWED: 'bg-surface-container-high text-on-surface',
  APPROVED: 'bg-primary/10 text-primary',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function MyAssignmentsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const lecturerId = user?.lecturer?.id

  const {
    theses,
    loading,
    error,
    capacity,
    semesters,
    fetchTheses,
    assignStudent,
    unassignStudent,
    fetchCapacity,
    fetchSemesters,
  } = useThesisStore()

  const [semesterId, setSemesterId] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | ThesisStatus>('all')
  const [assignOpen, setAssignOpen] = useState(false)
  const [unassignTarget, setUnassignTarget] = useState<ThesisItem | null>(null)
  const [unassigning, setUnassigning] = useState(false)
  const [totalAssigned, setTotalAssigned] = useState(0)
  const [topicCounts, setTopicCounts] = useState<Record<number, number>>({})

  // Load semesters once and default to the active one (or the first).
  useEffect(() => {
    fetchSemesters()
  }, [fetchSemesters])

  useEffect(() => {
    if (semesterId !== null || semesters.length === 0) return
    const active = semesters.find((s) => s.status === 'ACTIVE')
    setSemesterId(active?.id ?? semesters[0].id)
  }, [semesters, semesterId])

  // Re-fetch theses + capacity whenever scope changes.
  useEffect(() => {
    if (lecturerId === undefined || semesterId === null) return
    void fetchTheses({
      lecturerId,
      semesterId,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    })
    void fetchCapacity(lecturerId, semesterId)
    // Fetch unfiltered totals for accurate capacity count and topic hints
    void thesisApi.list({ lecturerId, semesterId }).then((res) => {
      setTotalAssigned(res.data.length)
      const counts: Record<number, number> = {}
      for (const thesis of res.data) {
        counts[thesis.topic.id] = (counts[thesis.topic.id] ?? 0) + 1
      }
      setTopicCounts(counts)
    })
  }, [lecturerId, semesterId, statusFilter, fetchTheses, fetchCapacity])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  const assignedCount = totalAssigned
  const maxStudents = capacity?.maxStudents ?? user?.lecturer?.maxStudents
  const atCapacity =
    maxStudents !== undefined && assignedCount >= maxStudents

  const refresh = () => {
    if (lecturerId === undefined || semesterId === null) return
    void fetchTheses({
      lecturerId,
      semesterId,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    })
    void fetchCapacity(lecturerId, semesterId)
    void thesisApi.list({ lecturerId, semesterId }).then((res) => {
      setTotalAssigned(res.data.length)
      const counts: Record<number, number> = {}
      for (const thesis of res.data) {
        counts[thesis.topic.id] = (counts[thesis.topic.id] ?? 0) + 1
      }
      setTopicCounts(counts)
    })
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
            My Assignments
          </h1>
          <p className="font-sans text-sm text-muted-foreground mt-1">
            Students assigned to your topics this semester.
          </p>
        </div>
        <Button
          onClick={() => setAssignOpen(true)}
          disabled={semesterId === null || atCapacity}
          className="font-label bg-gradient-to-br from-primary to-primary-container text-primary-foreground"
        >
          <Plus className="w-4 h-4 mr-2" />
          Assign Student
        </Button>
      </div>

      {/* Capacity indicator */}
      <div className="bg-surface-container-low rounded-lg px-4 py-3 flex items-center gap-3 max-w-xs">
        <Users className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="font-label text-xs font-medium text-muted-foreground uppercase tracking-wide shrink-0">
          Capacity
        </span>
        <span
          className={`font-sans text-sm font-semibold ${
            atCapacity ? 'text-tertiary' : 'text-on-surface'
          }`}
        >
          {assignedCount} / {maxStudents ?? '—'}
        </span>
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
                  colSpan={7}
                  className="px-4 py-8 text-center font-sans text-sm text-muted-foreground"
                >
                  Loading…
                </td>
              </tr>
            )}
            {!loading && theses.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center font-sans text-sm text-muted-foreground"
                >
                  No assignments yet for this semester.
                </td>
              </tr>
            )}
            {!loading &&
              theses.map((t, idx) => {
                const canUnassign = t.status === 'IN_PROGRESS'
                return (
                  <tr
                    key={t.id}
                    onClick={() => navigate(`/my-assignments/${t.id}`)}
                    className="hover:bg-surface-container transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-sans text-sm text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 font-sans text-sm font-medium text-on-surface">
                      {t.topic.title}
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
                        onClick={(e) => {
                          e.stopPropagation()
                          setUnassignTarget(t)
                        }}
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

      {/* Assign dialog */}
      {lecturerId !== undefined && semesterId !== null && (
        <AssignStudentDialog
          open={assignOpen}
          onOpenChange={setAssignOpen}
          lecturerId={lecturerId}
          semesterId={semesterId}
          topicCounts={topicCounts}
          onAssign={handleAssign}
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
