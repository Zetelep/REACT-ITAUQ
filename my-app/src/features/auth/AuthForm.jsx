import React, { useState } from 'react'
import { useAuth } from '../../app/providers/AuthProvider'
import SignUpForm from './SignUpForm'
import './AuthForm.css'
import logoItauq from '../../assets/icon.png'

export default function AuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState({ text: '', type: '' })
  const [loading, setLoading] = useState(false)
  const [isSignUpMode, setIsSignUpMode] = useState(false)
  const { signIn } = useAuth()

  const handleSignin = async () => {
    if (!email || !password) {
      setMessage({ text: 'Email dan password wajib diisi.', type: 'error' })
      return
    }
    setMessage({ text: '', type: '' })
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setMessage({ text: error.message, type: 'error' })
    else setMessage({ text: 'Berhasil masuk.', type: 'success' })
  }

  if (isSignUpMode) {
    return <SignUpForm onBackClick={() => setIsSignUpMode(false)} />
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img src={logoItauq} alt="" width="34" height="34" />
          <span>ITAUQ</span>
        </div>

        <div className="auth-header">
          <h1>Selamat Datang</h1>
          <p>Masuk untuk melanjutkan ke dashboard evaluasi</p>
        </div>

        {message.text && (
          <div className={`auth-message ${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>
            {message.text}
          </div>
        )}

        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault()
            handleSignin()
          }}
        >
          <div className="auth-field">
            <label className="auth-field-label" htmlFor="login-email">Email</label>
            <div className="auth-field-input-wrapper">
              <input
                id="login-email"
                className="auth-field-input"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                spellCheck={false}
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-field-label" htmlFor="login-password">Password</label>
            <div className="auth-field-input-wrapper">
              <input
                id="login-password"
                className="auth-field-input"
                name="password"
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
            type="submit"
            disabled={loading}
          >
            {loading && (
              <span className="spinner">
                <span className="spinner-icon" />
              </span>
            )}
            {loading ? 'Memproses...' : 'Login'}
          </button>
        </form>

        <div className="auth-divider" />

        <p className="auth-footer">
          Butuh akun?{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); setIsSignUpMode(true) }}>
            Daftar untuk mendapatkan akses
          </a>
        </p>
      </div>
    </div>
  )
}
