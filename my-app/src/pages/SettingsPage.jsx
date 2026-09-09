import React, { useState } from 'react'
import { useProfile } from '../contexts/ProfileProvider'
import { api } from '../lib/apiClient'

export default function SettingsPage({ jwtToken, userEmail, copied, onCopy }) {
  const { profile, updateProfile, refreshProfile } = useProfile()
  const [editName, setEditName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameSaving, setNameSaving] = useState(false)
  const [nameError, setNameError] = useState('')
  const [nameSuccess, setNameSuccess] = useState('')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')

  const startEditName = () => {
    setEditName(profile?.full_name || '')
    setEditingName(true)
    setNameError('')
    setNameSuccess('')
  }

  const cancelEditName = () => {
    setEditingName(false)
    setNameError('')
    setNameSuccess('')
  }

  const saveName = async () => {
    if (!editName.trim()) {
      setNameError('Nama tidak boleh kosong.')
      return
    }
    setNameSaving(true)
    setNameError('')
    try {
      await updateProfile({ full_name: editName.trim() })
      setEditingName(false)
      setNameSuccess('Nama berhasil diperbarui.')
      setTimeout(() => setNameSuccess(''), 3000)
    } catch (err) {
      setNameError(err.message || 'Gagal memperbarui nama.')
    } finally {
      setNameSaving(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPwError('')
    setPwSuccess('')

    if (newPassword.length < 8) {
      setPwError('Password baru minimal 8 karakter.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwError('Konfirmasi password tidak cocok.')
      return
    }

    setPwSaving(true)
    try {
      await api.post('/auth/change-password', { new_password: newPassword })
      await refreshProfile()
      setNewPassword('')
      setConfirmPassword('')
      setPwSuccess('Password berhasil diubah.')
      setTimeout(() => setPwSuccess(''), 3000)
    } catch (err) {
      setPwError(err.message || 'Gagal mengubah password.')
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div className="settings-content">
      {/* Profile Section */}
      <div className="settings-card" style={{ marginBottom: 20 }}>
        <div className="settings-header">
          <div>
            <p className="settings-label">Profil</p>
            <h1 className="settings-title">Informasi Akun</h1>
          </div>
        </div>

        <div className="settings-meta">
          <span className="meta-label">Email</span>
          <strong>{profile?.email || userEmail || '—'}</strong>
        </div>

        <div className="settings-meta">
          <span className="meta-label">Role</span>
          <span className={`status-badge ${profile?.role === 'super_admin' ? 'badge-approved' : 'badge-pending'}`}>
            {profile?.role === 'super_admin' ? 'Super Admin' : 'Administrator'}
          </span>
        </div>

        {profile?.institution && (
          <div className="settings-meta">
            <span className="meta-label">Institusi</span>
            <strong>{profile.institution}</strong>
          </div>
        )}

        {profile?.occupation && (
          <div className="settings-meta">
            <span className="meta-label">Pekerjaan</span>
            <strong>{profile.occupation}</strong>
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          {!editingName ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="settings-meta" style={{ margin: 0 }}>
                <span className="meta-label">Nama Lengkap</span>
                <strong>{profile?.full_name || '—'}</strong>
              </div>
              <button className="copy-btn" style={{ fontSize: '0.82rem', padding: '7px 14px' }} onClick={startEditName}>
                Edit
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>Nama Lengkap</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  className="modal-input"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveName() }}
                  autoFocus
                  style={{ maxWidth: 300 }}
                />
                <button
                  className="copy-btn"
                  style={{ fontSize: '0.82rem', padding: '8px 14px' }}
                  onClick={saveName}
                  disabled={nameSaving}
                >
                  {nameSaving ? '...' : 'Simpan'}
                </button>
                <button
                  className="pagination-btn"
                  style={{ fontSize: '0.82rem' }}
                  onClick={cancelEditName}
                >
                  Batal
                </button>
              </div>
            </div>
          )}
          {nameError && <div className="change-pw-error" style={{ marginTop: 10 }}>{nameError}</div>}
          {nameSuccess && <div style={{ marginTop: 10, color: '#047857', fontSize: '0.88rem' }}>{nameSuccess}</div>}
        </div>
      </div>

      {/* Password Change Section */}
      <div className="settings-card" style={{ marginBottom: 20 }}>
        <div className="settings-header">
          <div>
            <p className="settings-label">Keamanan</p>
            <h1 className="settings-title">Ubah Password</h1>
          </div>
        </div>

        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 400 }}>
          {pwError && <div className="change-pw-error">{pwError}</div>}
          {pwSuccess && <div style={{ color: '#047857', fontSize: '0.88rem', padding: '8px 0' }}>{pwSuccess}</div>}

          <div className="modal-field" style={{ marginBottom: 0 }}>
            <label>Password Baru</label>
            <input
              className="modal-input"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              autoComplete="new-password"
            />
          </div>

          <div className="modal-field" style={{ marginBottom: 0 }}>
            <label>Konfirmasi Password</label>
            <input
              className="modal-input"
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
            disabled={pwSaving}
            style={{ alignSelf: 'flex-start' }}
          >
            {pwSaving ? 'Menyimpan...' : 'Simpan Password'}
          </button>
        </form>
      </div>

      {/* JWT Section */}
      <div className="settings-card">
        <div className="settings-header">
          <div>
            <p className="settings-label">Developer</p>
            <h1 className="settings-title">JWT Token</h1>
          </div>
          <button className="copy-btn" onClick={onCopy} disabled={!jwtToken}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="settings-meta">
          <span className="meta-label">Signed in as</span>
          <strong>{userEmail || 'No active user'}</strong>
        </div>

        <div className="jwt-box">
          <code className="jwt-value">
            {jwtToken || 'No JWT available. Please log in again.'}
          </code>
        </div>
      </div>
    </div>
  )
}
