import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import LoginComponent from './component/LoginComponent'
import AdminImportStudentsComponent from './component/AdminImportStudentsComponent'
import StudentList from './component/StudentList'
import MainLayout from './layout/MainLayout'
import AdminLayout from './layout/AdminLayout'

function App() {

  return (
    <>
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout/>}>
          <Route path='/' element = {<LoginComponent />}></Route>
          <Route  path="/admin" element={<AdminLayout/>}>
            <Route path='import' element = {<AdminImportStudentsComponent />}></Route>
            <Route path="students" element={<StudentList />}></Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
    </>
  )
}

export default App
