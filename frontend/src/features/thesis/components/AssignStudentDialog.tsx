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
import { Check, ChevronLeft, Search } from 'lucide-react'
import { topicApi } from '../../topic/api'
import type { TopicItem } from '../../topic/api'
import { enrollmentApi } from '../../enrollment/api'
import type { EnrollmentItem } from '../../enrollment/api'
import { extractErrorMessage } from '../api'
import type { CreateThesisDto } from '../api'

interface AssignStudentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * When provided, only this lecturer's open topics are listed (lecturer view).
   * When omitted, every lecturer's open topics are listed (admin view) and each
   * topic row shows its owning lecturer.
   */
  lecturerId?: number
  semesterId: number
  /** Map of topicId → current assignment count, used to display topic load. */
  topicCounts?: Record<number, number>
  onAssign: (dto: CreateThesisDto) => Promise<void>
}

const STUDENTS_LIMIT = 100

export default function AssignStudentDialog({
  open,
  onOpenChange,
  lecturerId,
  semesterId,
  topicCounts = {},
  onAssign,
}: AssignStudentDialogProps) {
  const [step, setStep] = useState<1 | 2>(1)

  const [topics, setTopics] = useState<TopicItem[]>([])
  const [topicsLoading, setTopicsLoading] = useState(false)
  const [selectedTopic, setSelectedTopic] = useState<TopicItem | null>(null)
  const [topicSearch, setTopicSearch] = useState('')

  const [students, setStudents] = useState<EnrollmentItem[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<EnrollmentItem | null>(null)
  const [studentSearch, setStudentSearch] = useState('')

  const [submitting, setSubmitting] = useState(false)

  // Reset all state whenever the dialog opens fresh.
  useEffect(() => {
    if (!open) return
    setStep(1)
    setSelectedTopic(null)
    setSelectedStudent(null)
    setTopicSearch('')
    setStudentSearch('')

    setTopicsLoading(true)
    topicApi
      .list({
        ...(lecturerId !== undefined && { lecturerId }),
        semesterId,
        status: 'OPEN',
      })
      .then((res) => setTopics(res.data))
      .catch((err) => {
        setTopics([])
        toast.error(extractErrorMessage(err))
      })
      .finally(() => setTopicsLoading(false))

    setStudentsLoading(true)
    enrollmentApi
      .list({ semesterId, status: 'AVAILABLE', limit: STUDENTS_LIMIT })
      .then((res) => setStudents(res.data.data))
      .catch((err) => {
        setStudents([])
        toast.error(extractErrorMessage(err))
      })
      .finally(() => setStudentsLoading(false))
  }, [open, lecturerId, semesterId])

  const filteredTopics = useMemo(() => {
    const q = topicSearch.trim().toLowerCase()
    if (!q) return topics
    return topics.filter((t) => t.title.toLowerCase().includes(q))
  }, [topics, topicSearch])

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase()
    if (!q) return students
    return students.filter(
      (s) =>
        s.student.fullName.toLowerCase().includes(q) ||
        s.student.studentId.toLowerCase().includes(q),
    )
  }, [students, studentSearch])

  const handleConfirm = async () => {
    if (!selectedTopic || !selectedStudent) return
    setSubmitting(true)
    try {
      await onAssign({
        topicId: selectedTopic.id,
        enrollmentId: selectedStudent.enrollmentId,
      })
      onOpenChange(false)
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {step === 1 ? 'Select a topic' : 'Select a student'}
          </DialogTitle>
          <DialogDescription className="font-sans text-sm">
            {step === 1
              ? lecturerId !== undefined
                ? 'Choose one of your open topics in this semester.'
                : 'Choose any lecturer’s open topic in this semester.'
              : 'Choose an available student to assign to this topic.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs font-label">
          <span
            className={`px-2 py-0.5 rounded-full ${
              step === 1
                ? 'bg-primary/10 text-primary'
                : 'bg-surface-container text-muted-foreground'
            }`}
          >
            1 · Topic
          </span>
          <span className="text-muted-foreground">→</span>
          <span
            className={`px-2 py-0.5 rounded-full ${
              step === 2
                ? 'bg-primary/10 text-primary'
                : 'bg-surface-container text-muted-foreground'
            }`}
          >
            2 · Student
          </span>
        </div>

        {step === 1 ? (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Search topics…"
                value={topicSearch}
                onChange={(e) => setTopicSearch(e.target.value)}
                className="pl-9 font-sans text-sm"
              />
            </div>

            <ScrollArea className="h-72 -mx-1 px-1">
              {topicsLoading && (
                <p className="py-8 text-center font-sans text-sm text-muted-foreground">
                  Loading topics…
                </p>
              )}
              {!topicsLoading && filteredTopics.length === 0 && (
                <p className="py-8 text-center font-sans text-sm text-muted-foreground">
                  No open topics found for this semester.
                </p>
              )}
              <div className="space-y-1">
                {!topicsLoading &&
                  filteredTopics.map((topic) => {
                    const active = selectedTopic?.id === topic.id
                    const count = topicCounts[topic.id] ?? 0
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => setSelectedTopic(topic)}
                        className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors flex items-center justify-between gap-3 ${
                          active
                            ? 'bg-primary/10'
                            : 'hover:bg-surface-container'
                        }`}
                      >
                        <span className="min-w-0 flex flex-col">
                          <span className="font-sans text-sm text-on-surface line-clamp-2">
                            {topic.title}
                          </span>
                          {lecturerId === undefined && (
                            <span className="font-label text-xs text-muted-foreground mt-0.5">
                              {topic.lecturer.fullName}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 flex items-center gap-2">
                          <span className="font-label text-xs text-muted-foreground">
                            {count} assigned
                          </span>
                          {active && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </span>
                      </button>
                    )
                  })}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="font-label"
              >
                Cancel
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedTopic}
                className="font-label bg-gradient-to-br from-primary to-primary-container text-primary-foreground"
              >
                Next
              </Button>
            </div>
          </>
        ) : (
          <>
            {selectedTopic && (
              <div className="bg-surface-container-low rounded-lg px-3 py-2">
                <span className="font-label text-xs text-muted-foreground uppercase tracking-wide">
                  Topic
                </span>
                <p className="font-sans text-sm font-medium text-on-surface line-clamp-1">
                  {selectedTopic.title}
                </p>
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Search by name or student ID…"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-9 font-sans text-sm"
              />
            </div>

            <ScrollArea className="h-64 -mx-1 px-1">
              {studentsLoading && (
                <p className="py-8 text-center font-sans text-sm text-muted-foreground">
                  Loading students…
                </p>
              )}
              {!studentsLoading && filteredStudents.length === 0 && (
                <p className="py-8 text-center font-sans text-sm text-muted-foreground">
                  No available students found for this semester.
                </p>
              )}
              <div className="space-y-1">
                {!studentsLoading &&
                  filteredStudents.map((item) => {
                    const active =
                      selectedStudent?.enrollmentId === item.enrollmentId
                    return (
                      <button
                        key={item.enrollmentId}
                        type="button"
                        onClick={() => setSelectedStudent(item)}
                        className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors flex items-center justify-between gap-3 ${
                          active
                            ? 'bg-primary/10'
                            : 'hover:bg-surface-container'
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block font-sans text-sm text-on-surface truncate">
                            {item.student.fullName}
                          </span>
                          <span className="block font-label text-xs text-muted-foreground">
                            {item.student.studentId}
                          </span>
                        </span>
                        {active && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </button>
                    )
                  })}
              </div>
            </ScrollArea>

            <div className="flex justify-between gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setStep(1)}
                className="font-label"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!selectedStudent || submitting}
                className="font-label bg-gradient-to-br from-primary to-primary-container text-primary-foreground"
              >
                {submitting ? 'Assigning…' : 'Assign student'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
