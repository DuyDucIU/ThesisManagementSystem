import { create } from 'zustand'
import { thesisApi, lecturerSemesterApi } from '../api'
import type {
  ThesisItem,
  ThesisQuery,
  CreateThesisDto,
  LecturerSemesterCapacity,
} from '../api'
import { semesterApi } from '../../semester/api'
import type { Semester } from '../../semester/api'

interface ThesisState {
  theses: ThesisItem[]
  loading: boolean
  error: string | null

  capacity: LecturerSemesterCapacity | null

  semesters: Semester[]
  semestersLoading: boolean

  fetchTheses: (query?: ThesisQuery) => Promise<void>
  assignStudent: (dto: CreateThesisDto) => Promise<ThesisItem>
  unassignStudent: (id: number) => Promise<void>
  fetchCapacity: (lecturerId: number, semesterId?: number) => Promise<void>
  fetchSemesters: () => Promise<void>
}

export const useThesisStore = create<ThesisState>((set) => ({
  theses: [],
  loading: false,
  error: null,

  capacity: null,

  semesters: [],
  semestersLoading: false,

  fetchTheses: async (query) => {
    set({ loading: true, error: null })
    try {
      const res = await thesisApi.list(query)
      set({ theses: res.data })
    } catch {
      set({ error: 'Failed to load assignments' })
    } finally {
      set({ loading: false })
    }
  },

  assignStudent: async (dto) => {
    const res = await thesisApi.assign(dto)
    return res.data
  },

  unassignStudent: async (id) => {
    await thesisApi.unassign(id)
  },

  fetchCapacity: async (lecturerId, semesterId?) => {
    try {
      const res = await lecturerSemesterApi.getCapacity(lecturerId, semesterId)
      set({ capacity: res.data })
    } catch {
      set({ capacity: null })
    }
  },

  fetchSemesters: async () => {
    set({ semestersLoading: true })
    try {
      const res = await semesterApi.list()
      set({ semesters: res.data })
    } finally {
      set({ semestersLoading: false })
    }
  },
}))
