import { useState, useEffect } from 'react'
import { TopicItem, CreateTopicDto, UpdateTopicDto, extractErrorMessage } from '../api'
import { Semester } from '../../semester/api'
import TopicPickerDialog from './TopicPickerDialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Textarea } from '../../../components/ui/textarea'
import { Label } from '../../../components/ui/label'

interface TopicFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  /** Existing topic data when mode='edit' */
  topic?: TopicItem
  /** Pre-filled data when opened via Copy button */
  prefill?: Partial<CreateTopicDto>
  semesters: Semester[]
  onSubmit: (dto: CreateTopicDto | UpdateTopicDto) => Promise<void>
}

export default function TopicForm({
  open,
  onOpenChange,
  mode,
  topic,
  prefill,
  semesters,
  onSubmit,
}: TopicFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [requirements, setRequirements] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  // Populate form when opened
  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && topic) {
      setTitle(topic.title)
      setDescription(topic.description ?? '')
      setRequirements(topic.requirements ?? '')
      setNote(topic.note ?? '')
    } else if (prefill) {
      setTitle(prefill.title ?? '')
      setDescription(prefill.description ?? '')
      setRequirements(prefill.requirements ?? '')
      setNote(prefill.note ?? '')
    } else {
      setTitle('')
      setDescription('')
      setRequirements('')
      setNote('')
    }
    setError(null)
  }, [open, mode, topic, prefill])

  const handlePickerSelect = (picked: TopicItem) => {
    setTitle(picked.title)
    setDescription(picked.description ?? '')
    setRequirements(picked.requirements ?? '')
    setNote(picked.note ?? '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setSubmitting(true)
    setError(null)

    try {
      const dto: CreateTopicDto | UpdateTopicDto = {
        title: title.trim(),
        description: description.trim() || undefined,
        requirements: requirements.trim() || undefined,
        note: note.trim() || undefined,
      }
      await onSubmit(dto)
      onOpenChange(false)
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              {mode === 'create' ? 'New Topic' : 'Edit Topic'}
            </DialogTitle>
          </DialogHeader>

          {mode === 'create' && (
            <div className="flex items-center justify-between">
              <span className="font-sans text-sm text-muted-foreground">
                Start fresh or copy from an existing topic.
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="font-label text-sm text-primary"
                onClick={() => setPickerOpen(true)}
              >
                Pre-fill from existing
              </Button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title" className="font-label text-sm">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Topic title"
                required
                className="font-sans text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description" className="font-label text-sm">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the research topic…"
                rows={3}
                className="font-sans text-sm resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="requirements" className="font-label text-sm">Requirements</Label>
              <Textarea
                id="requirements"
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="Prerequisites or skills needed…"
                rows={2}
                className="font-sans text-sm resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="note" className="font-label text-sm">
                Note
                <span className="font-normal text-muted-foreground ml-1">
                  (visible to students)
                </span>
              </Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Availability, preferences, or any message to students…"
                rows={2}
                className="font-sans text-sm resize-none"
              />
            </div>

            {error && (
              <p className="font-sans text-sm text-destructive">{error}</p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !title.trim()}>
                {submitting ? 'Saving…' : mode === 'create' ? 'Create Topic' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <TopicPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        semesters={semesters}
        onSelect={handlePickerSelect}
      />
    </>
  )
}
