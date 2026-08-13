import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthProvider'
import './Home.css'

const pages = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'evaluasi', label: 'Evaluasi' },
  { key: 'setting', label: 'Setting' },
]

export default function Home() {
  const { session, signOut } = useAuth()
  const [activePage, setActivePage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleNav = (key) => {
    setActivePage(key)
    setSidebarOpen(false)
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
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-header">
          <h2>ITAUQ</h2>
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
            >
              {p.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <p className="sidebar-user">{session?.user?.email}</p>
          <button className="sidebar-signout" onClick={() => signOut()}>
            Sign Out
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
        ) : (
          <h1>This is {pages.find((p) => p.key === activePage)?.label}</h1>
        )}
      </main>
    </div>
  )
}
