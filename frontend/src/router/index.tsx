// frontend/src/router/index.tsx
import { createBrowserRouter, Navigate } from 'react-router'
import { ProtectedRoute, PublicRoute, AdminRoute } from './guards'
import LoginPage from '../features/auth/components/LoginPage'
import AppLayout from '../layouts/AppLayout'
import SemesterListPage from '../features/semester/components/SemesterListPage'
import StudentListPage from '../features/student/components/StudentListPage'
import LecturerListPage from '../features/lecturer/components/LecturerListPage'
import EnrollmentListPage from '../features/enrollment/components/EnrollmentListPage'
import EnrollmentImportPage from '../features/enrollment/components/EnrollmentImportPage'

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
              { path: '/admin/students', element: <StudentListPage /> },
              { path: '/admin/lecturers', element: <LecturerListPage /> },
              { path: '/admin/enrollments', element: <EnrollmentListPage /> },
              { path: '/admin/enrollments/import', element: <EnrollmentImportPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/login" replace /> },
])

export default router
