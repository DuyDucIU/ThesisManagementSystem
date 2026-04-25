// frontend/src/features/lecturer/components/LecturerListPage.tsx
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
  const { lecturers, total, page, loading, error, fetchAll } = useLecturerStore()

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
            Lecturers
          </h1>
          <p className="font-sans text-sm font-medium text-muted-foreground mt-1">
            Global lecturer directory.
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="font-label bg-gradient-to-br from-primary to-primary-container text-primary-foreground"
        >
          + Create Lecturer
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by name, lecturer ID, or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="font-sans text-sm max-w-xs"
        />
      </div>

      <div className="bg-surface-container-low rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-container">
              <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">Lecturer ID</th>
              <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">Full Name</th>
              <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">Email</th>
              <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">Title</th>
              <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">Max Students</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center font-sans text-sm text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center font-sans text-sm text-destructive">
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && lecturers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center font-sans text-sm text-muted-foreground">
                  No lecturers found.
                </td>
              </tr>
            )}
            {!loading &&
              lecturers.map((l) => (
                <tr
                  key={l.id}
                  className="border-t border-surface-container hover:bg-surface-container transition-colors"
                >
                  <td className="px-4 py-3 font-sans text-sm font-medium text-on-surface">{l.lecturerId}</td>
                  <td className="px-4 py-3 font-sans text-sm text-on-surface">{l.fullName}</td>
                  <td className="px-4 py-3 font-sans text-sm text-muted-foreground">{l.email}</td>
                  <td className="px-4 py-3 font-sans text-sm text-muted-foreground">{l.title || '—'}</td>
                  <td className="px-4 py-3 font-sans text-sm text-muted-foreground">{l.maxStudents}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditTarget(l)}
                        className="font-label text-xs h-7 px-2"
                      >
                        <Pencil className="w-3.5 h-3.5 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(l)}
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

      <LecturerEditModal
        lecturer={editTarget}
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
              Delete Lecturer
            </AlertDialogTitle>
            <AlertDialogDescription className="font-sans text-sm text-muted-foreground">
              {`Delete "${deleteTarget?.fullName}"? This also removes their login account. This action cannot be undone.`}
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

      <LecturerCreateModal
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
