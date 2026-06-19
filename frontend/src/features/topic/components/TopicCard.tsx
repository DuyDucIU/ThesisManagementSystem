import { Copy, Pencil, Trash2 } from 'lucide-react'
import type { TopicItem } from '../api'
import { Button } from '../../../components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../../../components/ui/tooltip'

const statusColors: Record<string, string> = {
  OPEN: 'bg-primary/10 text-primary',
  FULL: 'bg-tertiary/10 text-tertiary',
  CLOSED: 'bg-surface-container-high text-muted-foreground',
}

interface TopicCardProps {
  topic: TopicItem
  /** Current user's lecturer id, if the user is a lecturer */
  myLecturerId?: number
  /** Called when Copy button clicked — passes the topic as prefill */
  onCopy?: (topic: TopicItem) => void
  /** Called when Edit button clicked (My Topics only) */
  onEdit?: (topic: TopicItem) => void
  /** Called when Delete button clicked (My Topics only) */
  onDelete?: (topic: TopicItem) => void
  /** When true, shows Edit + Delete + Copy (My Topics mode) */
  showActions?: boolean
  /** When true, delete button is disabled (topic has theses) */
  deleteDisabled?: boolean
}

export default function TopicCard({
  topic,
  myLecturerId,
  onCopy,
  onEdit,
  onDelete,
  showActions = false,
  deleteDisabled = false,
}: TopicCardProps) {
  const isOwn = myLecturerId !== undefined && topic.lecturer.id === myLecturerId
  const isLecturer = myLecturerId !== undefined

  return (
    <div className="bg-surface-container rounded-xl p-5 flex flex-col gap-3 hover:bg-surface-container-low transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-sans text-base font-semibold text-on-surface leading-snug flex-1">
          {topic.title}
        </h3>
        <span className={`font-label text-xs font-medium px-2.5 py-0.5 rounded-full shrink-0 ${statusColors[topic.status]}`}>
          {topic.status}
        </span>
      </div>

      {/* Lecturer info */}
      <div className="flex flex-col gap-0.5">
        <span className="font-sans text-sm font-medium text-on-surface">
          {topic.lecturer.fullName}
          {topic.lecturer.title && (
            <span className="text-muted-foreground font-normal"> · {topic.lecturer.title}</span>
          )}
        </span>
        <a
          href={`mailto:${topic.lecturer.email}`}
          className="font-sans text-xs text-primary hover:underline"
        >
          {topic.lecturer.email}
        </a>
      </div>

      {/* Description preview */}
      {topic.description && (
        <p className="font-sans text-sm text-muted-foreground line-clamp-3">
          {topic.description}
        </p>
      )}

      {/* Note */}
      {topic.note && (
        <div className="bg-surface-container-high rounded-lg px-3 py-2">
          <p className="font-sans text-xs text-on-surface italic">{topic.note}</p>
        </div>
      )}

      {/* Actions */}
      {(showActions || isLecturer) && (
        <div className="flex items-center gap-2 pt-1">
          {/* My Topics actions */}
          {showActions && isOwn && (
            <>
              <Button size="sm" variant="outline" onClick={() => onEdit?.(topic)}>
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                Edit
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete?.(topic)}
                      disabled={deleteDisabled}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Delete
                    </Button>
                  </span>
                </TooltipTrigger>
                {deleteDisabled && (
                  <TooltipContent>Cannot delete — topic has assigned theses</TooltipContent>
                )}
              </Tooltip>
            </>
          )}

          {/* Copy — visible to any lecturer on both pages */}
          {isLecturer && (
            <>
              {/* Edit shortcut on bank page for own topics */}
              {!showActions && isOwn && (
                <Button size="sm" variant="outline" onClick={() => onEdit?.(topic)}>
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  Edit
                </Button>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" onClick={() => onCopy?.(topic)}>
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    Copy
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Use as template for a new topic</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      )}
    </div>
  )
}
