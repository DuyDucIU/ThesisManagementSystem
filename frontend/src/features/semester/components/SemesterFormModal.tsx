import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { semesterApi, toDateInput, extractErrorMessage } from '../api'
import type { Semester } from '../api'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  semester?: Semester   // provided for edit mode; undefined for create
}

interface FormState {
  code: string
  name: string
  startDate: string   // YYYY-MM-DD
  endDate: string     // YYYY-MM-DD
}

export default function SemesterFormModal({ open, onClose, onSuccess, semester }: Props) {
  const isEdit = !!semester

  const [form, setForm] = useState<FormState>({ code: '', name: '', startDate: '', endDate: '' })
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Populate form when editing
  useEffect(() => {
    if (open && semester) {
      setForm({
        code: semester.code,
        name: semester.name,
        startDate: toDateInput(semester.startDate),
        endDate: toDateInput(semester.endDate),
      })
    } else if (open && !semester) {
      setForm({ code: '', name: '', startDate: '', endDate: '' })
    }
    setFieldError(null)
  }, [open, semester])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setFieldError(null)
  }

  function validate(): string | null {
    if (!form.code.trim()) return 'Code is required.'
    if (!form.name.trim()) return 'Name is required.'
    if (!form.startDate) return 'Start date is required.'
    if (!form.endDate) return 'End date is required.'
    if (form.endDate <= form.startDate) return 'End date must be after start date.'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validate()
    if (err) { setFieldError(err); return }

    setSubmitting(true)
    try {
      if (isEdit) {
        await semesterApi.update(semester!.id, {
          code: form.code,
          name: form.name,
          startDate: form.startDate,
          endDate: form.endDate,
        })
        toast.success('Semester updated.')
      } else {
        await semesterApi.create({
          code: form.code,
          name: form.name,
          startDate: form.startDate,
          endDate: form.endDate,
        })
        toast.success('Semester created.')
      }
      onSuccess()
      onClose()
    } catch (err) {
      setFieldError(extractErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md bg-surface" style={{ boxShadow: '0 0 32px 0 rgba(25,28,29,0.06)' }}>
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-semibold text-on-surface">
            {isEdit ? 'Edit Semester' : 'Create Semester'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="code" className="font-label text-xs font-medium text-on-surface uppercase tracking-wide">
              Code
            </Label>
            <Input
              id="code"
              name="code"
              value={form.code}
              onChange={handleChange}
              placeholder="e.g. S1 25-26"
              className="font-sans bg-surface-container-low border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name" className="font-label text-xs font-medium text-on-surface uppercase tracking-wide">
              Name
            </Label>
            <Input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Semester 1 Year 2025-2026"
              className="font-sans bg-surface-container-low border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startDate" className="font-label text-xs font-medium text-on-surface uppercase tracking-wide">
                Start Date
              </Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                value={form.startDate}
                onChange={handleChange}
                className="font-sans bg-surface-container-low border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate" className="font-label text-xs font-medium text-on-surface uppercase tracking-wide">
                End Date
              </Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                value={form.endDate}
                onChange={handleChange}
                className="font-sans bg-surface-container-low border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
              />
            </div>
          </div>

          {fieldError && (
            <p className="font-sans text-sm text-destructive">{fieldError}</p>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
              className="font-label"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="font-label bg-gradient-to-br from-primary to-primary-container text-primary-foreground"
            >
              {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
