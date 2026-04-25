// frontend/src/features/lecturer/components/LecturerEditModal.tsx
import { useEffect, useState } from 'react'
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
import type { LecturerItem } from '../api'

interface Props {
  lecturer: LecturerItem | null
  onClose: () => void
  onSaved: () => void
}

export default function LecturerEditModal({ lecturer, onClose, onSaved }: Props) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [title, setTitle] = useState('')
  const [maxStudents, setMaxStudents] = useState('5')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string }>({})

  useEffect(() => {
    if (lecturer) {
      setFullName(lecturer.fullName)
      setEmail(lecturer.email)
      setTitle(lecturer.title ?? '')
      setMaxStudents(String(lecturer.maxStudents))
      setFieldErrors({})
    }
  }, [lecturer])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!lecturer) return
    setLoading(true)
    setFieldErrors({})
    try {
      await lecturerApi.update(lecturer.id, {
        fullName,
        email,
        title: title.trim(),
        maxStudents: Number(maxStudents),
      })
      toast.success('Lecturer updated.')
      onSaved()
    } catch (err) {
      const msg = extractErrorMessage(err)
      if (msg.toLowerCase().includes('email')) {
        setFieldErrors({ email: msg })
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={lecturer !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent
        className="bg-surface max-w-md"
        style={{ boxShadow: '0 0 32px 0 rgba(25,28,29,0.06)' }}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-semibold text-on-surface">
            Edit Lecturer
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Lecturer ID — read-only display */}
          <div className="space-y-1.5">
            <p className="font-label text-xs font-medium text-on-surface uppercase tracking-wide">
              Lecturer ID
            </p>
            <p className="font-mono text-sm text-on-surface-variant px-3 py-2 rounded-md bg-surface-container-low">
              {lecturer?.lecturerId}
            </p>
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-fullName" className="font-label text-xs font-medium text-on-surface uppercase tracking-wide">
              Full Name
            </Label>
            <Input
              id="edit-fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
              required
              className="font-sans bg-surface-container-low border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-email" className="font-label text-xs font-medium text-on-surface uppercase tracking-wide">
              Email
            </Label>
            <Input
              id="edit-email"
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
            <Label htmlFor="edit-title" className="font-label text-xs font-medium text-on-surface uppercase tracking-wide">
              Title <span className="normal-case tracking-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              placeholder="e.g. Dr., Prof."
              className="font-sans bg-surface-container-low border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>

          {/* Max Students */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-maxStudents" className="font-label text-xs font-medium text-on-surface uppercase tracking-wide">
              Max Students
            </Label>
            <Input
              id="edit-maxStudents"
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
              onClick={onClose}
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
              {loading ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
