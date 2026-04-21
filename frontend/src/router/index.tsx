import { createBrowserRouter, Navigate } from 'react-router'
import { ProtectedRoute, PublicRoute, AdminRoute } from './guards'
import LoginPage from '../features/auth/components/LoginPage'
import AppLayout from '../layouts/AppLayout'
import SemesterListPage from '../features/semester/components/SemesterListPage'
import StudentImportPage from '../features/student/components/StudentImportPage'

const router = createBrowserRouter([
  {
    element: <PublicRoute />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <Navigate to="/admin/semesters" replace /> },
          {
            element: <AdminRoute />,
            children: [
              { path: '/admin/semesters', element: <SemesterListPage /> },
              { path: '/admin/students/import', element: <StudentImportPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/login" replace /> },
])

export default router
