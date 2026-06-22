import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { Button } from '../../../components/ui/button'
import { ScrollArea } from '../../../components/ui/scroll-area'
import { Search } from 'lucide-react'
import {
  extractErrorMessage,
  lecturerSemesterApi,
  thesisApi,
} from '../api'
import { topicApi } from '../../topic/api'
import { lecturerApi } from '../../lecturer/api'

const LECTURERS_LIMIT = 200

interface CapacityRow {
  lecturerId: number
  lecturer: { fullName: string; email: string }
  /** Effective max for this semester (persisted config or the lecturer default). */
  maxStudents: number
}

interface ManageCapacityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  semesterId: number
  /** Called after a successful save so the parent can refresh counts. */
  onSaved?: () => void
}

export default function ManageCapacityDialog({
  open,
  onOpenChange,
  semesterId,
  onSaved,
}: ManageCapacityDialogProps) {
  const [rows, setRows] = useState<CapacityRow[]>([])
  const [loading, setLoading] = useState(false)
  // Current assigned counts keyed by lecturerId.
  const [assignedCounts, setAssignedCounts] = useState<Record<number, number>>(
    {},
  )
  // Editable draft of maxStudents keyed by lecturerId.
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const [savingId, setSavingId] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  // Build a topicId → lecturerId map so we can tally theses by lecturer.
  // We fetch the unfiltered theses list (all lecturers, all statuses) plus the
  // unfiltered topic list to resolve each thesis to its owning lecturer.
  const load = useMemo(
    () => async () => {
      setLoading(true)
      try {
        // lecturerSemesterApi.list only returns lecturers with a persisted
        // config row, so merge with the full lecturer list and fall back to the
        // lecturer's default maxStudents — matching the backend's resolveCapacity.
        const [lecturersRes, configsRes, thesesRes, topicsRes] =
          await Promise.all([
            lecturerApi.list({ limit: LECTURERS_LIMIT }),
            lecturerSemesterApi.list(semesterId),
            thesisApi.list({ semesterId }),
            topicApi.list({ semesterId }),
          ])

        const configByLecturer = new Map(
          configsRes.data.map((c) => [c.lecturerId, c.maxStudents]),
        )
        const merged: CapacityRow[] = lecturersRes.data.data.map((l) => ({
          lecturerId: l.id,
          lecturer: { fullName: l.fullName, email: l.email },
          maxStudents: configByLecturer.get(l.id) ?? l.maxStudents,
        }))
        merged.sort((a, b) =>
          a.lecturer.fullName.localeCompare(b.lecturer.fullName),
        )
        setRows(merged)
        setDrafts(
          Object.fromEntries(
            merged.map((r) => [r.lecturerId, String(r.maxStudents)]),
          ),
        )

        // The thesis response lacks lecturerId, so resolve via the topic list.
        const topicToLecturer: Record<number, number> = {}
        for (const t of topicsRes.data) {
          topicToLecturer[t.id] = t.lecturer.id
        }

        const counts: Record<number, number> = {}
        for (const thesis of thesesRes.data) {
          const lecturerId = topicToLecturer[thesis.topic.id]
          if (lecturerId === undefined) continue
          counts[lecturerId] = (counts[lecturerId] ?? 0) + 1
        }
        setAssignedCounts(counts)
      } catch (err) {
        toast.error(extractErrorMessage(err))
      } finally {
        setLoading(false)
      }
    },
    [semesterId],
  )

  useEffect(() => {
    if (!open) return
    setSearch('')
    void load()
  }, [open, load])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.lecturer.fullName.toLowerCase().includes(q) ||
        r.lecturer.email.toLowerCase().includes(q),
    )
  }, [rows, search])

  const handleSave = async (row: CapacityRow) => {
    const raw = drafts[row.lecturerId]
    const value = Number(raw)
    if (!Number.isInteger(value) || value < 0) {
      toast.error('Max students must be a non-negative whole number.')
      return
    }
    const assigned = assignedCounts[row.lecturerId] ?? 0
    if (value < assigned) {
      toast.error(
        `Max students cannot be below the ${assigned} already assigned.`,
      )
      return
    }

    setSavingId(row.lecturerId)
    try {
      await lecturerSemesterApi.upsert(row.lecturerId, {
        semesterId,
        maxStudents: value,
      })
      toast.success(`Capacity updated for ${row.lecturer.fullName}.`)
      setRows((prev) =>
        prev.map((r) =>
          r.lecturerId === row.lecturerId ? { ...r, maxStudents: value } : r,
        ),
      )
      onSaved?.()
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setSavingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Manage capacity
          </DialogTitle>
          <DialogDescription className="font-sans text-sm">
            Set how many students each lecturer can supervise this semester.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search lecturers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 font-sans text-sm"
          />
        </div>

        <ScrollArea className="h-96 -mx-1 px-1">
          <div className="bg-surface-container-low rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-container">
                  <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">
                    Lecturer
                  </th>
                  <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground w-28">
                    Assigned
                  </th>
                  <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground w-32">
                    Max students
                  </th>
                  <th className="text-right px-4 py-3 font-label text-xs text-muted-foreground w-24">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center font-sans text-sm text-muted-foreground"
                    >
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && filteredRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center font-sans text-sm text-muted-foreground"
                    >
                      No lecturers found for this semester.
                    </td>
                  </tr>
                )}
                {!loading &&
                  filteredRows.map((row) => {
                    const assigned = assignedCounts[row.lecturerId] ?? 0
                    const draft = drafts[row.lecturerId] ?? ''
                    const changed = draft !== String(row.maxStudents)
                    return (
                      <tr
                        key={row.lecturerId}
                        className="hover:bg-surface-container transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className="block font-sans text-sm font-medium text-on-surface">
                            {row.lecturer.fullName}
                          </span>
                          <span className="block font-label text-xs text-muted-foreground">
                            {row.lecturer.email}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-sans text-sm text-muted-foreground">
                          {assigned}
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            min={0}
                            value={draft}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [row.lecturerId]: e.target.value,
                              }))
                            }
                            className="w-24 font-sans text-sm"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            disabled={!changed || savingId === row.lecturerId}
                            onClick={() => void handleSave(row)}
                            className="font-label bg-gradient-to-br from-primary to-primary-container text-primary-foreground"
                          >
                            {savingId === row.lecturerId ? 'Saving…' : 'Save'}
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
