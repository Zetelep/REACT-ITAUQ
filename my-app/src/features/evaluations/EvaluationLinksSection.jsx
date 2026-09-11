import React, { useCallback, useEffect, useState } from 'react'
import { api } from '../../shared/api/apiClient'

const PUBLIC_EVALUATION_URL_BASE = (import.meta.env.VITE_PUBLIC_EVALUATION_URL_BASE || 'https://itauq.site/e/').replace(/\/?$/, '/')

function getPublicEvaluationUrl(link) {
  const candidate = link.url || link.token
  if (!candidate) return ''
  try {
    return new URL(candidate, PUBLIC_EVALUATION_URL_BASE).toString()
  } catch {
    return candidate
  }
}

function normalizeLink(link) {
  return { ...link, url: getPublicEvaluationUrl(link) }
}

function getLinksResult(result) {
  if (Array.isArray(result)) return result
  return Array.isArray(result?.data) ? result.data : []
}

function formatDateTime(value) {
  if (!value) return 'Tidak kedaluwarsa'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Tanggal tidak valid'
  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toDateTimeLocal(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return localTime.toISOString().slice(0, 16)
}

function isExpired(link) {
  return Boolean(link.expires_at && new Date(link.expires_at).getTime() <= Date.now())
}

function linkStatus(link) {
  if (!link.is_active) return { label: 'Nonaktif', className: 'link-status-inactive' }
  if (isExpired(link)) return { label: 'Kedaluwarsa', className: 'link-status-expired' }
  return { label: 'Aktif', className: 'link-status-active' }
}

function getMinimumExpiry() {
  const now = new Date()
  now.setMinutes(now.getMinutes() + 1)
  return now.toISOString().slice(0, 16)
}

export default function EvaluationLinksSection({ questionnaireId, canView, canCreate, canManage }) {
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expiry, setExpiry] = useState('')
  const [editingLink, setEditingLink] = useState(null)
  const [editExpiry, setEditExpiry] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  const fetchLinks = useCallback(async () => {
    if (!canView) return
    setLoading(true)
    setError('')
    try {
      const result = await api.get(`/questionnaires/${questionnaireId}/evaluation-links`)
      setLinks(getLinksResult(result).map(normalizeLink))
    } catch (err) {
      setError(err.message || 'Gagal memuat evaluation link.')
    } finally {
      setLoading(false)
    }
  }, [canView, questionnaireId])

  useEffect(() => {
    fetchLinks()
  }, [fetchLinks])

  const handleCreate = async (event) => {
    event.preventDefault()
    setActionLoading('create')
    setError('')
    try {
      const body = expiry ? { expires_at: new Date(expiry).toISOString() } : {}
      const created = await api.post(`/questionnaires/${questionnaireId}/evaluation-links`, body)
      setLinks((current) => [normalizeLink(created), ...current])
      setExpiry('')
    } catch (err) {
      setError(err.message || 'Gagal membuat evaluation link.')
    } finally {
      setActionLoading(null)
    }
  }

  const openEdit = (link) => {
    setEditingLink(link)
    setEditExpiry(toDateTimeLocal(link.expires_at))
    setEditActive(Boolean(link.is_active))
    setError('')
  }

  const handleUpdate = async (event) => {
    event.preventDefault()
    if (!editingLink) return
    setActionLoading(editingLink.id)
    setError('')
    try {
      const body = { is_active: editActive }
      const originalExpiry = toDateTimeLocal(editingLink.expires_at)
      if (editExpiry && editExpiry !== originalExpiry) body.expires_at = new Date(editExpiry).toISOString()
      const updated = await api.patch(`/evaluation-links/${editingLink.id}`, body)
      setLinks((current) => current.map((link) => link.id === updated.id ? normalizeLink(updated) : link))
      setEditingLink(null)
    } catch (err) {
      setError(err.message || 'Gagal memperbarui evaluation link.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (link) => {
    if (!window.confirm('Hapus evaluation link ini? Link tidak dapat digunakan lagi.')) return
    setActionLoading(`delete-${link.id}`)
    setError('')
    try {
      await api.del(`/evaluation-links/${link.id}`)
      setLinks((current) => current.filter((item) => item.id !== link.id))
    } catch (err) {
      setError(err.message || 'Gagal menghapus evaluation link.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCopy = async (link) => {
    if (!link.url) return
    try {
      await navigator.clipboard.writeText(link.url)
      setCopiedId(link.id)
      window.setTimeout(() => setCopiedId((current) => current === link.id ? null : current), 1800)
    } catch {
      setError('URL tidak dapat disalin. Silakan salin URL secara manual.')
    }
  }

  if (!canView) return null

  return (
    <section id="evaluation-links" className="resource-section evaluation-links-section">
      <div className="resource-section-header">
        <div>
          <span className="resource-section-eyebrow">Tahap akhir</span>
          <h2>Bagikan Evaluasi</h2>
          <p>Buat tautan publik agar responden dapat mengisi evaluasi tanpa login.</p>
        </div>
        {canCreate && (
          <form className="evaluation-link-create" onSubmit={handleCreate}>
            <label htmlFor="evaluation-link-expiry">Berlaku sampai <span>(opsional)</span></label>
            <div className="evaluation-link-create-row">
              <input
                id="evaluation-link-expiry"
                className="modal-input"
                type="datetime-local"
                min={getMinimumExpiry()}
                value={expiry}
                onChange={(event) => setExpiry(event.target.value)}
              />
              <button className="secondary-btn-sm" type="submit" disabled={actionLoading === 'create'}>
                {actionLoading === 'create' ? 'Membuat...' : '+ Buat Link'}
              </button>
            </div>
          </form>
        )}
      </div>

      {error && <div className="page-error evaluation-link-error" role="alert">{error}</div>}

      {loading ? (
        <div className="resource-empty">Memuat evaluation link...</div>
      ) : links.length === 0 ? (
        <div className="resource-empty">Belum ada evaluation link untuk evaluasi ini.</div>
      ) : (
        <div className="evaluation-link-list">
          {links.map((link) => {
            const status = linkStatus(link)
            return (
              <article className="evaluation-link-card" key={link.id}>
                <div className="evaluation-link-card-main">
                  <div className="evaluation-link-card-heading">
                    <span className={`evaluation-link-status ${status.className}`}>{status.label}</span>
                    <span className="evaluation-link-created">Dibuat {formatDateTime(link.created_at)}</span>
                  </div>
                  <a className="evaluation-link-url" href={link.url} target="_blank" rel="noreferrer">
                    {link.url || `/e/${link.token}`}
                  </a>
                  <small className="evaluation-link-expiry">Berlaku sampai: {formatDateTime(link.expires_at)}</small>
                </div>
                <div className="evaluation-link-actions">
                  <button className="text-action" type="button" onClick={() => handleCopy(link)}>
                    {copiedId === link.id ? 'Tersalin' : 'Salin URL'}
                  </button>
                  {canManage && <button className="text-action" type="button" onClick={() => openEdit(link)}>Edit</button>}
                  {canManage && (
                    <button
                      className="text-action danger"
                      type="button"
                      disabled={actionLoading === `delete-${link.id}`}
                      onClick={() => handleDelete(link)}
                    >
                      {actionLoading === `delete-${link.id}` ? 'Menghapus...' : 'Hapus'}
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {editingLink && (
        <div className="modal-overlay" onClick={() => setEditingLink(null)}>
          <div className="modal-card questionnaire-modal" onClick={(event) => event.stopPropagation()}>
            <h2 className="modal-title">Edit Evaluation Link</h2>
            <form onSubmit={handleUpdate}>
              <div className="modal-field">
                <label htmlFor="evaluation-link-active">Status Link</label>
                <select id="evaluation-link-active" className="modal-input" value={editActive ? 'active' : 'inactive'} onChange={(event) => setEditActive(event.target.value === 'active')}>
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </div>
              <div className="modal-field">
                <label htmlFor="evaluation-link-edit-expiry">Berlaku sampai</label>
                <input id="evaluation-link-edit-expiry" className="modal-input" type="datetime-local" min={getMinimumExpiry()} value={editExpiry} onChange={(event) => setEditExpiry(event.target.value)} />
                <small className="modal-help">Kosongkan untuk tidak mengubah expiry yang tersimpan.</small>
              </div>
              <div className="modal-actions">
                <button type="button" className="modal-btn cancel" onClick={() => setEditingLink(null)}>Batal</button>
                <button type="submit" className="modal-btn confirm" disabled={actionLoading === editingLink.id}>
                  {actionLoading === editingLink.id ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
