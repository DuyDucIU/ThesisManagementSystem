import { create } from 'zustand'
import { topicApi } from './api'
import type { TopicItem, TopicQuery, CreateTopicDto, UpdateTopicDto } from './api'
import { semesterApi } from '../semester/api'
import type { Semester } from '../semester/api'

interface TopicState {
  // Topics Bank
  bankTopics: TopicItem[]
  bankLoading: boolean
  bankError: string | null

  // My Topics
  myTopics: TopicItem[]
  myLoading: boolean
  myError: string | null

  // Shared semester list for filter dropdowns
  semesters: Semester[]
  semestersLoading: boolean

  fetchBankTopics: (query?: TopicQuery) => Promise<void>
  fetchMyTopics: (lecturerId: number, semesterId?: number) => Promise<void>
  fetchSemesters: () => Promise<void>
  createTopic: (dto: CreateTopicDto) => Promise<TopicItem>
  updateTopic: (id: number, dto: UpdateTopicDto) => Promise<TopicItem>
  deleteTopic: (id: number) => Promise<void>
}

export const useTopicStore = create<TopicState>((set) => ({
  bankTopics: [],
  bankLoading: false,
  bankError: null,

  myTopics: [],
  myLoading: false,
  myError: null,

  semesters: [],
  semestersLoading: false,

  fetchBankTopics: async (query) => {
    set({ bankLoading: true, bankError: null })
    try {
      const res = await topicApi.list(query)
      set({ bankTopics: res.data })
    } catch {
      set({ bankError: 'Failed to load topics' })
    } finally {
      set({ bankLoading: false })
    }
  },

  fetchMyTopics: async (lecturerId, semesterId) => {
    set({ myLoading: true, myError: null })
    try {
      const res = await topicApi.list({ lecturerId, semesterId })
      set({ myTopics: res.data })
    } catch {
      set({ myError: 'Failed to load your topics' })
    } finally {
      set({ myLoading: false })
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

  createTopic: async (dto) => {
    const res = await topicApi.create(dto)
    return res.data
  },

  updateTopic: async (id, dto) => {
    const res = await topicApi.update(id, dto)
    return res.data
  },

  deleteTopic: async (id) => {
    await topicApi.remove(id)
  },
}))
