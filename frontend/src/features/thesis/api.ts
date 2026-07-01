import api from '../../lib/axios'

// ─── Thesis types ─────────────────────────────────────────────────────────

export type ThesisStatus =
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'UNDER_REVIEW'
  | 'REVIEWED'

export interface ThesisStudent {
  id: number
  studentId: string
  fullName: string
}

export interface ThesisTopic {
  id: number
  title: string
}

export interface ThesisItem {
  id: number
  title: string
  status: ThesisStatus
  createdAt: string
  topic: ThesisTopic
  student: ThesisStudent
  enrollment: { id: number; semesterId: number }
}

export interface ThesisQuery {
  semesterId?: number
  status?: ThesisStatus
  lecturerId?: number
  topicId?: number
}

export interface CreateThesisDto {
  enrollmentId: number
  topicId: number
}

// ─── Lecturer-Semester types ──────────────────────────────────────────────

export interface LecturerSemesterItem {
  lecturerId: number
  semesterId: number
  maxStudents: number
  lecturer: { id: number; fullName: string; email: string }
}

export interface LecturerSemesterCapacity {
  lecturerId: number
  semesterId: number
  maxStudents: number
}

export interface UpsertLecturerSemesterDto {
  semesterId: number
  maxStudents: number
}

// ─── API methods ──────────────────────────────────────────────────────────

export const thesisApi = {
  list: (params?: ThesisQuery) =>
    api.get<ThesisItem[]>('/theses', { params }),

  get: (id: number) =>
    api.get<ThesisItem>(`/theses/${id}`),

  assign: (dto: CreateThesisDto) =>
    api.post<ThesisItem>('/theses', dto),

  unassign: (id: number) =>
    api.delete<void>(`/theses/${id}`),
}

export const lecturerSemesterApi = {
  list: (semesterId?: number) =>
    api.get<LecturerSemesterItem[]>('/lecturer-semesters', {
      params: semesterId ? { semesterId } : undefined,
    }),

  upsert: (lecturerId: number, dto: UpsertLecturerSemesterDto) =>
    api.patch<LecturerSemesterCapacity>(
      `/lecturer-semesters/${lecturerId}`,
      dto,
    ),

  getCapacity: (lecturerId: number, semesterId?: number) =>
    api.get<LecturerSemesterCapacity>(
      `/lecturer-semesters/capacity/${lecturerId}`,
      { params: semesterId ? { semesterId } : undefined },
    ),
}

export { extractErrorMessage } from '../../lib/utils'
