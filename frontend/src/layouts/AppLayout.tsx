import { NavLink, useNavigate, Outlet } from 'react-router'
import { useAuthStore } from '../features/auth/store/authStore'
import { authApi } from '../features/auth/api'
import { Button } from '../components/ui/button'

const roleBadgeClass: Record<string, string> = {
  ADMIN: 'bg-primary/10 text-primary',
  LECTURER: 'bg-tertiary/10 text-tertiary',
  STUDENT: 'bg-surface-container-high text-on-surface',
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block px-3 py-2 rounded-md font-sans text-sm transition-colors ${
    isActive
      ? 'bg-primary/10 text-primary font-medium'
      : 'text-on-surface hover:bg-surface-container'
  }`

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
  const isLecturer = user?.role === 'LECTURER'
  const isStudent = user?.role === 'STUDENT'

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
        {/* Sidebar */}
        <aside className="w-56 bg-surface-container-highest shrink-0 px-3 py-6">
          {/* Shared: Topics Bank — visible to all roles */}
          <p className="font-label text-xs font-medium text-muted-foreground uppercase tracking-widest px-3 mb-3">
            Topics
          </p>
          <nav className="space-y-0.5 mb-6">
            <NavLink to="/topics" end className={navLinkClass}>
              Topics Bank
            </NavLink>
            {isLecturer && (
              <NavLink to="/my-topics" end className={navLinkClass}>
                My Topics
              </NavLink>
            )}
            {isLecturer && (
              <NavLink to="/my-assignments" end className={navLinkClass}>
                My Assignments
              </NavLink>
            )}
          </nav>

          {/* Admin-only section */}
          {isAdmin && (
            <>
              <p className="font-label text-xs font-medium text-muted-foreground uppercase tracking-widest px-3 mb-3">
                Administration
              </p>
              <nav className="space-y-0.5">
                <NavLink to="/admin/semesters" end className={navLinkClass}>Semesters</NavLink>
                <NavLink to="/admin/students" end className={navLinkClass}>Students</NavLink>
                <NavLink to="/admin/lecturers" end className={navLinkClass}>Lecturers</NavLink>
                <NavLink to="/admin/accounts" end className={navLinkClass}>Accounts</NavLink>
                <NavLink to="/admin/enrollments" end className={navLinkClass}>Enrollments</NavLink>
                <NavLink to="/admin/assignments" end className={navLinkClass}>Topic Assignments</NavLink>
                <NavLink to="/admin/enrollments/import" className={navLinkClass}>Import Enrollments</NavLink>
              </nav>
            </>
          )}

          {/* Student-only section — placeholder for future student features */}
          {isStudent && (
            <p className="font-label text-xs text-muted-foreground px-3">
              Browse topics and contact lecturers via email.
            </p>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
