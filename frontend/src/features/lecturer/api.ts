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

export function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const data = (err as { response: { data: { message: unknown } } })
      .response?.data
    if (Array.isArray(data?.message)) return data.message.join(', ')
    if (typeof data?.message === 'string') return data.message
  }
  return 'An unexpected error occurred.'
}

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
