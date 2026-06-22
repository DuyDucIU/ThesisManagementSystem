import { useEffect, useState, useCallback } from 'react'
import { useTopicStore } from '../store/topicStore'
import { useAuthStore } from '../../auth/store/authStore'
import type { TopicItem, TopicQuery, CreateTopicDto, UpdateTopicDto } from '../api'
import TopicCard from './TopicCard'
import TopicFilters from './TopicFilters'
import TopicForm from './TopicForm'

export default function TopicsBankPage() {
  const user = useAuthStore((s) => s.user)

  const {
    bankTopics,
    bankLoading,
    bankError,
    semesters,
    fetchBankTopics,
    fetchSemesters,
    createTopic,
    updateTopic,
  } = useTopicStore()

  const [filters, setFilters] = useState<TopicQuery>({})
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingTopic, setEditingTopic] = useState<TopicItem | undefined>()
  const [prefill, setPrefill] = useState<Partial<CreateTopicDto> | undefined>()

  const isLecturer = user?.role === 'LECTURER'
  const myLecturerId = user?.lecturer?.id
  const isStudent = user?.role === 'STUDENT'
  const studentInfo = isStudent && user?.student
    ? { fullName: user.fullName ?? user.username, studentId: user.student.studentId }
    : null

  useEffect(() => {
    fetchSemesters()
    fetchBankTopics(filters)
  }, [])

  const handleFilterChange = useCallback((newFilters: TopicQuery) => {
    setFilters(newFilters)
    fetchBankTopics(newFilters)
  }, [fetchBankTopics])

  const handleCopy = (topic: TopicItem) => {
    setFormMode('create')
    setEditingTopic(undefined)
    setPrefill({
      title: topic.title,
      description: topic.description ?? undefined,
      requirements: topic.requirements ?? undefined,
      note: topic.note ?? undefined,
    })
    setFormOpen(true)
  }

  const handleEdit = (topic: TopicItem) => {
    setFormMode('edit')
    setEditingTopic(topic)
    setPrefill(undefined)
    setFormOpen(true)
  }

  const handleSubmit = async (dto: CreateTopicDto | UpdateTopicDto) => {
    if (formMode === 'edit' && editingTopic) {
      await updateTopic(editingTopic.id, dto as UpdateTopicDto)
    } else {
      await createTopic(dto as CreateTopicDto)
    }
    fetchBankTopics(filters)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-on-surface">Topics Bank</h1>
      </div>

      <TopicFilters
        filters={filters}
        semesters={semesters}
        onChange={handleFilterChange}
      />

      {bankLoading && (
        <p className="font-sans text-sm text-muted-foreground">Loading topics…</p>
      )}

      {bankError && (
        <p className="font-sans text-sm text-destructive">{bankError}</p>
      )}

      {!bankLoading && !bankError && bankTopics.length === 0 && (
        <div className="text-center py-16">
          <p className="font-sans text-base text-muted-foreground">No topics found for this semester.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {bankTopics.map((topic) => (
          <TopicCard
            key={topic.id}
            topic={topic}
            myLecturerId={myLecturerId}
            student={studentInfo}
            onCopy={isLecturer ? handleCopy : undefined}
            onEdit={isLecturer ? handleEdit : undefined}
          />
        ))}
      </div>

      {isLecturer && (
        <TopicForm
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open)
            if (!open) {
              setPrefill(undefined)
              setEditingTopic(undefined)
            }
          }}
          mode={formMode}
          topic={editingTopic}
          prefill={prefill}
          semesters={semesters}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}
