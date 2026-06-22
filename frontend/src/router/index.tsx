// frontend/src/router/index.tsx
import { createBrowserRouter, Navigate } from 'react-router'
import { ProtectedRoute, PublicRoute, AdminRoute, LecturerRoute } from './guards'
import LoginPage from '../features/auth/components/LoginPage'
import AppLayout from '../layouts/AppLayout'
import SemesterListPage from '../features/semester/components/SemesterListPage'
import StudentListPage from '../features/student/components/StudentListPage'
import LecturerListPage from '../features/lecturer/components/LecturerListPage'
import EnrollmentListPage from '../features/enrollment/components/EnrollmentListPage'
import EnrollmentImportPage from '../features/enrollment/components/EnrollmentImportPage'
import AccountManagementPage from '../features/account/components/AccountManagementPage'
import TopicsBankPage from '../features/topic/components/TopicsBankPage'
import MyTopicsPage from '../features/topic/components/MyTopicsPage'
import MyAssignmentsPage from '../features/thesis/components/MyAssignmentsPage'
import AdminAssignmentsPage from '../features/thesis/components/AdminAssignmentsPage'

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
          { path: '/', element: <Navigate to="/topics" replace /> },
          { path: '/topics', element: <TopicsBankPage /> },
          {
            element: <AdminRoute />,
            children: [
              { path: '/admin/semesters', element: <SemesterListPage /> },
              { path: '/admin/students', element: <StudentListPage /> },
              { path: '/admin/lecturers', element: <LecturerListPage /> },
              { path: '/admin/accounts', element: <AccountManagementPage /> },
              { path: '/admin/enrollments', element: <EnrollmentListPage /> },
              { path: '/admin/assignments', element: <AdminAssignmentsPage /> },
              { path: '/admin/enrollments/import', element: <EnrollmentImportPage /> },
            ],
          },
          {
            element: <LecturerRoute />,
            children: [
              { path: '/my-topics', element: <MyTopicsPage /> },
              { path: '/my-assignments', element: <MyAssignmentsPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/login" replace /> },
])

export default router
