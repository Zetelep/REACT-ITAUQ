import React, { useEffect, useId, useRef, useState, useCallback } from 'react'
import { api } from '../../shared/api/apiClient'
import { useModalDialog } from '../../shared/clients/modalDialog'
import ConfirmDialog from '../../shared/ui/ConfirmDialog'
import './AccountRequestsPage.css'

export default function AccountRequestsPage() {
  const [applications, setApplications] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rejectModal, setRejectModal] = useState(null)
  const [approveTarget, setApproveTarget] = useState(null)
  const [reviewNote, setReviewNote] = useState('')
  const [actionLoading, setActionLoading] = useState(null)
  const rejectDialogRef = useRef(null)
  const rejectTitleId = useId()

  useModalDialog({
    open: Boolean(rejectModal),
    dialogRef: rejectDialogRef,
    onClose: () => setRejectModal(null),
  })

  const fetchApplications = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page, page_size: 10 }
      if (statusFilter) params.status = statusFilter
      const data = await api.get('/applications', { params })
      setApplications(Array.isArray(data) ? data : [])
      if (data?.meta) {
        setTotalPages(data.meta.total_pages || 1)
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat data pengajuan.')
      setApplications([])
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  const handleFilterChange = (e) => {
    setStatusFilter(e.target.value)
    setPage(1)
  }

  const handleApprove = async (id) => {
    setActionLoading(id)
    setError('')
    try {
      await api.patch(`/applications/${id}/approve`)
      setApproveTarget(null)
      fetchApplications()
    } catch (err) {
      setError(err.message || 'Gagal menyetujui pengajuan.')
    } finally {
      setActionLoading(null)
    }
  }

  const openRejectModal = (id) => {
    setRejectModal(id)
    setReviewNote('')
  }

  const handleReject = async () => {
    if (!rejectModal) return
    setActionLoading(rejectModal)
    setError('')
    try {
      await api.patch(`/applications/${rejectModal}/reject`, { review_note: reviewNote || undefined })
      setRejectModal(null)
      setReviewNote('')
      fetchApplications()
    } catch (err) {
      setError(err.message || 'Gagal menolak pengajuan.')
    } finally {
      setActionLoading(null)
    }
  }

  const statusBadge = (status) => {
    const classes = {
      pending: 'badge-pending',
      approved: 'badge-approved',
      rejected: 'badge-rejected',
    }
    const labels = {
      pending: 'Menunggu',
      approved: 'Disetujui',
      rejected: 'Ditolak',
    }
    return <span className={`status-badge ${classes[status] || ''}`}>{labels[status] || status}</span>
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Pengajuan Akun</h1>
        <div className="page-filters">
          <select
            className="filter-select"
            value={statusFilter}
            onChange={handleFilterChange}
            aria-label="Filter status pengajuan"
          >
            <option value="">Semua Status</option>
            <option value="pending">Menunggu</option>
            <option value="approved">Disetujui</option>
            <option value="rejected">Ditolak</option>
          </select>
        </div>
      </div>

      {error && <div className="page-error" role="alert">{error}</div>}

      <div className="data-table-card">
        {loading ? (
          <div className="table-loading" role="status">Memuat data...</div>
        ) : applications.length === 0 ? (
          <div className="table-empty">Tidak ada pengajuan ditemukan.</div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Email</th>
                  <th>Institusi</th>
                  <th>Pekerjaan</th>
                  <th>Status</th>
                  <th>Tanggal</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id}>
                    <td className="td-name">{app.full_name}</td>
                    <td>{app.email}</td>
                    <td>{app.institution || '—'}</td>
                    <td>{app.occupation || '—'}</td>
                    <td>{statusBadge(app.status)}</td>
                    <td className="td-date">
                      {app.created_at ? new Date(app.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="td-actions">
                      {app.status === 'pending' && (
                        <div className="action-btns">
                          <button
                            className="action-btn approve"
                            type="button"
                            onClick={() => setApproveTarget(app)}
                            disabled={actionLoading === app.id}
                            title="Setujui"
                            aria-label={`Setujui pengajuan ${app.full_name}`}
                          >
                            <span aria-hidden="true">{actionLoading === app.id ? '…' : '✓'}</span>
                          </button>
                          <button
                            className="action-btn reject"
                            type="button"
                            onClick={() => openRejectModal(app.id)}
                            disabled={actionLoading === app.id}
                            title="Tolak"
                            aria-label={`Tolak pengajuan ${app.full_name}`}
                          >
                            <span aria-hidden="true">✗</span>
                          </button>
                        </div>
                      )}
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

      {/* Reject Modal */}
      {rejectModal && (
        <div className="modal-overlay" onClick={() => setRejectModal(null)}>
          <div
            ref={rejectDialogRef}
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby={rejectTitleId}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="modal-title" id={rejectTitleId}>Tolak Pengajuan</h2>
            <p className="modal-desc">Berikan catatan alasan penolakan (opsional).</p>
            <textarea
              className="modal-textarea"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Contoh: Data institusi tidak dapat diverifikasi."
              aria-label="Catatan alasan penolakan"
              rows={3}
            />
            <div className="modal-actions">
              <button className="modal-btn cancel" type="button" onClick={() => setRejectModal(null)}>
                Batal
              </button>
              <button
                className="modal-btn confirm-reject"
                type="button"
                onClick={handleReject}
                disabled={actionLoading !== null}
              >
                {actionLoading !== null ? 'Menolak...' : 'Tolak Pengajuan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {approveTarget && (
        <ConfirmDialog
          title="Setujui pengajuan"
          description={`Akun administrator untuk ${approveTarget.full_name} (${approveTarget.email}) akan dibuat dan undangannya dikirim lewat email.`}
          confirmLabel={actionLoading === approveTarget.id ? 'Menyetujui…' : 'Setujui pengajuan'}
          busy={actionLoading === approveTarget.id}
          onConfirm={() => handleApprove(approveTarget.id)}
          onClose={() => setApproveTarget(null)}
        />
      )}
    </div>
  )
}
