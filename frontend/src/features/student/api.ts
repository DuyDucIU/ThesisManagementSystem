// frontend/src/features/student/api.ts
import api from '../../lib/axios'

export interface StudentItem {
  id: number
  studentId: string
  fullName: string
  email: string
  hasAccount: boolean
}

export interface StudentQuery {
  search?: string
  hasAccount?: boolean
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

// ─── Error helper ──────────────────────────────────────────────────────────

export { extractErrorMessage } from '../../lib/utils'

// ─── API calls ─────────────────────────────────────────────────────────────

export const studentApi = {
  create: (dto: CreateStudentDto) =>
    api.post<StudentItem>('/students', dto),

  list: (params?: StudentQuery) =>
    api.get<PaginatedStudentResult>('/students', { params }),

  update: (id: number, dto: UpdateStudentDto) =>
    api.patch<StudentItem>(`/students/${id}`, dto),

  remove: (id: number) => api.delete<void>(`/students/${id}`),
}
