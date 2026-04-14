import { create } from 'zustand'
import { semesterApi } from '../api'
import type { Semester, SemesterQuery } from '../api'

interface SemesterState {
  semesters: Semester[]
  loading: boolean
  error: string | null
  fetchAll: (query?: SemesterQuery) => Promise<void>
}

export const useSemesterStore = create<SemesterState>((set) => ({
  semesters: [],
  loading: false,
  error: null,

  fetchAll: async (query) => {
    set({ loading: true, error: null })
    try {
      const res = await semesterApi.list(query)
      set({ semesters: res.data, loading: false })
    } catch {
      set({ error: 'Failed to load semesters.', loading: false })
    }
  },
}))
