import { useState, useEffect, useRef } from 'react'
import { topicApi } from '../api'
import type { TopicItem } from '../api'
import type { Semester } from '../../semester/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select'
import { Input } from '../../../components/ui/input'
import { ScrollArea } from '../../../components/ui/scroll-area'

interface TopicPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  semesters: Semester[]
  onSelect: (topic: TopicItem) => void
}

export default function TopicPickerDialog({
  open,
  onOpenChange,
  semesters,
  onSelect,
}: TopicPickerDialogProps) {
  const [semesterId, setSemesterId] = useState<string | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [topics, setTopics] = useState<TopicItem[]>([])
  const [loading, setLoading] = useState(false)

  const isFirstRender = useRef(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) {
      isFirstRender.current = true
      return
    }

    const fetch = () => {
      setLoading(true)
      topicApi
        .list({ semesterId, search: search || undefined })
        .then((res) => setTopics(res.data))
        .catch(() => setTopics([]))
        .finally(() => setLoading(false))
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (isFirstRender.current) {
      isFirstRender.current = false
      fetch()
      return
    }

    debounceRef.current = setTimeout(() => fetch(), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [open, semesterId, search])

  const handleSelect = (topic: TopicItem) => {
    onSelect(topic)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            Choose a topic to copy
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mt-2">
          <Select
            value={semesterId ?? 'all'}
            onValueChange={(val) =>
              setSemesterId(val === 'all' ? undefined : val)
            }
          >
            <SelectTrigger className="w-48 font-sans text-sm">
              <SelectValue placeholder="All semesters" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All semesters</SelectItem>
              {semesters.map((sem) => (
                <SelectItem key={sem.id} value={sem.id}>
                  {sem.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Search title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 font-sans text-sm"
          />
        </div>

        <ScrollArea className="h-80 mt-3">
          {loading && (
            <p className="font-sans text-sm text-muted-foreground text-center py-8">
              Loading…
            </p>
          )}
          {!loading && topics.length === 0 && (
            <p className="font-sans text-sm text-muted-foreground text-center py-8">
              No topics found.
            </p>
          )}
          <div className="flex flex-col gap-2 pr-3">
            {topics.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => handleSelect(topic)}
                className="text-left p-3 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors"
              >
                <p className="font-sans text-sm font-medium text-on-surface">
                  {topic.title}
                </p>
                <p className="font-label text-xs text-muted-foreground mt-0.5">
                  {topic.lecturer.fullName}
                </p>
              </button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
