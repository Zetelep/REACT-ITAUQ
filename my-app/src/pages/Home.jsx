import React, { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthProvider'
import dashboardIcon from '../assets/dashboard_30.png'
import settingsIcon from '../assets/settings_30.png'
import taskIcon from '../assets/task_30.png'
import logoutIcon from '../assets/logout_30.png'
import arrowBackIcon from '../assets/arrow_back_30.png'
import arrowForwardIcon from '../assets/arrow_forward_30.png'
import './Home.css'

const pages = [
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: dashboardIcon },
  { key: 'evaluasi', label: 'Evaluasi', path: '/evaluasi', icon: taskIcon },
  { key: 'setting', label: 'Setting', path: '/setting', icon: settingsIcon },
]

export default function Home() {
  const { session, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [copied, setCopied] = useState(false)

  const activePage = useMemo(() => {
    if (location.pathname.startsWith('/evaluasi')) return 'evaluasi'
    if (location.pathname.startsWith('/setting')) return 'setting'
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
          <h2>ITAUQ</h2>
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
        {activePage === 'dashboard' ? (
          <div className="dashboard-content">
            <div className="dashboard-header-card large">
              <div className="header-left">
                <h2 className="header-title">INDONESIAN TOURISM USABILITY QUESTIONNAIRE DASHBOARD</h2>
                <p className="header-desc">Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua</p>
                <div className="header-actions">
                  <button className="primary-btn">+ Buat Evaluasi</button>
                </div>
              </div>
            </div>

            <div className="stats-row">
              <div className="stat-card boxed">
                <div className="stat-title">Total Evaluasi</div>
                <div className="stat-value">12</div>
              </div>
              <div className="stat-card boxed">
                <div className="stat-title">Evaluasi Aktif</div>
                <div className="stat-value">3</div>
              </div>
              <div className="stat-card boxed">
                <div className="stat-title">Evaluasi Selesai</div>
                <div className="stat-value">9</div>
              </div>
            </div>

            <section className="latest-section">
              <div className="latest-header-row">
                <h3 className="latest-title">Evaluasi Terbaru</h3>
                <button className="archive-link">Buka Arsip</button>
              </div>

              <div className="latest-cards">
                <div className="latest-card">
                  <div className="card-icon">📄</div>
                  <div className="card-body">
                    <div className="card-title">Traveloka</div>
                    <div className="card-sub">Menunggu Responden</div>
                  </div>
                  <button className="card-action">⋯</button>
                </div>

                <div className="latest-card">
                  <div className="card-icon">📄</div>
                  <div className="card-body">
                    <div className="card-title">Agoda</div>
                    <div className="card-sub">Selesai</div>
                  </div>
                  <button className="card-action">⋯</button>
                </div>

                <div className="latest-card">
                  <div className="card-icon">📄</div>
                  <div className="card-body">
                    <div className="card-title">tiket.com</div>
                    <div className="card-sub">Menunggu Responden</div>
                  </div>
                  <button className="card-action">⋯</button>
                </div>
              </div>
            </section>
          </div>
        ) : activePage === 'setting' ? (
          <div className="settings-content">
            <div className="settings-card">
              <div className="settings-header">
                <div>
                  <p className="settings-label">Account</p>
                  <h1 className="settings-title">JWT Key</h1>
                </div>
                <button className="copy-btn" onClick={handleCopyJwt} disabled={!jwtToken}>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <div className="settings-meta">
                <span className="meta-label">Signed in as</span>
                <strong>{session?.user?.email || 'No active user'}</strong>
              </div>

              <div className="jwt-box">
                <code className="jwt-value">
                  {jwtToken || 'No JWT available. Please log in again.'}
                </code>
              </div>
            </div>
          </div>
        ) : (
          <h1>This is {pages.find((p) => p.key === activePage)?.label}</h1>
        )}
      </main>
    </div>
  )
}
