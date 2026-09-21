import React, { useState } from 'react'
import './AuthForm.css'
import logoItauq from '../../assets/icon.png'
import { api } from '../../shared/api/apiClient'

export default function SignUpForm({ onBackClick }) {
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    institution: '',
    job: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submittedEmail, setSubmittedEmail] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError('')
  }

  const handleSubmit = async () => {
    if (!formData.email || !formData.fullName) {
      setError('Email dan nama lengkap wajib diisi')
      return
    }

    setLoading(true)
    setError('')
    try {
      await api.post('/applications', {
        email: formData.email,
        full_name: formData.fullName,
        institution: formData.institution || undefined,
        occupation: formData.job || undefined,
      }, { public: true })
      setSubmittedEmail(formData.email)
      setFormData({ email: '', fullName: '', institution: '', job: '' })
    } catch (err) {
      if (err.code === 'DUPLICATE_APPLICATION') {
        setError('Pengajuan dengan email ini sudah ada dan masih menunggu peninjauan.')
      } else {
        setError(err.message || 'Gagal mengirim pengajuan. Silakan coba lagi.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (submittedEmail) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <img src={logoItauq} alt="" width="34" height="34" />
            <span>ITAUQ</span>
          </div>

          <div className="auth-header">
            <h1>Pengajuan terkirim</h1>
            <p>Pengajuan akses Anda sedang ditinjau.</p>
          </div>

          <div className="auth-message success" role="status">
            Kami akan mengirim email ke {submittedEmail} setelah pengajuan disetujui.
          </div>

          <button type="button" className="auth-submit-btn" onClick={onBackClick}>
            Kembali ke halaman masuk
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img src={logoItauq} alt="" />
          <span>ITAUQ</span>
        </div>

        <div className="auth-header">
          <h1>Buat Akun</h1>
          <p>Isi identitas Anda untuk mengajukan akses</p>
        </div>

        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit()
          }}
        >
          {error && <div className="auth-message error" role="alert">{error}</div>}
          <div className="auth-field">
            <label className="auth-field-label" htmlFor="signup-email">Email</label>
            <div className="auth-field-input-wrapper">
              <input
                id="signup-email"
                className="auth-field-input"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                autoComplete="email"
                spellCheck={false}
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-field-label" htmlFor="signup-name">Nama Lengkap</label>
            <div className="auth-field-input-wrapper">
              <input
                id="signup-name"
                className="auth-field-input"
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Masukkan nama lengkap Anda"
                autoComplete="name"
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-field-label" htmlFor="signup-institution">Institusi/Organisasi</label>
            <div className="auth-field-input-wrapper">
              <input
                id="signup-institution"
                className="auth-field-input"
                type="text"
                name="institution"
                value={formData.institution}
                onChange={handleChange}
                placeholder="Masukkan institusi/organisasi Anda"
                autoComplete="organization"
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-field-label" htmlFor="signup-job">Pekerjaan</label>
            <div className="auth-field-input-wrapper">
              <input
                id="signup-job"
                className="auth-field-input"
                type="text"
                name="job"
                value={formData.job}
                onChange={handleChange}
                placeholder="Masukkan pekerjaan Anda"
                autoComplete="organization-title"
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
            {loading ? 'Memproses...' : 'Ajukan'}
          </button>
        </form>

        <div className="auth-divider" />

        <p className="auth-footer">
          Sudah memiliki akun?{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); onBackClick() }}>
            Kembali ke login
          </a>
        </p>
      </div>
    </div>
  )
}
