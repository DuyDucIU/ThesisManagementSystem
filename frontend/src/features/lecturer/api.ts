import api from '../../lib/axios'

export interface LecturerItem {
  id: number
  lecturerId: string
  fullName: string
  email: string
  title: string | null
  maxStudents: number
}

export interface LecturerQuery {
  search?: string
  page?: number
  limit?: number
}

export interface PaginatedLecturerResult {
  data: LecturerItem[]
  total: number
  page: number
  limit: number
}

export interface CreateLecturerDto {
  lecturerId: string
  fullName: string
  email: string
  title?: string
  maxStudents?: number
}

export interface UpdateLecturerDto {
  fullName?: string
  email?: string
  title?: string
  maxStudents?: number
}

// ─── Error helper ──────────────────────────────────────────────────────────

export { extractErrorMessage } from '../../lib/utils'

// ─── API calls ─────────────────────────────────────────────────────────────

export const lecturerApi = {
  create: (dto: CreateLecturerDto) =>
    api.post<LecturerItem>('/lecturers', dto),

  list: (params?: LecturerQuery) =>
    api.get<PaginatedLecturerResult>('/lecturers', { params }),

  get: (id: number) =>
    api.get<LecturerItem>(`/lecturers/${id}`),

  update: (id: number, dto: UpdateLecturerDto) =>
    api.patch<LecturerItem>(`/lecturers/${id}`, dto),

  remove: (id: number) =>
    api.delete<void>(`/lecturers/${id}`),
}
