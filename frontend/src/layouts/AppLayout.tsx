import { useNavigate, Outlet } from 'react-router'
import { useAuthStore } from '../features/auth/store/authStore'
import { authApi } from '../features/auth/api'
import { Button } from '../components/ui/button'

export default function AppLayout() {
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore — still clear local state
    }
    clearAuth()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-gray-900">Thesis Management System</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {user?.username}{' '}
            <span className="text-xs text-gray-400">({user?.role})</span>
          </span>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Sign out
          </Button>
        </div>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}
