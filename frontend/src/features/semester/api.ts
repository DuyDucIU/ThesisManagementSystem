import api from '../../lib/axios'

export type SemesterStatus = 'INACTIVE' | 'ACTIVE' | 'CLOSED'

export interface Semester {
  id: number
  code: string
  name: string
  startDate: string   // ISO string — use toDateInput() to get YYYY-MM-DD
  endDate: string     // ISO string
  status: SemesterStatus
  createdAt: string
  updatedAt: string
}

export interface SemesterQuery {
  search?: string
  status?: SemesterStatus
  startDateFrom?: string  // YYYY-MM-DD
  startDateTo?: string    // YYYY-MM-DD
}

export interface CreateSemesterDto {
  code: string
  name: string
  startDate: string   // YYYY-MM-DD
  endDate: string     // YYYY-MM-DD
}

export interface UpdateSemesterDto {
  code?: string
  name?: string
  startDate?: string
  endDate?: string
}

/** Extract YYYY-MM-DD from an ISO datetime string. */
export function toDateInput(isoString: string): string {
  return isoString.slice(0, 10)
}

/** Extract a human-readable error message from an Axios error. */
export function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const data = (err as { response: { data: { message: unknown } } }).response?.data
    if (Array.isArray(data?.message)) return data.message.join(', ')
    if (typeof data?.message === 'string') return data.message
  }
  return 'An unexpected error occurred.'
}

export const semesterApi = {
  list: (params?: SemesterQuery) =>
    api.get<Semester[]>('/semesters', { params }),

  get: (id: number) =>
    api.get<Semester>(`/semesters/${id}`),

  create: (dto: CreateSemesterDto) =>
    api.post<Semester>('/semesters', dto),

  update: (id: number, dto: UpdateSemesterDto) =>
    api.patch<Semester>(`/semesters/${id}`, dto),

  remove: (id: number) =>
    api.delete<void>(`/semesters/${id}`),

  activate: (id: number) =>
    api.post<Semester>(`/semesters/${id}/activate`),

  deactivate: (id: number) =>
    api.post<Semester>(`/semesters/${id}/deactivate`),

  close: (id: number) =>
    api.post<Semester>(`/semesters/${id}/close`),
}
