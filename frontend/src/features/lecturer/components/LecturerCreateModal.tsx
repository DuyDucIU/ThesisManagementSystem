// frontend/src/features/lecturer/components/LecturerCreateModal.tsx
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
import { lecturerApi, extractErrorMessage } from '../api'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export default function LecturerCreateModal({ open, onClose, onCreated }: Props) {
  const [lecturerId, setLecturerId] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [title, setTitle] = useState('')
  const [maxStudents, setMaxStudents] = useState('5')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{
    lecturerId?: string
    email?: string
  }>({})

  function reset() {
    setLecturerId('')
    setFullName('')
    setEmail('')
    setTitle('')
    setMaxStudents('5')
    setFieldErrors({})
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setFieldErrors({})
    try {
      await lecturerApi.create({
        lecturerId,
        fullName,
        email,
        title: title || undefined,
        maxStudents: Number(maxStudents),
      })
      toast.success(`Lecturer created. Initial password: ${lecturerId}`, { duration: 8000 })
      reset()
      onCreated()
    } catch (err) {
      const msg = extractErrorMessage(err)
      const lower = msg.toLowerCase()
      if (lower.includes('lecturer id') || lower.includes('lecturer_id')) {
        setFieldErrors({ lecturerId: msg })
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
            Create Lecturer
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Lecturer ID */}
          <div className="space-y-1.5">
            <Label htmlFor="create-lecturerId" className="font-label text-xs font-medium text-on-surface uppercase tracking-wide">
              Lecturer ID
            </Label>
            <Input
              id="create-lecturerId"
              value={lecturerId}
              onChange={(e) => {
                setLecturerId(e.target.value)
                setFieldErrors((prev) => ({ ...prev, lecturerId: undefined }))
              }}
              disabled={loading}
              required
              className="font-sans bg-surface-container-low border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
            {fieldErrors.lecturerId ? (
              <p className="font-sans text-xs text-destructive">{fieldErrors.lecturerId}</p>
            ) : (
              <p className="font-sans text-xs text-muted-foreground">
                Initial login password will be set to this ID.
              </p>
            )}
          </div>

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

          {/* Title (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="create-title" className="font-label text-xs font-medium text-on-surface uppercase tracking-wide">
              Title <span className="normal-case tracking-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="create-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              placeholder="e.g. Dr., Prof."
              className="font-sans bg-surface-container-low border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>

          {/* Max Students */}
          <div className="space-y-1.5">
            <Label htmlFor="create-maxStudents" className="font-label text-xs font-medium text-on-surface uppercase tracking-wide">
              Max Students
            </Label>
            <Input
              id="create-maxStudents"
              type="number"
              min={1}
              value={maxStudents}
              onChange={(e) => setMaxStudents(e.target.value)}
              disabled={loading}
              required
              className="font-sans bg-surface-container-low border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
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
