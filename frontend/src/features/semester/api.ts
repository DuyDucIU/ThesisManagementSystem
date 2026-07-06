import api from '../../lib/axios'

export type SemesterStatus = 'INACTIVE' | 'ACTIVE' | 'CLOSED'

export interface Semester {
  id: string
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

export { extractErrorMessage } from '../../lib/utils'

export const semesterApi = {
  list: (params?: SemesterQuery) =>
    api.get<Semester[]>('/semesters', { params }),

  get: (id: string) =>
    api.get<Semester>(`/semesters/${id}`),

  create: (dto: CreateSemesterDto) =>
    api.post<Semester>('/semesters', dto),

  update: (id: string, dto: UpdateSemesterDto) =>
    api.patch<Semester>(`/semesters/${id}`, dto),

  remove: (id: string) =>
    api.delete<void>(`/semesters/${id}`),

  activate: (id: string) =>
    api.post<Semester>(`/semesters/${id}/activate`),

  deactivate: (id: string) =>
    api.post<Semester>(`/semesters/${id}/deactivate`),

  close: (id: string) =>
    api.post<Semester>(`/semesters/${id}/close`),
}
