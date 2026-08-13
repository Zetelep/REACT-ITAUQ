import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthProvider'
import SignUpForm from './SignUpForm'
import './AuthForm.css'
import authImage from '../assets/authpageimg.jpg'

export default function AuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState({ text: '', type: '' })
  const [loading, setLoading] = useState(false)
  const [isSignUpMode, setIsSignUpMode] = useState(false)
  const { signUp, signIn } = useAuth()

  const handleSignin = async () => {
    if (!email || !password) {
      setMessage({ text: 'Please fill in all fields.', type: 'error' })
      return
    }
    setMessage({ text: '', type: '' })
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setMessage({ text: error.message, type: 'error' })
    else setMessage({ text: 'Signed in successfully.', type: 'success' })
  }

  const handleSignup = async () => {
    if (!email || !password) {
      setMessage({ text: 'Please fill in all fields.', type: 'error' })
      return
    }
    setMessage({ text: '', type: '' })
    setLoading(true)
    const { data, error } = await signUp(email, password)
    setLoading(false)
    if (error) setMessage({ text: error.message, type: 'error' })
    else if (data?.session) setMessage({ text: 'Signed up and signed in.', type: 'success' })
    else setMessage({ text: 'Sign-up successful! Check your email for confirmation.', type: 'success' })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSignin()
  }

  if (isSignUpMode) {
    return <SignUpForm onBackClick={() => setIsSignUpMode(false)} />
  }

  return (
    <div className="auth-layout">
      {/* Left Brand Panel */}
      <div className="auth-brand" style={{ '--auth-bg': `url(${authImage})` }}>
        <div className="auth-brand-logo">
          <span>✦ ITAUQ</span>
        </div>
        <div className="auth-brand-card">
          <h2>Platform Pembelajaran Al-Qur'an Interaktif</h2>
          <p>Belajar membaca dan memahami Al-Qur'an dengan metode modern yang interaktif dan mudah diikuti. Bergabunglah dengan ribuan siswa lainnya.</p>
          <div className="auth-brand-features">
            <div className="auth-brand-feature">
              <div className="auth-brand-feature-icon">📖</div>
              <span>Belajar Tajwid dengan mudah</span>
            </div>
            <div className="auth-brand-feature">
              <div className="auth-brand-feature-icon">🎯</div>
              <span>Latihan interaktif & kuis</span>
            </div>
            <div className="auth-brand-feature">
              <div className="auth-brand-feature-icon">📊</div>
              <span>Pantau progress belajar Anda</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="auth-form-panel">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h1>Selamat Datang</h1>
            <p>Masuk menggunakan akun Anda untuk melanjutkan</p>
          </div>

          {message.text && (
            <div className={`auth-message ${message.type}`}>
              {message.text}
            </div>
          )}

          <div className="auth-form" onKeyDown={handleKeyDown}>
            <div className="auth-field">
              <label className="auth-field-label">Email</label>
              <div className="auth-field-input-wrapper">
                <span className="auth-field-icon">✉</span>
                <input
                  className="auth-field-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="auth-field">
              <div className="auth-field-row">
                <label className="auth-field-label">Password</label>
                <a href="#" className="auth-forgot-link">Lupa Password?</a>
              </div>
              <div className="auth-field-input-wrapper">
                <span className="auth-field-icon">🔒</span>
                <input
                  className="auth-field-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              className={`auth-submit-btn${loading ? ' loading' : ''}`}
              onClick={handleSignin}
              disabled={loading}
            >
              {loading && (
                <span className="spinner">
                  <span className="spinner-icon" />
                </span>
              )}
              {loading ? 'Memproses...' : 'Login'}
            </button>

            </div>

          <p className="auth-footer">
            Butuh akun?{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); setIsSignUpMode(true) }}>
              Daftar untuk mendapatkan akses
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}