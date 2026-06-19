import api from '../../lib/axios'

export type TopicStatus = 'OPEN' | 'FULL' | 'CLOSED'

export interface TopicLecturer {
  id: number
  fullName: string
  email: string
  title: string | null
}

export interface TopicItem {
  id: number
  title: string
  description: string | null
  requirements: string | null
  note: string | null
  status: TopicStatus
  createdAt: string
  semesterId: number
  lecturer: TopicLecturer
}

export interface TopicQuery {
  semesterId?: number
  status?: TopicStatus
  lecturerId?: number
  search?: string
}

export interface CreateTopicDto {
  title: string
  description?: string
  requirements?: string
  note?: string
}

export interface UpdateTopicDto {
  title?: string
  description?: string
  requirements?: string
  note?: string
}

export { extractErrorMessage } from '../../lib/utils'

export const topicApi = {
  list: (params?: TopicQuery) =>
    api.get<TopicItem[]>('/topics', { params }),

  get: (id: number) =>
    api.get<TopicItem>(`/topics/${id}`),

  create: (dto: CreateTopicDto) =>
    api.post<TopicItem>('/topics', dto),

  update: (id: number, dto: UpdateTopicDto) =>
    api.patch<TopicItem>(`/topics/${id}`, dto),

  remove: (id: number) =>
    api.delete<void>(`/topics/${id}`),
}
