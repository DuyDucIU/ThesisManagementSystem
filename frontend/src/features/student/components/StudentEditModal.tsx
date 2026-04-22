// frontend/src/features/student/components/StudentEditModal.tsx
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
import { studentApi, extractErrorMessage } from '../api'
import type { StudentItem } from '../api'

interface Props {
  student: StudentItem | null
  onClose: () => void
  onSaved: () => void
}

export default function StudentEditModal({ student, onClose, onSaved }: Props) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [studentId, setStudentId] = useState('')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string
    studentId?: string
  }>({})

  useEffect(() => {
    if (student) {
      setFullName(student.fullName)
      setEmail(student.email)
      setStudentId(student.studentId)
      setFieldErrors({})
    }
  }, [student])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!student) return
    setLoading(true)
    setFieldErrors({})
    try {
      await studentApi.update(student.id, { fullName, email, studentId })
      toast.success('Student updated.')
      onSaved()
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

  return (
    <Dialog open={student !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent
        className="bg-surface max-w-md"
        style={{ boxShadow: '0 0 32px 0 rgba(25,28,29,0.06)' }}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-semibold text-on-surface">
            Edit Student
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="font-label text-xs font-medium text-on-surface uppercase tracking-wide">
              Full Name
            </Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
              className="font-sans bg-surface-container-low border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>

          {/* Student ID */}
          <div className="space-y-1.5">
            <Label htmlFor="studentId" className="font-label text-xs font-medium text-on-surface uppercase tracking-wide">
              Student ID
            </Label>
            <Input
              id="studentId"
              value={studentId}
              onChange={(e) => {
                setStudentId(e.target.value)
                setFieldErrors((prev) => ({ ...prev, studentId: undefined }))
              }}
              disabled={loading}
              className="font-sans bg-surface-container-low border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
            {fieldErrors.studentId && (
              <p className="font-sans text-xs text-destructive">{fieldErrors.studentId}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="font-label text-xs font-medium text-on-surface uppercase tracking-wide">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setFieldErrors((prev) => ({ ...prev, email: undefined }))
              }}
              disabled={loading}
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
