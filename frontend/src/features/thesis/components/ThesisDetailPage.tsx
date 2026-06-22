import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { Button } from '../../../components/ui/button'
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
import { useAuthStore } from '../../auth/store/authStore'
import { useThesisStore } from '../store/thesisStore'
import { thesisApi, extractErrorMessage } from '../api'
import type { ThesisItem, ThesisStatus } from '../api'

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

export default function ThesisDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const { unassignStudent } = useThesisStore()

  const [thesis, setThesis] = useState<ThesisItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [unassigning, setUnassigning] = useState(false)

  const isAdmin = user?.role === 'ADMIN'
  const listPath = isAdmin && location.pathname.startsWith('/admin')
    ? '/admin/assignments'
    : '/my-assignments'

  useEffect(() => {
    if (!id) return
    setLoading(true)
    thesisApi
      .get(Number(id))
      .then((res) => setThesis(res.data))
      .catch((err) => {
        toast.error(extractErrorMessage(err))
        void navigate(listPath, { replace: true })
      })
      .finally(() => setLoading(false))
  }, [id, navigate, listPath])

  const canUnassign = (() => {
    if (!thesis || thesis.status !== 'IN_PROGRESS') return false
    if (isAdmin) return true
    // Show button if user has a lecturer profile; backend enforces topic ownership.
    return user?.lecturer?.id !== undefined
  })()

  const handleUnassign = async () => {
    if (!thesis) return
    setUnassigning(true)
    try {
      await unassignStudent(thesis.id)
      toast.success('Student unassigned.')
      void navigate(listPath, { replace: true })
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setUnassigning(false)
      setConfirmOpen(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="font-sans text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!thesis) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="font-sans text-sm text-muted-foreground">
          Thesis not found.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        type="button"
        onClick={() => navigate(listPath)}
        className="inline-flex items-center gap-1.5 font-label text-xs text-muted-foreground hover:text-on-surface transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to assignments
      </button>

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold text-on-surface">
          Assignment Details
        </h1>
        {canUnassign && (
          <Button
            variant="ghost"
            onClick={() => setConfirmOpen(true)}
            className="font-label text-sm text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            Unassign Student
          </Button>
        )}
      </div>

      {/* Detail card */}
      <div className="bg-surface-container rounded-xl p-6 space-y-5">
        <DetailRow label="Thesis Title" value={thesis.title} />
        <DetailRow label="Topic" value={thesis.topic.title} />
        <DetailRow
          label="Student"
          value={`${thesis.student.fullName} (${thesis.student.studentId})`}
        />
        <DetailRow label="Assigned Date" value={formatDate(thesis.createdAt)} />
        <div>
          <span className="font-label text-xs text-muted-foreground block mb-1">
            Status
          </span>
          <span
            className={`font-label text-xs font-medium px-2.5 py-1 rounded-full ${statusBadgeClass[thesis.status]}`}
          >
            {thesis.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Unassign confirmation */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Unassign student?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-sans">
              {thesis.student.fullName} will be removed from &ldquo;
              {thesis.topic.title}&rdquo;. The enrollment returns to available.
              This cannot be undone.
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
              {unassigning ? 'Unassigning...' : 'Unassign'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-label text-xs text-muted-foreground block mb-1">
        {label}
      </span>
      <span className="font-sans text-sm text-on-surface">{value}</span>
    </div>
  )
}
