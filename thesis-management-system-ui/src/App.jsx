import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import LoginComponent from './component/LoginComponent'
import AdminImportStudentsComponent from './component/AdminImportStudentsComponent'
import StudentList from './component/StudentList'

function App() {

  return (
    <>
    <BrowserRouter>
      <Routes>
        <Route path='/' element = {<LoginComponent />}></Route>
        <Route path='/importStudents' element = {<AdminImportStudentsComponent />}></Route>
        <Route path="/students" element={<StudentList />}></Route>
      </Routes>
    </BrowserRouter>
    </>
  )
}

export default App
