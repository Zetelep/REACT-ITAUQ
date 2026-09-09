import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import AuthForm from './components/AuthForm'
import Home from './pages/Home'
import LandingPage from './pages/LandingPage'
import { useAuth } from './contexts/AuthProvider'

function AppContent() {
  const { session, loading } = useAuth()

  if (loading) return <div className="app-loading">Loading...</div>

  return (
    <Routes>
      <Route path="/" element={session?.user ? <Navigate to="/admin/dashboard" replace /> : <LandingPage />} />
      <Route path="/admin" element={session?.user ? <Navigate to="/admin/dashboard" replace /> : <AuthForm />} />
      <Route path="/admin/dashboard" element={session?.user ? <Home /> : <Navigate to="/admin" replace />} />
      <Route path="/admin/evaluasi" element={session?.user ? <Home /> : <Navigate to="/admin" replace />} />
      <Route path="/admin/semua-evaluasi" element={session?.user ? <Home /> : <Navigate to="/admin" replace />} />
      <Route path="/admin/evaluasi-sus" element={session?.user ? <Home /> : <Navigate to="/admin" replace />} />
      <Route path="/admin/pengajuan-akun" element={session?.user ? <Home /> : <Navigate to="/admin" replace />} />
      <Route path="/admin/manajemen-akun" element={session?.user ? <Home /> : <Navigate to="/admin" replace />} />
      <Route path="/admin/settings" element={session?.user ? <Home /> : <Navigate to="/admin" replace />} />
      <Route path="*" element={<Navigate to={session?.user ? '/admin/dashboard' : '/'} replace />} />
    </Routes>
  )
}

export default function App() {
  return <AppContent />
}
