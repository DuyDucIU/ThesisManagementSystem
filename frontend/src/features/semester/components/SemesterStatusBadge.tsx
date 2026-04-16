import type { SemesterStatus } from '../api'

const styles: Record<SemesterStatus, string> = {
  INACTIVE: 'bg-[#aac7ff] text-on-surface',
  ACTIVE: 'bg-[#aac7ff] text-on-surface',
  CLOSED: 'bg-surface-container-highest text-muted-foreground',
}

const labels: Record<SemesterStatus, string> = {
  INACTIVE: 'Inactive',
  ACTIVE: 'Active',
  CLOSED: 'Closed',
}

interface Props {
  status: SemesterStatus
}

export default function SemesterStatusBadge({ status }: Props) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-label text-xs font-bold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  )
}
