// frontend/src/features/account/components/AccountManagementPage.tsx
import { useEffect, useState, useCallback, useRef } from 'react'
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
import { studentApi, extractErrorMessage } from '../../student/api'
import { lecturerApi } from '../../lecturer/api'
import { accountApi } from '../api'
import type { StudentItem } from '../../student/api'
import type { LecturerItem } from '../../lecturer/api'

const PAGE_LIMIT = 20

type Tab = 'students' | 'lecturers'
type StudentStatusFilter = 'all' | 'no-account' | 'active' | 'inactive'
type LecturerStatusFilter = 'all' | 'active' | 'inactive'

type ConfirmState =
  | { kind: 'activate-single'; item: StudentItem }
  | { kind: 'deactivate-single'; item: StudentItem | LecturerItem; tab: Tab }
  | { kind: 'activate-bulk'; ids: string[] }
  | { kind: 'deactivate-bulk'; ids: string[]; tab: Tab }
  | null

// ─── Status badges (defined outside to avoid re-creating on every render) ──

function StudentStatusBadge({ item }: { item: StudentItem }) {
  if (!item.hasAccount) {
    return (
      <span className="font-label text-xs font-medium px-2 py-0.5 rounded-full bg-surface-container text-muted-foreground">
        No Account
      </span>
    )
  }
  if (item.isActive) {
    return (
      <span className="font-label text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
        Active
      </span>
    )
  }
  return (
    <span className="font-label text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
      Inactive
    </span>
  )
}

function LecturerStatusBadge({ item }: { item: LecturerItem }) {
  if (item.isActive) {
    return (
      <span className="font-label text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
        Active
      </span>
    )
  }
  return (
    <span className="font-label text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
      Inactive
    </span>
  )
}

// ─── Page component ─────────────────────────────────────────────────────────

