import { useEffect, useState } from 'react'
import {BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import './App.css'
import LoginPage from './pages/login'
import DashboardPage from './pages/dashboard'
import apiUri from './api/axios';

function App() {
  const [loading, setLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    apiUri.get('/me').then(() => {
      setIsAuth(true)
    }).catch(() => {
      setIsAuth(false)
    }).finally(() => {
      setLoading(false)
    })
  }, [])

  if (loading) return <p>loading...</p>

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={isAuth ? <Navigate to="/dashboard" /> : <LoginPage/>} />
        <Route path="/dashboard" element={!isAuth ? <Navigate to="/" /> : <DashboardPage setIsAuth={setIsAuth}/>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
