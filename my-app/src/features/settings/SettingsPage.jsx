import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../app/providers/AuthProvider'
import { useProfile } from '../../app/providers/ProfileProvider'
import { api } from '../../shared/api/apiClient'
import './SettingsPage.css'

function getInitials(name, email) {
  const source = name || email || 'Akun'
  const words = source.trim().split(/\s+/)
  return words.length > 1
    ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
    : source.slice(0, 2).toUpperCase()
}

function formatDate(value) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

function DetailItem({ label, value, locked = false }) {
  return (
    <div className="settings-detail-item">
      <span className="settings-detail-label">{label}</span>
      <span className={`settings-detail-value${locked ? ' is-locked' : ''}`}>
        {value || '—'}
        {locked && <span className="settings-lock" title="Dikelola oleh sistem">Terkunci</span>}
      </span>
    </div>
  )
}

export default function SettingsPage() {
  const { session } = useAuth()
  const { profile, updateProfile, refreshProfile } = useProfile()
  const userEmail = session?.user?.email || ''
  const displayName = profile?.full_name || userEmail.split('@')[0] || 'Administrator'
  const roleLabel = profile?.role === 'super_admin' ? 'Super Admin' : 'Administrator'
  const isSuperAdmin = profile?.role === 'super_admin'

  const [editName, setEditName] = useState('')
  const [editInstitution, setEditInstitution] = useState('')
  const [editOccupation, setEditOccupation] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameSaving, setNameSaving] = useState(false)
  const [nameError, setNameError] = useState('')
  const [nameSuccess, setNameSuccess] = useState('')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')

  useEffect(() => {
    if (!editingName) {
      setEditName(profile?.full_name || '')
      setEditInstitution(profile?.institution || '')
      setEditOccupation(profile?.occupation || '')
    }
  }, [profile?.full_name, profile?.institution, profile?.occupation, editingName])

  const initials = useMemo(() => getInitials(profile?.full_name, userEmail), [profile?.full_name, userEmail])
  const passwordProgress = Math.min(newPassword.length / 8, 1) * 100
  const passwordReady = newPassword.length >= 8 && newPassword === confirmPassword
  const passwordErrorId = pwError ? 'settings-password-error' : null
  const passwordHintId = newPassword && confirmPassword ? 'settings-password-hint' : null
  const confirmDescribedBy = [passwordErrorId, passwordHintId].filter(Boolean).join(' ') || undefined

  const startEditName = () => {
    setEditName(profile?.full_name || '')
    setEditInstitution(profile?.institution || '')
    setEditOccupation(profile?.occupation || '')
    setEditingName(true)
    setNameError('')
    setNameSuccess('')
  }

  const cancelEditName = () => {
    setEditingName(false)
    setEditName(profile?.full_name || '')
    setEditInstitution(profile?.institution || '')
    setEditOccupation(profile?.occupation || '')
    setNameError('')
    setNameSuccess('')
  }

  const saveName = async (event) => {
    event?.preventDefault()
    const nextName = editName.trim()
    if (!nextName) {
      setNameError('Nama lengkap tidak boleh kosong.')
      return
    }

    setNameSaving(true)
    setNameError('')
    setNameSuccess('')
    try {
      const profileData = { full_name: nextName }
      if (isSuperAdmin) {
        profileData.institution = editInstitution.trim()
        profileData.occupation = editOccupation.trim()
      }
      await updateProfile(profileData)
      setEditingName(false)
      setNameSuccess('Nama berhasil diperbarui.')
      window.setTimeout(() => setNameSuccess(''), 3000)
    } catch (err) {
      setNameError(err.message || 'Gagal memperbarui nama.')
    } finally {
      setNameSaving(false)
    }
  }

  const handleChangePassword = async (event) => {
    event.preventDefault()
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
      window.setTimeout(() => setPwSuccess(''), 3000)
    } catch (err) {
      setPwError(err.message || 'Gagal mengubah password.')
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div className="settings-page">
      <header className="settings-hero">
        <div>
          <p className="settings-eyebrow">Pengaturan akun</p>
          <h1 className="settings-page-title">Ruang pribadi Anda</h1>
          <p className="settings-page-description">
            Kelola identitas dan keamanan akun administrator Anda dari satu tempat.
          </p>
        </div>
        <div className="settings-active-pill">
          <span className="settings-active-dot" aria-hidden="true" />
          Akun aktif
        </div>
      </header>

      <div className="settings-bento">
        <section className="settings-card settings-profile-card">
          <div className="settings-card-heading">
            <div>
              <h2 className="settings-card-title">Identitas akun</h2>
            </div>
          </div>

          <div className="settings-profile-summary">
            <div className="settings-avatar" aria-hidden="true">{initials}</div>
            <div className="settings-profile-name">
              <strong>{displayName}</strong>
              <span>{roleLabel}</span>
            </div>
          </div>

          <form className="settings-name-editor" onSubmit={saveName}>
            <div className="settings-field-label-row">
              <label htmlFor="settings-full-name">Nama lengkap</label>
              {!editingName && <button type="button" className="settings-text-button" onClick={startEditName}>{isSuperAdmin ? 'Edit data' : 'Edit nama'}</button>}
            </div>
            {editingName ? (
              <>
                <input
                  id="settings-full-name"
                  className="settings-input"
                  type="text"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  placeholder="Masukkan nama lengkap"
                  autoFocus
                />
                {isSuperAdmin && (
                  <div className="settings-profile-editor-grid">
                    <div className="settings-field">
                      <label htmlFor="settings-institution">Institusi</label>
                      <input
                        id="settings-institution"
                        className="settings-input"
                        type="text"
                        value={editInstitution}
                        onChange={(event) => setEditInstitution(event.target.value)}
                        placeholder="Nama institusi"
                      />
                    </div>
                    <div className="settings-field">
                      <label htmlFor="settings-occupation">Pekerjaan</label>
                      <input
                        id="settings-occupation"
                        className="settings-input"
                        type="text"
                        value={editOccupation}
                        onChange={(event) => setEditOccupation(event.target.value)}
                        placeholder="Pekerjaan atau jabatan"
                      />
                    </div>
                  </div>
                )}
                <div className="settings-form-actions">
                  <button className="settings-primary-button" type="submit" disabled={nameSaving}>
                    {nameSaving ? 'Menyimpan...' : 'Simpan perubahan'}
                  </button>
                  <button className="settings-secondary-button" type="button" onClick={cancelEditName} disabled={nameSaving}>
                    Batal
                  </button>
                </div>
              </>
            ) : (
              <div className="settings-readonly-field">{profile?.full_name || 'Belum diisi'}</div>
            )}
            {nameError && <p className="settings-feedback settings-feedback-error" role="alert">{nameError}</p>}
            {nameSuccess && <p className="settings-feedback settings-feedback-success" role="status">{nameSuccess}</p>}
          </form>
        </section>

        <section className="settings-card settings-account-card">
          <div className="settings-card-heading">
            <div>
              <h2 className="settings-card-title">Data akun</h2>
            </div>
          </div>

          <div className="settings-detail-grid">
            <DetailItem label="Email" value={userEmail} locked />
            <DetailItem label="Peran" value={roleLabel} locked />
            <DetailItem label="Institusi" value={profile?.institution} locked />
            <DetailItem label="Pekerjaan" value={profile?.occupation} locked />
            <DetailItem label="Bergabung sejak" value={formatDate(profile?.created_at)} />
            <DetailItem label="Status" value={profile?.is_active === false ? 'Nonaktif' : 'Aktif'} />
          </div>

          <p className="settings-card-note">
            {isSuperAdmin
              ? 'Sebagai Super Admin, Anda dapat memperbarui nama, institusi, dan pekerjaan. Email dan peran tetap dilindungi oleh sistem.'
              : 'Email, peran, institusi, dan pekerjaan dikelola oleh sistem. Hubungi Super Admin jika data tersebut perlu diperbarui.'}
          </p>
        </section>

        <section className="settings-card settings-security-card">
          <div className="settings-card-heading">
            <div>
              <h2 className="settings-card-title">Keamanan</h2>
            </div>
          </div>

          <div className="settings-security-intro">
            <div>
              <strong>Perbarui password secara berkala</strong>
              <p>Gunakan minimal 8 karakter agar akun tetap terlindungi.</p>
            </div>
          </div>

          <form className="settings-password-form" onSubmit={handleChangePassword}>
            {pwError && <div className="settings-feedback settings-feedback-error" id="settings-password-error" role="alert">{pwError}</div>}
            {pwSuccess && <div className="settings-feedback settings-feedback-success" role="status">{pwSuccess}</div>}

            <div className="settings-field">
              <label htmlFor="new-password">Password baru</label>
              <input
                id="new-password"
                className="settings-input"
                type="password"
                name="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Minimal 8 karakter"
                autoComplete="new-password"
                aria-invalid={Boolean(pwError)}
                aria-describedby={passwordErrorId || undefined}
              />
              <div className="settings-password-meter" aria-hidden="true">
                <span style={{ width: `${passwordProgress}%` }} />
              </div>
            </div>

            <div className="settings-field">
              <label htmlFor="confirm-password">Konfirmasi password</label>
              <input
                id="confirm-password"
                className="settings-input"
                type="password"
                name="confirm-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Ketik ulang password baru"
                autoComplete="new-password"
                aria-invalid={Boolean(pwError)}
                aria-describedby={confirmDescribedBy}
              />
            </div>

            <button className="settings-primary-button" type="submit" disabled={pwSaving}>
              {pwSaving ? 'Menyimpan...' : 'Simpan password'}
            </button>
            {newPassword && confirmPassword && (
              <p className={`settings-password-hint${passwordReady ? ' is-ready' : ''}`} id="settings-password-hint">
                {passwordReady ? 'Password siap disimpan.' : 'Pastikan kedua password sama.'}
              </p>
            )}
          </form>
        </section>

        <aside className="settings-card settings-help-card">
          <div>
            <h2 className="settings-card-title">Data terlindungi</h2>
            <p className="settings-help-copy">
              Perubahan nama dan password berlaku untuk sesi akun Anda. Data akses sensitif tidak ditampilkan di halaman ini.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
