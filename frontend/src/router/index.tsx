import { createBrowserRouter, Navigate } from 'react-router'
import { ProtectedRoute, PublicRoute } from './guards'
import LoginPage from '../features/auth/components/LoginPage'
import AppLayout from '../layouts/AppLayout'

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
