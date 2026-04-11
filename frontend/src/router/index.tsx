import { createBrowserRouter, Navigate, Outlet } from 'react-router'
import { useAuthStore } from '../features/auth/store/authStore'
import LoginPage from '../features/auth/components/LoginPage'
import AppLayout from '../layouts/AppLayout'

function ProtectedRoute() {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

function PublicRoute() {
  const user = useAuthStore((s) => s.user)
  if (user) return <Navigate to="/" replace />
  return <Outlet />
}

const router = createBrowserRouter([
  {
    element: <PublicRoute />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <ProtectedRoute />,
    children: [{ path: '/', element: <AppLayout /> }],
  },
  { path: '*', element: <Navigate to="/login" replace /> },
])

export default router
