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
        <Route path="/" element={session?.user ? <Navigate to="/dashboard" replace /> : <AuthForm />} />
        <Route path="/dashboard" element={session?.user ? <Home /> : <Navigate to="/" replace />} />
        <Route path="/evaluasi" element={session?.user ? <Home /> : <Navigate to="/" replace />} />
        <Route path="/setting" element={session?.user ? <Home /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to={session?.user ? '/dashboard' : '/'} replace />} />
      </Routes>
    </main>
  )
}

export default function App() {
  return <AppContent />
}
