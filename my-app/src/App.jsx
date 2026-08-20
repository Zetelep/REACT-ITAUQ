import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import AuthForm from './components/AuthForm'
import Home from './pages/Home'
import { useAuth } from './contexts/AuthProvider'

function AppContent() {
  const { session, loading } = useAuth()

  if (loading) return <div className="auth-page">Loading...</div>

  return (
    <main className="auth-page">
      <Routes>
        <Route path="/admin" element={session?.user ? <Navigate to="/admin/dashboard" replace /> : <AuthForm />} />
        <Route path="/admin/dashboard" element={session?.user ? <Home /> : <Navigate to="/admin" replace />} />
        <Route path="/admin/evaluasi" element={session?.user ? <Home /> : <Navigate to="/admin" replace />} />
        <Route path="/admin/settings" element={session?.user ? <Home /> : <Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to={session?.user ? '/admin/dashboard' : '/admin'} replace />} />
      </Routes>
    </main>
  )
}

export default function App() {
  return <AppContent />
}
