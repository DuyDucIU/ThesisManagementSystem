import { useEffect, useState } from 'react'
import { RouterProvider } from 'react-router'
import axios from 'axios'
import router from './router'
import { useAuthStore } from './features/auth/store/authStore'
import type { UserProfile } from './features/auth/store/authStore'

export default function App() {
  const [ready, setReady] = useState(false)
  const setAuth = useAuthStore((s) => s.setAuth)

  useEffect(() => {
    const restoreSession = async () => {
      try {
        // Use raw axios so we don't go through the store interceptor during init
        const refreshRes = await axios.post<{ accessToken: string }>(
          '/api/auth/refresh',
          {},
          { withCredentials: true },
        )
        const { accessToken } = refreshRes.data

        const meRes = await axios.get<UserProfile>('/api/auth/me', {
          withCredentials: true,
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        setAuth(meRes.data, accessToken)
      } catch {
        // No active session — user will see login page
      } finally {
        setReady(true)
      }
    }

    restoreSession()
  }, [setAuth])

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-400 text-sm">
        Loading…
      </div>
    )
  }

  return <RouterProvider router={router} />
}
