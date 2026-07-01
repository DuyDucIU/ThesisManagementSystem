import type { ThesisStatus } from './api'

export const STATUS_VALUES: ThesisStatus[] = [
  'IN_PROGRESS',
  'SUBMITTED',
  'APPROVED',
  'UNDER_REVIEW',
  'REVIEWED',
]

export const statusBadgeClass: Record<ThesisStatus, string> = {
  IN_PROGRESS: 'bg-primary/10 text-primary',
  SUBMITTED: 'bg-tertiary/10 text-tertiary',
  UNDER_REVIEW: 'bg-tertiary/10 text-tertiary',
  REVIEWED: 'bg-surface-container-high text-on-surface',
  APPROVED: 'bg-primary/10 text-primary',
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
