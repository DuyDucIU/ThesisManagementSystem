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
    fullName?: string
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

  async function handleSave() {
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

        <div className="space-y-4 py-2">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="font-label text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Full Name
            </label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
              className="font-sans text-sm"
            />
            {fieldErrors.fullName && (
              <p className="font-sans text-xs text-destructive">{fieldErrors.fullName}</p>
            )}
          </div>

          {/* Student ID */}
          <div className="space-y-1.5">
            <label className="font-label text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Student ID
            </label>
            <Input
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              disabled={loading}
              className="font-sans text-sm"
            />
            {fieldErrors.studentId && (
              <p className="font-sans text-xs text-destructive">{fieldErrors.studentId}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="font-label text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="font-sans text-sm"
            />
            {fieldErrors.email && (
              <p className="font-sans text-xs text-destructive">{fieldErrors.email}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="font-label"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="font-label bg-gradient-to-br from-primary to-primary-container text-primary-foreground"
          >
            {loading ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
