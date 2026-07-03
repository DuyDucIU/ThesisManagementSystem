import api from '../../lib/axios'

// ─── Thesis types ─────────────────────────────────────────────────────────

export type ThesisStatus =
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'UNDER_REVIEW'
  | 'REVIEWED'

export interface ThesisStudent {
  id: string
  studentId: string
  fullName: string
}

export interface ThesisTopic {
  id: string
  title: string
}

export interface ThesisItem {
  id: string
  title: string
  status: ThesisStatus
  createdAt: string
  topic: ThesisTopic
  student: ThesisStudent
  enrollment: { id: string; semesterId: string }
}

export interface ThesisQuery {
  semesterId?: string
  status?: ThesisStatus
  lecturerId?: string
  topicId?: string
}

export interface CreateThesisDto {
  enrollmentId: string
  topicId: string
}

// ─── Lecturer-Semester types ──────────────────────────────────────────────

export interface LecturerSemesterItem {
  lecturerId: string
  semesterId: string
  maxStudents: number
  lecturer: { id: string; fullName: string; email: string }
}

export interface LecturerSemesterCapacity {
  lecturerId: string
  semesterId: string
  maxStudents: number
}

export interface UpsertLecturerSemesterDto {
  semesterId: string
  maxStudents: number
}

// ─── API methods ──────────────────────────────────────────────────────────

export const thesisApi = {
  list: (params?: ThesisQuery) =>
    api.get<ThesisItem[]>('/theses', { params }),

  get: (id: string) =>
    api.get<ThesisItem>(`/theses/${id}`),

  assign: (dto: CreateThesisDto) =>
    api.post<ThesisItem>('/theses', dto),

  unassign: (id: string) =>
    api.delete<void>(`/theses/${id}`),
}

export const lecturerSemesterApi = {
  list: (semesterId?: string) =>
    api.get<LecturerSemesterItem[]>('/lecturer-semesters', {
      params: semesterId ? { semesterId } : undefined,
    }),

  upsert: (lecturerId: string, dto: UpsertLecturerSemesterDto) =>
    api.patch<LecturerSemesterCapacity>(
      `/lecturer-semesters/${lecturerId}`,
      dto,
    ),

  getCapacity: (lecturerId: string, semesterId?: string) =>
    api.get<LecturerSemesterCapacity>(
      `/lecturer-semesters/capacity/${lecturerId}`,
      { params: semesterId ? { semesterId } : undefined },
    ),
}

export { extractErrorMessage } from '../../lib/utils'
