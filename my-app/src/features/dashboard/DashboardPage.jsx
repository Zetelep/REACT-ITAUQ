import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../../app/providers/ProfileProvider'
import { api } from '../../shared/api/apiClient'

const EMPTY_STATS = {
  total: null,
  active: null,
  closed: null,
}

function getTotal(result) {
  return result?.meta?.total ?? 0
}

function getItems(result) {
  return Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : []
}

function formatStatus(status) {
  const labels = {
    draft: 'Draft',
    active: 'Aktif',
    closed: 'Selesai',
  }
  return labels[status] || status || '—'
}

function statusClass(status) {
  return status === 'closed' ? 'done' : status === 'active' ? 'waiting' : ''
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { profile } = useProfile()
  const [stats, setStats] = useState(EMPTY_STATS)
  const [latestEvaluations, setLatestEvaluations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const scopeParams = profile?.role === 'super_admin' && profile.id
        ? { administrator_id: profile.id }
        : {}
      const [allResult, activeResult, closedResult, latestResult] = await Promise.all([
        api.get('/questionnaires', { params: { ...scopeParams, page: 1, page_size: 1 }, includeMeta: true }),
        api.get('/questionnaires', { params: { ...scopeParams, page: 1, page_size: 1, status: 'active' }, includeMeta: true }),
        api.get('/questionnaires', { params: { ...scopeParams, page: 1, page_size: 1, status: 'closed' }, includeMeta: true }),
        api.get('/questionnaires', { params: { ...scopeParams, page: 1, page_size: 3 }, includeMeta: true }),
      ])

      const latest = getItems(latestResult)
        .sort((left, right) => new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime())

      setStats({
        total: getTotal(allResult),
        active: getTotal(activeResult),
        closed: getTotal(closedResult),
      })
      setLatestEvaluations(latest)
    } catch (err) {
      setStats(EMPTY_STATS)
      setLatestEvaluations([])
      setError(err.message || 'Gagal memuat data dashboard.')
    } finally {
      setLoading(false)
    }
  }, [profile?.id, profile?.role])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const statValue = (value) => loading ? '…' : value ?? '—'

  return (
    <div className="dashboard-content">
      <div className="dashboard-header-card large">
        <div className="header-left">
          <h2 className="header-title">Dashboard Evaluasi Usability</h2>
          <p className="header-desc">Indonesian Tourism Application Usability Questionnaire — buat, kelola, dan pantau evaluasi usability aplikasi pariwisata Anda dalam satu tempat.</p>
          <div className="header-actions">
            <button className="primary-btn" onClick={() => navigate('/admin/evaluasi')}>+ Buat Evaluasi</button>
          </div>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      <div className="stats-row">
        <div className="stat-card boxed">
          <div className="stat-title">Total Evaluasi</div>
          <div className="stat-value">{statValue(stats.total)}</div>
        </div>
        <div className="stat-card boxed">
          <div className="stat-title">Evaluasi Aktif</div>
          <div className="stat-value">{statValue(stats.active)}</div>
        </div>
        <div className="stat-card boxed">
          <div className="stat-title">Evaluasi Selesai</div>
          <div className="stat-value">{statValue(stats.closed)}</div>
        </div>
      </div>

      <section className="latest-section">
        <div className="latest-header-row">
          <h3 className="latest-title">Evaluasi Terbaru</h3>
          <button className="archive-link" onClick={() => navigate('/admin/evaluasi')}>Buka Arsip</button>
        </div>

        <div className="latest-cards">
          {loading ? (
            <div className="table-loading">Memuat data evaluasi...</div>
          ) : latestEvaluations.length === 0 ? (
            <div className="table-empty">Belum ada evaluasi.</div>
          ) : (
            latestEvaluations.map((evaluation) => (
              <EvaluationSummary
                key={evaluation.id}
                evaluation={evaluation}
                onClick={() => navigate(`/admin/evaluasi/${evaluation.id}`)}
              />
            ))
          )}
        </div>
      </section>
    </div>
  )
}

function EvaluationSummary({ evaluation, onClick }) {
  const status = formatStatus(evaluation.status)
  const title = evaluation.app_name || evaluation.title || 'Evaluasi tanpa nama'

  return (
    <div className="latest-card">
      <div className="card-icon">📄</div>
      <div className="card-body">
        <div className="card-title">{title}</div>
        <span className={`status-badge ${statusClass(evaluation.status)}`}>{status}</span>
      </div>
      <button className="card-action" onClick={onClick} aria-label={`Buka evaluasi ${title}`}>Buka</button>
    </div>
  )
}
