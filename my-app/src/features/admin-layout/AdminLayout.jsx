import React, { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../app/providers/AuthProvider'
import { useProfile } from '../../app/providers/ProfileProvider'
import dashboardIcon from '../../assets/dashboard_30.png'
import settingsIcon from '../../assets/settings_30.png'
import taskIcon from '../../assets/task_30.png'
import logoutIcon from '../../assets/logout_30.png'
import arrowBackIcon from '../../assets/arrow_back_30.png'
import arrowForwardIcon from '../../assets/arrow_forward_30.png'
import accountBoxIcon from '../../assets/account_box_30dp.png'
import approvalIcon from '../../assets/approval_delegation_30dp_.png'
import assignmentIcon from '../../assets/assignment_30dp.png'
import sentimentIcon from '../../assets/sentiment_content_30dp.png'
import logoItauq from '../../assets/icon.png'
import DashboardPage from '../dashboard/DashboardPage'
import EvaluationPage from '../evaluations/EvaluationPage'
import SettingsPage from '../settings/SettingsPage'
import AllEvaluationsPage from '../evaluations/AllEvaluationsPage'
import HasilPage from '../evaluations/HasilPage'
import AccountRequestsPage from '../account-management/AccountRequestsPage'
import AccountManagementPage from '../account-management/AccountManagementPage'
import ChangePasswordPage from '../settings/ChangePasswordPage'
import HasilSUSPage from '../evaluations/HasilSUSPage'

import './AdminLayout.css'

const pages = [
  { key: 'dashboard', label: 'Dashboard', path: '/admin/dashboard', icon: dashboardIcon },
  { key: 'evaluasi', label: 'Evaluasi', path: '/admin/evaluasi', icon: taskIcon },
  { key: 'hasil', label: 'Hasil', path: '/admin/hasil', icon: sentimentIcon },
  { key: 'setting', label: 'Setting', path: '/admin/settings', icon: settingsIcon },
]

// Only visible for accounts with the Super Admin role
const superAdminPages = [
  { key: 'semua-evaluasi', label: 'Semua Evaluasi', path: '/admin/semua-evaluasi', icon: assignmentIcon },
  { key: 'evaluasi-sus', label: 'Hasil SUS', path: '/admin/evaluasi-sus', icon: sentimentIcon },
  { key: 'pengajuan-akun', label: 'Pengajuan Akun', path: '/admin/pengajuan-akun', icon: approvalIcon },
  { key: 'manajemen-akun', label: 'Manajemen Akun', path: '/admin/manajemen-akun', icon: accountBoxIcon },
]

export default function AdminLayout() {
  const { session, signOut } = useAuth()
  const { profile, profileLoading } = useProfile()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)

  const activePage = useMemo(() => {
    if (location.pathname.startsWith('/admin/change-password')) return 'change-password'
    if (location.pathname.startsWith('/admin/semua-evaluasi')) return 'semua-evaluasi'
    if (location.pathname.startsWith('/admin/evaluasi-sus')) return 'evaluasi-sus'
    if (location.pathname.startsWith('/admin/evaluasi')) return 'evaluasi'
    if (location.pathname.startsWith('/admin/hasil')) return 'hasil'
    if (location.pathname.startsWith('/admin/pengajuan-akun')) return 'pengajuan-akun'
    if (location.pathname.startsWith('/admin/manajemen-akun')) return 'manajemen-akun'
    if (location.pathname.startsWith('/admin/settings')) return 'setting'
    return 'dashboard'
  }, [location.pathname])

  const isSuperAdmin = profile?.role === 'super_admin'

  const handleNav = (key) => {
    const targetPage = [...pages, ...superAdminPages].find((page) => page.key === key)
    if (targetPage) {
      navigate(targetPage.path)
    }
    setSidebarOpen(false)
  }

  const handleSignOut = async () => {
    const confirmed = window.confirm('Are you sure you want to sign out?')
    if (confirmed) {
      await signOut()
    }
  }

  if (profileLoading) return <div className="app-loading">Loading profile...</div>

  const forceChangePassword = profile?.must_change_password === true

  return (
    <div className="dashboard-layout">
      {/* ─── Mobile Top Bar ─── */}
      <div className="mobile-topbar">
        <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
          <span />
          <span />
          <span />
        </button>
        <h2>ITAUQ</h2>
      </div>

      {/* ─── Overlay ─── */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* ─── Sidebar ─── */}
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}${sidebarCollapsed ? ' collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <img src={logoItauq} alt="ITAUQ logo" className="sidebar-brand-logo" />
            <h2>ITAUQ</h2>
          </div>
          {!forceChangePassword && (
            <>
              <button className="sidebar-toggle" onClick={() => setSidebarCollapsed((collapsed) => !collapsed)} aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
                <img
                  src={sidebarCollapsed ? arrowForwardIcon : arrowBackIcon}
                  alt=""
                  className="sidebar-toggle-icon"
                />
              </button>
              <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
                &times;
              </button>
            </>
          )}
        </div>
        {!forceChangePassword && (
          <nav className="sidebar-nav">
            {pages.map((p) => (
              <button
                key={p.key}
                className={`sidebar-link${activePage === p.key ? ' active' : ''}`}
                onClick={() => handleNav(p.key)}
              title={sidebarCollapsed ? p.label : undefined}
              aria-label={p.label}
              >
                <img src={p.icon} alt="" className="sidebar-icon" />
                <span className="sidebar-label">{p.label}</span>
              </button>
            ))}

            {/* ─── Super Admin section ─── */}
            {isSuperAdmin && (
              <>
                <div className="sidebar-divider">
                  <span className="sidebar-divider-line" />
                  <span className="sidebar-divider-text">Super Admin</span>
                  <span className="sidebar-divider-line" />
                </div>

                {superAdminPages.map((p) => (
                  <button
                    key={p.key}
                    className={`sidebar-link${activePage === p.key ? ' active' : ''}`}
                    onClick={() => handleNav(p.key)}
                    title={sidebarCollapsed ? p.label : undefined}
                    aria-label={p.label}
                  >
                    <img src={p.icon} alt="" className="sidebar-icon" />
                    <span className="sidebar-label">{p.label}</span>
                  </button>
                ))}
              </>
            )}
          </nav>
        )}
        <div className="sidebar-footer">
          <p className="sidebar-user">{session?.user?.email}</p>
          <button className="sidebar-signout" onClick={handleSignOut} title={sidebarCollapsed ? 'Sign Out' : undefined} aria-label="Sign Out">
            <img src={logoutIcon} alt="" className="sidebar-icon" />
            <span className="sidebar-label">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <main className="dashboard-main">
        {forceChangePassword ? (
          <ChangePasswordPage />
        ) : (
          <>
            {activePage === 'dashboard' && <DashboardPage />}
            {activePage === 'evaluasi' && <EvaluationPage />}
            {activePage === 'hasil' && <HasilPage />}
            {activePage === 'semua-evaluasi' && <AllEvaluationsPage />}
            {activePage === 'evaluasi-sus' && <HasilSUSPage />}
            {activePage === 'pengajuan-akun' && <AccountRequestsPage />}
            {activePage === 'manajemen-akun' && <AccountManagementPage />}
            {activePage === 'setting' && <SettingsPage />}
          </>
        )}
      </main>
    </div>
  )
}
