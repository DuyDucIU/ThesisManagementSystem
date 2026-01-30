import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import LoginComponent from './component/LoginComponent'
import AdminImportStudentsComponent from './component/AdminImportStudentsComponent'

function App() {

  return (
    <>
    <BrowserRouter>
      <Routes>
        <Route path='/' element = {<LoginComponent />}></Route>
        <Route path='/importStudents' element = {<AdminImportStudentsComponent />}></Route>
      </Routes>
    </BrowserRouter>
    </>
  )
}

export default App
