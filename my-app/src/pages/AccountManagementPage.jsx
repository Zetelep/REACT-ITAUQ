import React, { useEffect, useState, useCallback } from 'react'
import { api } from '../lib/apiClient'
import './AccountRequestsPage.css'

export default function AccountManagementPage() {
  const [admins, setAdmins] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [activeFilter, setActiveFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(null)

  const [createModal, setCreateModal] = useState(false)
  const [editModal, setEditModal] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [formError, setFormError] = useState('')

  const fetchAdmins = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page, page_size: 10 }
      if (activeFilter !== '') params.is_active = activeFilter
      const data = await api.get('/administrators', { params })
      setAdmins(Array.isArray(data) ? data : [])
      if (data?.meta) {
        setTotalPages(data.meta.total_pages || 1)
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat data administrator.')
      setAdmins([])
    } finally {
      setLoading(false)
    }
  }, [page, activeFilter])

  useEffect(() => {
    fetchAdmins()
  }, [fetchAdmins])

  const handleFilterChange = (e) => {
    setActiveFilter(e.target.value)
    setPage(1)
  }

  const openCreateModal = () => {
    setFormName('')
    setFormEmail('')
    setFormError('')
    setCreateModal(true)
  }

  const openEditModal = (admin) => {
    setEditModal(admin)
    setFormName(admin.full_name || '')
    setFormActive(admin.is_active !== false)
    setFormError('')
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setFormError('')
    if (!formName.trim() || !formEmail.trim()) {
      setFormError('Nama dan email wajib diisi.')
      return
    }
    setActionLoading('create')
    try {
      await api.post('/administrators', {
        full_name: formName.trim(),
        email: formEmail.trim(),
      })
      setCreateModal(false)
      fetchAdmins()
    } catch (err) {
      setFormError(err.message || 'Gagal membuat akun administrator.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    if (!editModal) return
    setFormError('')
    if (!formName.trim()) {
      setFormError('Nama tidak boleh kosong.')
      return
    }
    setActionLoading('edit')
    try {
      await api.patch(`/administrators/${editModal.id}`, {
        full_name: formName.trim(),
        is_active: formActive,
      })
      setEditModal(null)
      fetchAdmins()
    } catch (err) {
      setFormError(err.message || 'Gagal memperbarui administrator.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setActionLoading('delete')
    try {
      await api.del(`/administrators/${deleteConfirm.id}`)
      setDeleteConfirm(null)
      fetchAdmins()
    } catch (err) {
      alert(err.message || 'Gagal menghapus administrator.')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Manajemen Akun</h1>
        <div className="page-filters">
          <select
            className="filter-select"
            value={activeFilter}
            onChange={handleFilterChange}
          >
            <option value="">Semua</option>
            <option value="true">Aktif</option>
            <option value="false">Nonaktif</option>
          </select>
          <button className="primary-btn-sm" onClick={openCreateModal}>
            + Tambah Admin
          </button>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      <div className="data-table-card">
        {loading ? (
          <div className="table-loading">Memuat data...</div>
        ) : admins.length === 0 ? (
          <div className="table-empty">Tidak ada administrator ditemukan.</div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Email</th>
                  <th>Institusi</th>
                  <th>Status</th>
                  <th>Ubah Password</th>
                  <th>Tanggal</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id}>
                    <td className="td-name">{admin.full_name}</td>
                    <td>{admin.email}</td>
                    <td>{admin.institution || '—'}</td>
                    <td>
                      <span className={`status-badge ${admin.is_active !== false ? 'badge-approved' : 'badge-rejected'}`}>
                        {admin.is_active !== false ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td>
                      {admin.must_change_password ? (
                        <span className="status-badge badge-pending">Belum</span>
                      ) : (
                        <span className="status-badge badge-approved">Sudah</span>
                      )}
                    </td>
                    <td className="td-date">
                      {admin.created_at ? new Date(admin.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="td-actions">
                      <div className="action-btns">
                        <button
                          className="action-btn edit"
                          onClick={() => openEditModal(admin)}
                          title="Edit"
                        >
                          ✏
                        </button>
                        <button
                          className="action-btn delete"
                          onClick={() => setDeleteConfirm(admin)}
                          title="Hapus"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="table-pagination">
            <button
              className="pagination-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              ← Sebelumnya
            </button>
            <span className="pagination-info">Halaman {page} dari {totalPages}</span>
            <button
              className="pagination-btn"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Berikutnya →
            </button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {createModal && (
        <div className="modal-overlay" onClick={() => setCreateModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Tambah Administrator</h2>
            <p className="modal-desc">Buat akun administrator baru. Undangan akan dikirim via email.</p>
            <form onSubmit={handleCreate}>
              {formError && <div className="change-pw-error" style={{ marginBottom: 14 }}>{formError}</div>}
              <div className="modal-field">
                <label>Nama Lengkap</label>
                <input
                  className="modal-input"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Masukkan nama lengkap"
                  autoFocus
                />
              </div>
              <div className="modal-field">
                <label>Email</label>
                <input
                  className="modal-input"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="administrator@example.com"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="modal-btn cancel" onClick={() => setCreateModal(false)}>
                  Batal
                </button>
                <button type="submit" className="modal-btn confirm" disabled={actionLoading !== null}>
                  {actionLoading === 'create' ? 'Membuat...' : 'Buat Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Edit Administrator</h2>
            <p className="modal-desc">{editModal.email}</p>
            <form onSubmit={handleEdit}>
              {formError && <div className="change-pw-error" style={{ marginBottom: 14 }}>{formError}</div>}
              <div className="modal-field">
                <label>Nama Lengkap</label>
                <input
                  className="modal-input"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="modal-field">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#0f766e' }}
                  />
                  Akun Aktif
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="modal-btn cancel" onClick={() => setEditModal(null)}>
                  Batal
                </button>
                <button type="submit" className="modal-btn confirm" disabled={actionLoading !== null}>
                  {actionLoading === 'edit' ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Hapus Administrator</h2>
            <p className="modal-desc">
              Anda yakin ingin menghapus akun <strong>{deleteConfirm.full_name}</strong> ({deleteConfirm.email})?
              Tindakan ini akan menghapus semua data terkait (kuesioner, responden, dll) dan tidak dapat dibatalkan.
            </p>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setDeleteConfirm(null)}>
                Batal
              </button>
              <button
                className="modal-btn confirm-reject"
                onClick={handleDelete}
                disabled={actionLoading !== null}
              >
                {actionLoading === 'delete' ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
