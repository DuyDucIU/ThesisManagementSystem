// frontend/src/features/enrollment/store/enrollmentStore.ts
import { create } from 'zustand'
import { enrollmentApi } from '../api'
import type {
  EnrollmentItem,
  EnrollmentQuery,
  SemesterSummary,
} from '../api'

interface EnrollmentState {
  enrollments: EnrollmentItem[]
  total: number
  page: number
  currentSemester: SemesterSummary | null
  loading: boolean
  error: string | null
  fetchAll: (query?: EnrollmentQuery) => Promise<void>
}

export const useEnrollmentStore = create<EnrollmentState>((set) => ({
  enrollments: [],
  total: 0,
  page: 1,
  currentSemester: null,
  loading: false,
  error: null,

  fetchAll: async (query) => {
    set({ loading: true, error: null })
    try {
      const res = await enrollmentApi.list(query)
      set({
        enrollments: res.data.data,
        total: res.data.total,
        page: res.data.page,
        currentSemester: res.data.semester,
        loading: false,
      })
    } catch {
      set({ error: 'Failed to load enrollments.', loading: false })
    }
  },
}))
