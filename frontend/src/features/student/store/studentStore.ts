// frontend/src/features/student/store/studentStore.ts
import { create } from 'zustand'
import { studentApi } from '../api'
import type { StudentItem, StudentQuery } from '../api'

interface StudentState {
  students: StudentItem[]
  total: number
  page: number
  loading: boolean
  fetchAll: (query?: StudentQuery) => Promise<void>
}

export const useStudentStore = create<StudentState>((set) => ({
  students: [],
  total: 0,
  page: 1,
  loading: false,

  fetchAll: async (query) => {
    set({ loading: true })
    try {
      const res = await studentApi.list(query)
      set({
        students: res.data.data,
        total: res.data.total,
        page: res.data.page,
        loading: false,
      })
    } catch {
      set({ loading: false })
    }
  },
}))
