import api from '../../lib/axios'

export type TopicStatus = 'OPEN' | 'FULL' | 'CLOSED'

export interface TopicLecturer {
  id: string
  fullName: string
  email: string
  title: string | null
}

export interface TopicItem {
  id: string
  title: string
  description: string | null
  requirements: string | null
  note: string | null
  status: TopicStatus
  createdAt: string
  semesterId: string
  lecturer: TopicLecturer
}

export interface TopicQuery {
  semesterId?: string
  status?: TopicStatus
  lecturerId?: string
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

  get: (id: string) =>
    api.get<TopicItem>(`/topics/${id}`),

  create: (dto: CreateTopicDto) =>
    api.post<TopicItem>('/topics', dto),

  update: (id: string, dto: UpdateTopicDto) =>
    api.patch<TopicItem>(`/topics/${id}`, dto),

  remove: (id: string) =>
    api.delete<void>(`/topics/${id}`),
}
