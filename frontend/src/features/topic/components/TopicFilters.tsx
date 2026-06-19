import { TopicStatus, TopicQuery } from '../api'
import { Semester } from '../../semester/api'
import { Input } from '../../../components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select'

const STATUSES: TopicStatus[] = ['OPEN', 'FULL', 'CLOSED']

const statusColors: Record<TopicStatus, string> = {
  OPEN: 'bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer',
  FULL: 'bg-tertiary/10 text-tertiary hover:bg-tertiary/20 cursor-pointer',
  CLOSED:
    'bg-surface-container-high text-muted-foreground hover:bg-surface-container cursor-pointer',
}

interface TopicFiltersProps {
  filters: TopicQuery
  semesters: Semester[]
  onChange: (filters: TopicQuery) => void
}

export default function TopicFilters({
  filters,
  semesters,
  onChange,
}: TopicFiltersProps) {
  const toggleStatus = (s: TopicStatus) => {
    onChange({ ...filters, status: filters.status === s ? undefined : s })
  }

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Semester picker */}
      <Select
        value={filters.semesterId?.toString() ?? 'active'}
        onValueChange={(val) =>
          onChange({
            ...filters,
            semesterId: val === 'active' ? undefined : Number(val),
          })
        }
      >
        <SelectTrigger className="w-52 font-sans text-sm">
          <SelectValue placeholder="Active semester" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Active semester</SelectItem>
          {semesters.map((sem) => (
            <SelectItem key={sem.id} value={sem.id.toString()}>
              {sem.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status toggles */}
      <div className="flex gap-1.5">
        {STATUSES.map((s) => (
          <span
            key={s}
            onClick={() => toggleStatus(s)}
            className={`font-label text-xs font-medium px-2.5 py-1 rounded-full border transition-all select-none ${
              filters.status === s
                ? statusColors[s] + ' ring-2 ring-offset-1 ring-current'
                : statusColors[s] + ' opacity-60'
            }`}
          >
            {s}
          </span>
        ))}
      </div>

      {/* Search */}
      <Input
        placeholder="Search by title..."
        value={filters.search ?? ''}
        onChange={(e) =>
          onChange({ ...filters, search: e.target.value || undefined })
        }
        className="w-56 font-sans text-sm"
      />
    </div>
  )
}
