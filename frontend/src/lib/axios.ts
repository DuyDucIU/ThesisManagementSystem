import axios from 'axios'
import { useAuthStore } from '../features/auth/store/authStore'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

// Attach access token from store to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On 401: attempt silent refresh, retry original request once
let isRefreshing = false
let waitQueue: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

function drainQueue(err: unknown, token: string | null) {
  waitQueue.forEach((p) => (err ? p.reject(err) : p.resolve(token!)))
  waitQueue = []
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    const is401 = error.response?.status === 401
    const isRefreshEndpoint = original?.url?.includes('/auth/refresh')
    const alreadyRetried = original?._retry === true

    if (!is401 || isRefreshEndpoint || alreadyRetried) {
      return Promise.reject(error)
    }

    // Queue requests that arrive while a refresh is in progress
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        waitQueue.push({ resolve, reject })
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      })
    }

    original._retry = true
    isRefreshing = true

    try {
      const res = await api.post<{ accessToken: string }>('/auth/refresh')
      const { accessToken } = res.data
      useAuthStore.getState().setAccessToken(accessToken)
      original.headers.Authorization = `Bearer ${accessToken}`
      drainQueue(null, accessToken)
      return api(original)
    } catch (refreshError) {
      drainQueue(refreshError, null)
      useAuthStore.getState().clearAuth()
      window.location.href = '/login'
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

export default api
