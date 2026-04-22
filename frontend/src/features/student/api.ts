// frontend/src/features/student/api.ts
import api from '../../lib/axios'

// ─── Import feature types (unchanged) ─────────────────────────────────────

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

export interface ImportStudentsResult {
  imported: number
  skipped: number
  skippedDetails: SkippedDetail[]
}

// ─── Management feature types ──────────────────────────────────────────────

export type SemesterStudentStatus = 'AVAILABLE' | 'ASSIGNED' | 'COMPLETED' | 'FAILED'

export interface StudentItem {
  id: number
  studentId: string
  fullName: string
  email: string
  hasAccount: boolean
  semesterStudent?: { status: SemesterStudentStatus } | null
}

export interface StudentQuery {
  search?: string
  hasAccount?: boolean
  semesterId?: number
  page?: number
  limit?: number
}

export interface PaginatedStudentResult {
  data: StudentItem[]
  total: number
  page: number
  limit: number
}

export interface UpdateStudentDto {
  fullName?: string
  email?: string
  studentId?: string
}

export interface CreateStudentDto {
  studentId: string
  fullName: string
  email: string
}

// ─── Error helper (shared) ─────────────────────────────────────────────────

export function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const data = (err as { response: { data: { message: unknown } } }).response?.data
    if (Array.isArray(data?.message)) return data.message.join(', ')
    if (typeof data?.message === 'string') return data.message
  }
  return 'An unexpected error occurred.'
}

// ─── API calls ─────────────────────────────────────────────────────────────

export const studentApi = {
  parseImport: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<ParseImportResult>('/students/import?action=parse', form)
  },

  importStudents: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<ImportStudentsResult>('/students/import?action=import', form)
  },

  create: (dto: CreateStudentDto) =>
    api.post<StudentItem>('/students', dto),

  list: (params?: StudentQuery) =>
    api.get<PaginatedStudentResult>('/students', { params }),

  update: (id: number, dto: UpdateStudentDto) =>
    api.patch<StudentItem>(`/students/${id}`, dto),

  remove: (id: number) =>
    api.delete<void>(`/students/${id}`),
}
