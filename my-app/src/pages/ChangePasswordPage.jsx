import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../contexts/ProfileProvider'
import { api } from '../lib/apiClient'
import './ChangePasswordPage.css'

export default function ChangePasswordPage() {
  const { refreshProfile } = useProfile()
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 8) {
      setError('Password baru minimal 8 karakter.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/change-password', { new_password: newPassword })
      await refreshProfile()
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Gagal mengubah password. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="change-pw-page">
      <div className="change-pw-card">
        <div className="change-pw-icon">🔒</div>
        <h1 className="change-pw-title">Ubah Password</h1>
        <p className="change-pw-desc">
          Anda harus mengubah password sebelum dapat melanjutkan.
        </p>

        <form className="change-pw-form" onSubmit={handleSubmit}>
          {error && <div className="change-pw-error">{error}</div>}

          <div className="change-pw-field">
            <label>Password Baru</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              autoComplete="new-password"
            />
          </div>

          <div className="change-pw-field">
            <label>Konfirmasi Password Baru</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ketik ulang password baru"
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className="change-pw-btn"
            disabled={loading}
          >
            {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
          </button>
        </form>
      </div>
    </div>
  )
}
