import type { SemesterStatus } from '../api'

const styles: Record<SemesterStatus, string> = {
  INACTIVE: 'bg-surface-container-high text-on-surface',
  ACTIVE: 'bg-primary/10 text-primary',
  CLOSED: 'bg-tertiary/10 text-tertiary',
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
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-label text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  )
}
