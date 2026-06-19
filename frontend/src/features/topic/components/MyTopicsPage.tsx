import { useEffect, useState } from 'react'
import { useTopicStore } from '../store/topicStore'
import { useAuthStore } from '../../auth/store/authStore'
import type { TopicItem, CreateTopicDto, UpdateTopicDto } from '../api'
import { extractErrorMessage } from '../api'
import TopicCard from './TopicCard'
import TopicForm from './TopicForm'
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
import { Plus } from 'lucide-react'

export default function MyTopicsPage() {
  const user = useAuthStore((s) => s.user)
  const myLecturerId = user?.lecturer?.id

  const {
    myTopics,
    myLoading,
    myError,
    semesters,
    fetchMyTopics,
    fetchSemesters,
    createTopic,
    updateTopic,
    deleteTopic,
  } = useTopicStore()

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingTopic, setEditingTopic] = useState<TopicItem | undefined>()
  const [prefill, setPrefill] = useState<Partial<CreateTopicDto> | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<TopicItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchSemesters()
    if (myLecturerId !== undefined) {
      fetchMyTopics(myLecturerId)
    }
  }, [])

  const openCreate = () => {
    setFormMode('create')
    setEditingTopic(undefined)
    setPrefill(undefined)
    setFormOpen(true)
  }

  const openEdit = (topic: TopicItem) => {
    setFormMode('edit')
    setEditingTopic(topic)
    setPrefill(undefined)
    setFormOpen(true)
  }

  const openCopy = (topic: TopicItem) => {
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

  const handleSubmit = async (dto: CreateTopicDto | UpdateTopicDto) => {
    if (formMode === 'create') {
      await createTopic(dto as CreateTopicDto)
    } else if (editingTopic) {
      await updateTopic(editingTopic.id, dto as UpdateTopicDto)
    }
    if (myLecturerId !== undefined) fetchMyTopics(myLecturerId)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteTopic(deleteTarget.id)
      setDeleteTarget(null)
      if (myLecturerId !== undefined) fetchMyTopics(myLecturerId)
    } catch (err) {
      setDeleteError(extractErrorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-on-surface">My Topics</h1>
          <p className="font-sans text-sm text-muted-foreground mt-0.5">
            0 / {user?.lecturer?.maxStudents ?? '?'} capacity — full tracking after thesis assignment feature
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          New Topic
        </Button>
      </div>

      {myLoading && (
        <p className="font-sans text-sm text-muted-foreground">Loading your topics…</p>
      )}

      {myError && (
        <p className="font-sans text-sm text-destructive">{myError}</p>
      )}

      {!myLoading && !myError && myTopics.length === 0 && (
        <div className="text-center py-16">
          <p className="font-sans text-base text-muted-foreground">You have no topics yet.</p>
          <Button variant="outline" className="mt-4" onClick={openCreate}>
            Create your first topic
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {myTopics.map((topic) => (
          <TopicCard
            key={topic.id}
            topic={topic}
            myLecturerId={myLecturerId}
            showActions
            onEdit={openEdit}
            onDelete={setDeleteTarget}
            onCopy={openCopy}
            deleteDisabled={false}
          />
        ))}
      </div>

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

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Delete topic?</AlertDialogTitle>
            <AlertDialogDescription className="font-sans">
              "{deleteTarget?.title}" will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="font-sans text-sm text-destructive px-1">{deleteError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
