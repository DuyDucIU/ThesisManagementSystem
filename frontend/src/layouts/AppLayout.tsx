import { NavLink, useNavigate, Outlet } from 'react-router'
import { useAuthStore } from '../features/auth/store/authStore'
import { authApi } from '../features/auth/api'
import { Button } from '../components/ui/button'

const roleBadgeClass: Record<string, string> = {
  ADMIN: 'bg-primary/10 text-primary',
  LECTURER: 'bg-tertiary/10 text-tertiary',
  STUDENT: 'bg-surface-container-high text-on-surface',
}

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

  const isAdmin = user?.role === 'ADMIN'

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Topbar */}
      <header className="sticky top-0 z-50 backdrop-blur-[12px] bg-surface/80 px-6 py-4 flex items-center justify-between">
        <span className="font-display text-xl font-semibold text-primary">
          Thesis Management System
        </span>
        <div className="flex items-center gap-4">
          <span className="font-sans text-sm text-on-surface">{user?.username}</span>
          {user?.role && (
            <span
              className={`font-label text-xs font-medium px-2.5 py-0.5 rounded-full ${roleBadgeClass[user.role] ?? 'bg-surface-container-high text-on-surface'}`}
            >
              {user.role}
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={handleLogout} className="font-label text-sm">
            Sign out
          </Button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Admin sidebar */}
        {isAdmin && (
          <aside className="w-56 bg-surface-container-highest shrink-0 px-3 py-6">
            <p className="font-label text-xs font-medium text-muted-foreground uppercase tracking-widest px-3 mb-3">
              Administration
            </p>
            <nav className="space-y-0.5">
              <NavLink
                to="/admin/semesters"
                end
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md font-sans text-sm transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-on-surface hover:bg-surface-container'
                  }`
                }
              >
                Semesters
              </NavLink>
              <NavLink
                to="/admin/students"
                end
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md font-sans text-sm transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-on-surface hover:bg-surface-container'
                  }`
                }
              >
                Students
              </NavLink>
              <NavLink
                to="/admin/lecturers"
                end
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md font-sans text-sm transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-on-surface hover:bg-surface-container'
                  }`
                }
              >
                Lecturers
              </NavLink>
              <NavLink
                to="/admin/enrollments"
                end
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md font-sans text-sm transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-on-surface hover:bg-surface-container'
                  }`
                }
              >
                Enrollments
              </NavLink>
              <NavLink
                to="/admin/enrollments/import"
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md font-sans text-sm transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-on-surface hover:bg-surface-container'
                  }`
                }
              >
                Import Enrollments
              </NavLink>
            </nav>
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 p-6 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
