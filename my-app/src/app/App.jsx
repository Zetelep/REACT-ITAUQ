import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import AuthForm from '../features/auth/AuthForm'
import AdminLayout from '../features/admin-layout/AdminLayout'
import LandingPage from '../features/landing/LandingPage'
import { useAuth } from './providers/AuthProvider'

function AppContent() {
  const { session, loading } = useAuth()

  if (loading) return <div className="app-loading">Loading...</div>

  return (
    <Routes>
      <Route path="/" element={session?.user ? <Navigate to="/admin/dashboard" replace /> : <LandingPage />} />
      <Route path="/admin" element={session?.user ? <Navigate to="/admin/dashboard" replace /> : <AuthForm />} />
      <Route path="/admin/dashboard" element={session?.user ? <AdminLayout /> : <Navigate to="/admin" replace />} />
      <Route path="/admin/evaluasi" element={session?.user ? <AdminLayout /> : <Navigate to="/admin" replace />} />
      <Route path="/admin/evaluasi/:questionnaireId" element={session?.user ? <AdminLayout /> : <Navigate to="/admin" replace />} />
      <Route path="/admin/semua-evaluasi" element={session?.user ? <AdminLayout /> : <Navigate to="/admin" replace />} />
      <Route path="/admin/semua-evaluasi/:questionnaireId" element={session?.user ? <AdminLayout /> : <Navigate to="/admin" replace />} />
      <Route path="/admin/evaluasi-sus" element={session?.user ? <AdminLayout /> : <Navigate to="/admin" replace />} />
      <Route path="/admin/pengajuan-akun" element={session?.user ? <AdminLayout /> : <Navigate to="/admin" replace />} />
      <Route path="/admin/manajemen-akun" element={session?.user ? <AdminLayout /> : <Navigate to="/admin" replace />} />
      <Route path="/admin/settings" element={session?.user ? <AdminLayout /> : <Navigate to="/admin" replace />} />
      <Route path="/admin/change-password" element={session?.user ? <AdminLayout /> : <Navigate to="/admin" replace />} />
      <Route path="*" element={<Navigate to={session?.user ? '/admin/dashboard' : '/'} replace />} />
    </Routes>
  )
}

export default function App() {
  return <AppContent />
}
