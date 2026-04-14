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
