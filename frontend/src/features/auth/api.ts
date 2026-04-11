import api from '../../lib/axios'
import type { UserProfile } from './store/authStore'

export interface LoginResponse {
  accessToken: string
  user: UserProfile
}

export const authApi = {
  login: (username: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { username, password }),

  refresh: () =>
    api.post<{ accessToken: string }>('/auth/refresh'),

  logout: () =>
    api.post<void>('/auth/logout'),

  me: () =>
    api.get<UserProfile>('/auth/me'),
}
