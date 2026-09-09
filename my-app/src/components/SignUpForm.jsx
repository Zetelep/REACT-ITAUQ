import React, { useState } from 'react'
import './AuthForm.css'
import logoItauq from '../assets/icon.png'
import { api } from '../lib/apiClient'

export default function SignUpForm({ onBackClick }) {
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    institution: '',
    job: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      alert('Pengajuan sukses, silahkan tunggu email dari kami jika disetujui')
      setFormData({ email: '', fullName: '', institution: '', job: '' })
      onBackClick()
    } catch (err) {
      if (err.code === 'DUPLICATE_APPLICATION') {
        setError('Pengajuan dengan email ini sudah ada dan masih menunggu review.')
      } else {
        setError(err.message || 'Gagal mengajukan. Silakan coba lagi.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img src={logoItauq} alt="ITAUQ logo" />
          <span>ITAUQ</span>
        </div>

        <div className="auth-header">
          <h1>Buat Akun</h1>
          <p>Isi identitas Anda untuk mengajukan akses</p>
        </div>

        <div className="auth-form" onKeyDown={handleKeyDown}>
          {error && <div className="auth-message error">{error}</div>}
          <div className="auth-field">
            <label className="auth-field-label">Email</label>
            <div className="auth-field-input-wrapper">
              <span className="auth-field-icon">✉</span>
              <input
                className="auth-field-input"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-field-label">Nama Lengkap</label>
            <div className="auth-field-input-wrapper">
              <span className="auth-field-icon">👤</span>
              <input
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
            <label className="auth-field-label">Institusi/Organisasi</label>
            <div className="auth-field-input-wrapper">
              <span className="auth-field-icon">🏢</span>
              <input
                className="auth-field-input"
                type="text"
                name="institution"
                value={formData.institution}
                onChange={handleChange}
                placeholder="Masukkan institusi/organisasi Anda"
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-field-label">Pekerjaan</label>
            <div className="auth-field-input-wrapper">
              <span className="auth-field-icon">💼</span>
              <input
                className="auth-field-input"
                type="text"
                name="job"
                value={formData.job}
                onChange={handleChange}
                placeholder="Masukkan pekerjaan Anda"
              />
            </div>
          </div>

          <button
            className={`auth-submit-btn${loading ? ' loading' : ''}`}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading && (
              <span className="spinner">
                <span className="spinner-icon" />
              </span>
            )}
            {loading ? 'Memproses...' : 'Ajukan'}
          </button>
        </div>

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
