// frontend/src/features/enrollment/api.ts
import api from '../../lib/axios'

// ─── Shared ────────────────────────────────────────────────────────────────

export interface SemesterSummary {
  id: number
  code: string
  name: string
}

// ─── Import types ──────────────────────────────────────────────────────────

export interface ParseRowError {
  row: number
  reason: string
}

export interface AlreadyEnrolledDetail {
  row: number
  studentId: string
  reason: string
}

export interface ParseImportResult {
  semester: SemesterSummary
  total: number
  valid: number
  alreadyEnrolled: number
  invalid: number
  errors: ParseRowError[]
  alreadyEnrolledDetails: AlreadyEnrolledDetail[]
}

export interface SkippedDetail {
  row: number
  studentId: string | null
  reason: string
}

export interface ImportEnrollmentsResult {
  semester: SemesterSummary
  imported: number
  skipped: number
  skippedDetails: SkippedDetail[]
}

// ─── List types ────────────────────────────────────────────────────────────

export type EnrollmentStatus =
  | 'AVAILABLE'
  | 'ASSIGNED'
  | 'COMPLETED'
  | 'FAILED'

export interface EnrollmentStudent {
  id: number
  studentId: string
  fullName: string
  email: string
  hasAccount: boolean
}

export interface EnrollmentItem {
  enrollmentId: number
  status: EnrollmentStatus
  student: EnrollmentStudent
}

export interface EnrollmentQuery {
  semesterId?: number
  status?: EnrollmentStatus
  search?: string
  page?: number
  limit?: number
}

export interface PaginatedEnrollmentResult {
  data: EnrollmentItem[]
  total: number
  page: number
  limit: number
  semester: SemesterSummary
}

// ─── API methods ───────────────────────────────────────────────────────────

export const enrollmentApi = {
  list: (params?: EnrollmentQuery) =>
    api.get<PaginatedEnrollmentResult>('/enrollments', { params }),

  parseImport: (file: File, semesterId?: number) => {
    const form = new FormData()
    form.append('file', file)
    const qs = new URLSearchParams({ action: 'parse' })
    if (semesterId != null) qs.set('semesterId', String(semesterId))
    return api.post<ParseImportResult>(
      `/enrollments/import?${qs.toString()}`,
      form,
    )
  },

  importEnrollments: (file: File, semesterId?: number) => {
    const form = new FormData()
    form.append('file', file)
    const qs = new URLSearchParams({ action: 'import' })
    if (semesterId != null) qs.set('semesterId', String(semesterId))
    return api.post<ImportEnrollmentsResult>(
      `/enrollments/import?${qs.toString()}`,
      form,
    )
  },
}

// ─── Re-export helper for convenience ──────────────────────────────────────

export { extractErrorMessage } from '../student/api'
