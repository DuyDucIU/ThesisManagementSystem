import { create } from 'zustand'
import { lecturerApi } from '../api'
import type { LecturerItem, LecturerQuery } from '../api'

interface LecturerState {
  lecturers: LecturerItem[]
  total: number
  page: number
  loading: boolean
  error: string | null
  fetchAll: (query?: LecturerQuery) => Promise<void>
}

export const useLecturerStore = create<LecturerState>((set) => ({
  lecturers: [],
  total: 0,
  page: 1,
  loading: false,
  error: null,

  fetchAll: async (query) => {
    set({ loading: true, error: null })
    try {
      const res = await lecturerApi.list(query)
      set({
        lecturers: res.data.data,
        total: res.data.total,
        page: res.data.page,
        loading: false,
      })
    } catch {
      set({ error: 'Failed to load lecturers.', loading: false })
    }
  },
}))
