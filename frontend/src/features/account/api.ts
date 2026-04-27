import api from '../../lib/axios'
import type { StudentItem } from '../student/api'
import type { LecturerItem } from '../lecturer/api'

export const accountApi = {
  // ─── Student account actions ──────────────────────────────────────────────

  activateStudent: (id: number) =>
    api.post<StudentItem>(`/students/${id}/activate`),

  toggleStudentAccount: (id: number, isActive: boolean) =>
    api.patch<StudentItem>(`/students/${id}/account`, { isActive }),

  activateStudentsBulk: (ids: number[]) =>
    api.post<{ activated: number; skipped: number }>('/students/activate-bulk', { ids }),

  toggleStudentsAccountBulk: (ids: number[], isActive: boolean) =>
    api.patch<{ updated: number; skipped: number }>('/students/account-bulk', { ids, isActive }),

  // ─── Lecturer account actions ─────────────────────────────────────────────

  toggleLecturerAccount: (id: number, isActive: boolean) =>
    api.patch<LecturerItem>(`/lecturers/${id}/account`, { isActive }),

  toggleLecturersAccountBulk: (ids: number[], isActive: boolean) =>
    api.patch<{ updated: number; skipped: number }>('/lecturers/account-bulk', { ids, isActive }),
}
