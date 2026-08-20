import React, { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthProvider'
import dashboardIcon from '../assets/dashboard_30.png'
import settingsIcon from '../assets/settings_30.png'
import taskIcon from '../assets/task_30.png'
import logoutIcon from '../assets/logout_30.png'
import arrowBackIcon from '../assets/arrow_back_30.png'
import arrowForwardIcon from '../assets/arrow_forward_30.png'
import logoItauq from '../assets/icon.png'
import DashboardPage from './DashboardPage'
import EvaluationPage from './EvaluationPage'
import SettingsPage from './SettingsPage'

import './Home.css'

const pages = [
  { key: 'dashboard', label: 'Dashboard', path: '/admin/dashboard', icon: dashboardIcon },
  { key: 'evaluasi', label: 'Evaluasi', path: '/admin/evaluasi', icon: taskIcon },
  { key: 'setting', label: 'Setting', path: '/admin/settings', icon: settingsIcon },
]

export default function Home() {
  const { session, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [copied, setCopied] = useState(false)

  const activePage = useMemo(() => {
    if (location.pathname.startsWith('/admin/evaluasi')) return 'evaluasi'
    if (location.pathname.startsWith('/admin/settings')) return 'setting'
    return 'dashboard'
  }, [location.pathname])

  const jwtToken = session?.access_token || ''

  const handleNav = (key) => {
    const targetPage = pages.find((page) => page.key === key)
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

  const handleCopyJwt = async () => {
    if (!jwtToken) return

    try {
      await navigator.clipboard.writeText(jwtToken)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (error) {
      console.error('Failed to copy JWT:', error)
    }
  }

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
        </div>
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
        </nav>
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
        {activePage === 'dashboard' && <DashboardPage />}
        {activePage === 'evaluasi' && <EvaluationPage />}
        {activePage === 'setting' && (
          <SettingsPage
            jwtToken={jwtToken}
            userEmail={session?.user?.email}
            copied={copied}
            onCopy={handleCopyJwt}
          />
        )}
      </main>
    </div>
  )
}
