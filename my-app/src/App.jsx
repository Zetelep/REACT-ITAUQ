import React from 'react'
import './App.css'
import AuthForm from './components/AuthForm'
import Home from './pages/Home'
import { useAuth } from './contexts/AuthProvider'

function AppContent() {
  const { session, loading } = useAuth()

  if (loading) return <div className="auth-page">Loading...</div>

  return <main className="auth-page">{session?.user ? <Home /> : <AuthForm />}</main>
}

export default function App() {
  return <AppContent />
}