export default function AccountManagementPage() {
  const [activeTab, setActiveTab] = useState<Tab>('students')

  const [students, setStudents] = useState<StudentItem[]>([])
  const [studentTotal, setStudentTotal] = useState(0)
  const [studentPage, setStudentPage] = useState(1)

  const [lecturers, setLecturers] = useState<LecturerItem[]>([])
  const [lecturerTotal, setLecturerTotal] = useState(0)
  const [lecturerPage, setLecturerPage] = useState(1)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [studentStatus, setStudentStatus] = useState<StudentStatusFilter>('all')
  const [lecturerStatus, setLecturerStatus] = useState<LecturerStatusFilter>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmDialog, setConfirmDialog] = useState<ConfirmState>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tabInitialisedRef = useRef<Tab | null>(null)

  // ─── Data fetchers ────────────────────────────────────────────────────────

  const fetchStudents = useCallback(
    async (p: number) => {
      setLoading(true)
      setError(null)
      try {
        const res = await studentApi.list({
          search: search || undefined,
          accountStatus: studentStatus !== 'all' ? studentStatus : undefined,
          page: p,
          limit: PAGE_LIMIT,
        })
        setStudents(res.data.data)
        setStudentTotal(res.data.total)
        setStudentPage(res.data.page)
      } catch (err) {
        setError(extractErrorMessage(err))
      } finally {
        setLoading(false)
      }
    },
    [search, studentStatus],
  )

  const fetchLecturers = useCallback(
    async (p: number) => {
      setLoading(true)
      setError(null)
      try {
        const res = await lecturerApi.list({
          search: search || undefined,
          accountStatus: lecturerStatus !== 'all' ? lecturerStatus : undefined,
          page: p,
          limit: PAGE_LIMIT,
        })
        setLecturers(res.data.data)
        setLecturerTotal(res.data.total)
        setLecturerPage(res.data.page)
      } catch (err) {
        setError(extractErrorMessage(err))
      } finally {
        setLoading(false)
      }
    },
    [search, lecturerStatus],
  )

  // ─── Unified fetch effect ─────────────────────────────────────────────────
  // Tab changes fire immediately; filter/search changes are debounced 300 ms.

  useEffect(() => {
    if (tabInitialisedRef.current !== activeTab) {
      tabInitialisedRef.current = activeTab
      setSelectedIds(new Set())
      if (activeTab === 'students') void fetchStudents(1)
      else void fetchLecturers(1)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (activeTab === 'students') void fetchStudents(1)
      else void fetchLecturers(1)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [activeTab, fetchStudents, fetchLecturers])

  // ─── Tab switch ───────────────────────────────────────────────────────────

  function switchTab(tab: Tab) {
    setActiveTab(tab)
    setSelectedIds(new Set())
    setSearch('')
    setStudentStatus('all')
    setLecturerStatus('all')
  }

  // ─── Pagination ───────────────────────────────────────────────────────────

  function handlePageChange(p: number) {
    setSelectedIds(new Set())
    if (activeTab === 'students') void fetchStudents(p)
    else void fetchLecturers(p)
  }

  const total = activeTab === 'students' ? studentTotal : lecturerTotal
  const currentPage = activeTab === 'students' ? studentPage : lecturerPage
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT))
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * PAGE_LIMIT + 1
  const rangeEnd = Math.min(currentPage * PAGE_LIMIT, total)

  // ─── Selection helpers ────────────────────────────────────────────────────

  const currentIds =
    activeTab === 'students' ? students.map((s) => s.id) : lecturers.map((l) => l.id)
  const allSelected =
    currentIds.length > 0 && currentIds.every((id) => selectedIds.has(id))

  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set(currentIds))
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ─── Action handlers ──────────────────────────────────────────────────────

  async function handleActivateSingle(student: StudentItem) {
    setActionLoading(true)
    try {
      await accountApi.activateStudent(student.id)
      toast.success(`Account activated for ${student.fullName}.`)
      void fetchStudents(studentPage)
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setActionLoading(false)
      setConfirmDialog(null)
    }
  }

  async function handleToggleSingle(
    item: StudentItem | LecturerItem,
    tab: Tab,
    isActive: boolean,
  ) {
    setActionLoading(true)
    try {
      if (tab === 'students') {
        await accountApi.toggleStudentAccount(item.id, isActive)
      } else {
        await accountApi.toggleLecturerAccount(item.id, isActive)
      }
      const verb = isActive ? 'reactivated' : 'deactivated'
      toast.success(`${item.fullName}'s account ${verb}.`)
      if (tab === 'students') void fetchStudents(studentPage)
      else void fetchLecturers(lecturerPage)
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setActionLoading(false)
      setConfirmDialog(null)
    }
  }

  async function handleActivateBulk(ids: string[]) {
    setActionLoading(true)
    try {
      const res = await accountApi.activateStudentsBulk(ids)
      const { activated, skipped } = res.data
      toast.success(
        skipped > 0
          ? `${activated} activated, ${skipped} already had accounts.`
          : `${activated} accounts activated.`,
      )
      setSelectedIds(new Set())
      void fetchStudents(studentPage)
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setActionLoading(false)
      setConfirmDialog(null)
    }
  }

  async function handleToggleBulk(ids: string[], tab: Tab, isActive: boolean) {
    setActionLoading(true)
    try {
      let updated: number, skipped: number
      if (tab === 'students') {
        const res = await accountApi.toggleStudentsAccountBulk(ids, isActive)
        updated = res.data.updated
        skipped = res.data.skipped
      } else {
        const res = await accountApi.toggleLecturersAccountBulk(ids, isActive)
        updated = res.data.updated
        skipped = res.data.skipped
      }
      const verb = isActive ? 'reactivated' : 'deactivated'
      toast.success(
        skipped > 0
          ? `${updated} ${verb}, ${skipped} skipped (no account).`
          : `${updated} accounts ${verb}.`,
      )
      setSelectedIds(new Set())
      if (tab === 'students') void fetchStudents(studentPage)
      else void fetchLecturers(lecturerPage)
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setActionLoading(false)
      setConfirmDialog(null)
    }
  }

  function confirmAction() {
    if (!confirmDialog) return
    switch (confirmDialog.kind) {
      case 'activate-single':
        void handleActivateSingle(confirmDialog.item)
        break
      case 'deactivate-single':
        void handleToggleSingle(confirmDialog.item, confirmDialog.tab, false)
        break
      case 'activate-bulk':
        void handleActivateBulk(confirmDialog.ids)
        break
      case 'deactivate-bulk':
        void handleToggleBulk(confirmDialog.ids, confirmDialog.tab, false)
        break
    }
  }

  // ─── Confirmation dialog content ──────────────────────────────────────────

  type DialogContent = { title: string; description: string; actionLabel: string; isDangerous: boolean }

  function getDialogContent(): DialogContent {
    if (!confirmDialog) return { title: '', description: '', actionLabel: '', isDangerous: false }
    switch (confirmDialog.kind) {
      case 'activate-single':
        return {
          title: 'Activate Account',
          description: `Activate account for ${confirmDialog.item.fullName}? They will be able to log in with their student ID.`,
          actionLabel: 'Activate',
          isDangerous: false,
        }
      case 'deactivate-single':
        return {
          title: 'Deactivate Account',
          description: `Deactivate ${confirmDialog.item.fullName}'s account? They will lose login access immediately.`,
          actionLabel: 'Deactivate',
          isDangerous: true,
        }
      case 'activate-bulk':
        return {
          title: 'Activate Accounts',
          description: `Activate accounts for ${confirmDialog.ids.length} students? They will be able to log in with their student ID.`,
          actionLabel: 'Activate All',
          isDangerous: false,
        }
      case 'deactivate-bulk':
        return {
          title: 'Deactivate Accounts',
          description: `Deactivate ${confirmDialog.ids.length} accounts? These users will lose login access immediately.`,
          actionLabel: 'Deactivate All',
          isDangerous: true,
        }
    }
  }

  const lastContentRef = useRef<ReturnType<typeof getDialogContent> | null>(null)
  // Must update during render (not useEffect) so Radix's exit animation sees retained content.
  if (confirmDialog) lastContentRef.current = getDialogContent()
  const dialogContent = lastContentRef.current ?? getDialogContent()
  const selectedCount = selectedIds.size

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-semibold text-on-surface">
          Account Management
        </h1>
        <p className="font-sans text-sm font-medium text-muted-foreground mt-1">
          Manage login access for students and lecturers.
        </p>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 p-1 bg-surface-container rounded-lg w-fit">
        {(['students', 'lecturers'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => switchTab(tab)}
            className={`px-5 py-1.5 rounded-md font-label text-sm capitalize transition-colors ${
              activeTab === tab
                ? 'bg-surface shadow-sm text-primary font-medium'
                : 'text-muted-foreground hover:text-on-surface'
            }`}
          >
            {tab === 'students' ? 'Students' : 'Lecturers'}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder={
            activeTab === 'students'
              ? 'Search by name, student ID, or email…'
              : 'Search by name, lecturer ID, or email…'
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="font-sans text-sm max-w-xs"
        />
        {activeTab === 'students' ? (
          <Select
            value={studentStatus}
            onValueChange={(v) => setStudentStatus(v as StudentStatusFilter)}
          >
            <SelectTrigger className="w-44 font-sans text-sm">
              <SelectValue placeholder="Account status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="no-account">No Account</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Select
            value={lecturerStatus}
            onValueChange={(v) => setLecturerStatus(v as LecturerStatusFilter)}
          >
            <SelectTrigger className="w-44 font-sans text-sm">
              <SelectValue placeholder="Account status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Bulk action toolbar — visible only when ≥1 row is checked */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-4 px-4 py-3 bg-primary/5 rounded-lg">
          <span className="font-label text-sm font-medium text-primary">
            {selectedCount} selected
          </span>
          <div className="flex gap-2">
            {activeTab === 'students' && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={actionLoading}
                  onClick={() =>
                    setConfirmDialog({
                      kind: 'activate-bulk',
                      ids: Array.from(selectedIds),
                    })
                  }
                  className="font-label text-xs h-7 px-3 bg-primary/10 text-primary hover:bg-primary/20"
                >
                  Activate Selected
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={actionLoading}
                  onClick={() =>
                    setConfirmDialog({
                      kind: 'deactivate-bulk',
                      ids: Array.from(selectedIds),
                      tab: 'students',
                    })
                  }
                  className="font-label text-xs h-7 px-3 text-destructive hover:bg-destructive/10"
                >
                  Deactivate Selected
                </Button>
              </>
            )}
            {activeTab === 'lecturers' && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={actionLoading}
                  onClick={() =>
                    setConfirmDialog({
                      kind: 'deactivate-bulk',
                      ids: Array.from(selectedIds),
                      tab: 'lecturers',
                    })
                  }
                  className="font-label text-xs h-7 px-3 text-destructive hover:bg-destructive/10"
                >
                  Deactivate Selected
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={actionLoading}
                  onClick={() =>
                    void handleToggleBulk(Array.from(selectedIds), 'lecturers', true)
                  }
                  className="font-label text-xs h-7 px-3 bg-primary/10 text-primary hover:bg-primary/20"
                >
                  Reactivate Selected
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-surface-container-low rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-container">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded accent-primary cursor-pointer"
                />
              </th>
              {activeTab === 'students' ? (
                <>
                  <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">Student ID</th>
                  <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">Full Name</th>
                  <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">Status</th>
                  <th className="px-4 py-3" />
                </>
              ) : (
                <>
                  <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">Lecturer ID</th>
                  <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">Full Name</th>
                  <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 font-label text-xs text-muted-foreground">Status</th>
                  <th className="px-4 py-3" />
                </>
              )}
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

            {/* Students rows */}
            {!loading && !error && activeTab === 'students' && students.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center font-sans text-sm text-muted-foreground">
                  No students found.
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              activeTab === 'students' &&
              students.map((s) => (
                <tr
                  key={s.id}
                  className="border-t border-surface-container hover:bg-surface-container transition-colors"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(s.id)}
                      onChange={() => toggleSelect(s.id)}
                      className="h-4 w-4 rounded accent-primary cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 font-sans text-sm font-medium text-on-surface">
                    {s.studentId}
                  </td>
                  <td className="px-4 py-3 font-sans text-sm text-on-surface">{s.fullName}</td>
                  <td className="px-4 py-3 font-sans text-sm text-muted-foreground">{s.email}</td>
                  <td className="px-4 py-3">
                    <StudentStatusBadge item={s} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {!s.hasAccount && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={actionLoading}
                          onClick={() =>
                            setConfirmDialog({ kind: 'activate-single', item: s })
                          }
                          className="font-label text-xs h-7 px-2 bg-primary/10 text-primary hover:bg-primary/20"
                        >
                          Activate
                        </Button>
                      )}
                      {s.hasAccount && s.isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={actionLoading}
                          onClick={() =>
                            setConfirmDialog({
                              kind: 'deactivate-single',
                              item: s,
                              tab: 'students',
                            })
                          }
                          className="font-label text-xs h-7 px-2 text-destructive hover:bg-destructive/10"
                        >
                          Deactivate
                        </Button>
                      )}
                      {s.hasAccount && !s.isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={actionLoading}
                          onClick={() => void handleToggleSingle(s, 'students', true)}
                          className="font-label text-xs h-7 px-2 bg-primary/10 text-primary hover:bg-primary/20"
                        >
                          Reactivate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

            {/* Lecturers rows */}
            {!loading && !error && activeTab === 'lecturers' && lecturers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center font-sans text-sm text-muted-foreground">
                  No lecturers found.
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              activeTab === 'lecturers' &&
              lecturers.map((l) => (
                <tr
                  key={l.id}
                  className="border-t border-surface-container hover:bg-surface-container transition-colors"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(l.id)}
                      onChange={() => toggleSelect(l.id)}
                      className="h-4 w-4 rounded accent-primary cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 font-sans text-sm font-medium text-on-surface">
                    {l.lecturerId}
                  </td>
                  <td className="px-4 py-3 font-sans text-sm text-on-surface">{l.fullName}</td>
                  <td className="px-4 py-3 font-sans text-sm text-muted-foreground">{l.email}</td>
                  <td className="px-4 py-3">
                    <LecturerStatusBadge item={l} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {l.isActive ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={actionLoading}
                          onClick={() =>
                            setConfirmDialog({
                              kind: 'deactivate-single',
                              item: l,
                              tab: 'lecturers',
                            })
                          }
                          className="font-label text-xs h-7 px-2 text-destructive hover:bg-destructive/10"
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={actionLoading}
                          onClick={() => void handleToggleSingle(l, 'lecturers', true)}
                          className="font-label text-xs h-7 px-2 bg-primary/10 text-primary hover:bg-primary/20"
                        >
                          Reactivate
                        </Button>
                      )}
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
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || loading}
              className="font-label text-sm"
            >
              Previous
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
              className="font-label text-sm"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation dialog — single instance, parameterized by confirmDialog state */}
      <AlertDialog
        open={confirmDialog !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog(null)
        }}
      >
        <AlertDialogContent
          className="bg-surface"
          style={{ boxShadow: '0 0 32px 0 rgba(25,28,29,0.06)' }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-lg font-semibold text-on-surface">
              {dialogContent.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="font-sans text-sm text-muted-foreground">
              {dialogContent.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading} className="font-label">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading}
              onClick={confirmAction}
              className={`font-label ${
                dialogContent.isDangerous
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : 'bg-gradient-to-br from-primary to-primary-container text-primary-foreground'
              }`}
            >
              {actionLoading ? 'Processing…' : dialogContent.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
