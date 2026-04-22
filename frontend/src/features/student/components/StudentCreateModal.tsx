// frontend/src/features/student/components/StudentCreateModal.tsx
import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { studentApi, extractErrorMessage } from '../api'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export default function StudentCreateModal({ open, onClose, onCreated }: Props) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [studentId, setStudentId] = useState('')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string
    studentId?: string
  }>({})

  function reset() {
    setFullName('')
    setEmail('')
    setStudentId('')
    setFieldErrors({})
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setFieldErrors({})
    try {
      await studentApi.create({ fullName, email, studentId })
      toast.success('Student created.')
      reset()
      onCreated()
    } catch (err) {
      const msg = extractErrorMessage(err)
      const lower = msg.toLowerCase()
      if (lower.includes('student id') || lower.includes('student_id')) {
        setFieldErrors({ studentId: msg })
      } else if (lower.includes('email')) {
        setFieldErrors({ email: msg })
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent
        className="bg-surface max-w-md"
        style={{ boxShadow: '0 0 32px 0 rgba(25,28,29,0.06)' }}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-semibold text-on-surface">
            Create Student
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="create-fullName" className="font-label text-xs font-medium text-on-surface uppercase tracking-wide">
              Full Name
            </Label>
            <Input
              id="create-fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
              required
              className="font-sans bg-surface-container-low border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>

          {/* Student ID */}
          <div className="space-y-1.5">
            <Label htmlFor="create-studentId" className="font-label text-xs font-medium text-on-surface uppercase tracking-wide">
              Student ID
            </Label>
            <Input
              id="create-studentId"
              value={studentId}
              onChange={(e) => {
                setStudentId(e.target.value)
                setFieldErrors((prev) => ({ ...prev, studentId: undefined }))
              }}
              disabled={loading}
              required
              className="font-sans bg-surface-container-low border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
            {fieldErrors.studentId && (
              <p className="font-sans text-xs text-destructive">{fieldErrors.studentId}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="create-email" className="font-label text-xs font-medium text-on-surface uppercase tracking-wide">
              Email
            </Label>
            <Input
              id="create-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setFieldErrors((prev) => ({ ...prev, email: undefined }))
              }}
              disabled={loading}
              required
              className="font-sans bg-surface-container-low border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
            {fieldErrors.email && (
              <p className="font-sans text-xs text-destructive">{fieldErrors.email}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={loading}
              className="font-label"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="font-label bg-gradient-to-br from-primary to-primary-container text-primary-foreground"
            >
              {loading ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
