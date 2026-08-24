import React, { useState } from 'react'
import './AuthForm.css'
import logoItauq from '../assets/icon.png'

export default function SignUpForm({ onBackClick }) {
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    institution: '',
    job: ''
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async () => {
    if (!formData.email || !formData.fullName || !formData.institution || !formData.job) {
      alert('Silahkan isi semua kolom')
      return
    }
    
    setLoading(true)
    // Simulate form submission
    setTimeout(() => {
      alert('Pengajuan sukses, silahkan tunggu email dari kami jika disetujui')
      setLoading(false)
      // Reset form
      setFormData({
        email: '',
        fullName: '',
        institution: '',
        job: ''
      })
      // Redirect back to login
      onBackClick()
    }, 500)
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
