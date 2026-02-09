import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import LoginComponent from './component/LoginComponent'
import AdminImportStudentsComponent from './component/AdminImportStudents'
import StudentList from './component/StudentList'
import MainLayout from './layout/MainLayout'
import AdminLayout from './layout/AdminLayout'
import LecturerLayout from './layout/LecturerLayout'
import UnassignedStudentList from './component/UnassignedStudentList'
import AdminSemester from './component/AdminSemester'

function App() {

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path='/' element={<LoginComponent />}></Route>
            {/* ADMIN */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route path='import' element={<AdminImportStudentsComponent />}></Route>
              <Route path="students" element={<StudentList />}></Route>
              <Route path="semesters" element={<AdminSemester />}></Route>
            </Route>

            {/* LECTURER */}
            <Route path="/lecturer" element={<LecturerLayout />}>
              <Route path="unassigned-students" element={<UnassignedStudentList />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
