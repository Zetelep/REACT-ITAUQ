import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useProfile } from '../../app/providers/ProfileProvider'
import { api } from '../../shared/api/apiClient'
import './HasilPage.css'

const CATEGORY_NAMES = [
  'Attractiveness',
  'Efficiency',
  'Dependability',
  'Stimulation',
  'Trust',
  'Novelty',
  'User Satisfaction',
  'Accessibility',
  'Social Interaction',
  'Learnability',
]

const CATEGORY_COLORS = [
  '#0f766e', '#0d9488', '#14b8a6', '#2dd4bf', '#115e59',
  '#134e4a', '#1e3a5f', '#2563eb', '#7c3aed', '#db2777',
]

const LIKERT_MIN = 1
const LIKERT_MAX = 7

function formatScore(value) {
  if (value == null) return '—'
  return Number(value).toFixed(2)
}

function normalizedToRaw(normalized) {
  if (normalized == null) return null
  return (normalized / 100) * (LIKERT_MAX - LIKERT_MIN) + LIKERT_MIN
}

function formatDuration(seconds) {
  if (seconds == null || seconds <= 0) return '—'
  const totalSeconds = Math.round(seconds)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function normalizeRespondentCategories(categoryScores) {
  if (!Array.isArray(categoryScores)) return CATEGORY_NAMES.map((name, i) => ({ category: name, avg_raw_score: null, normalized_score: null, color: CATEGORY_COLORS[i] }))
  return CATEGORY_NAMES.map((name, i) => {
    const found = categoryScores.find((c) => c.category === name)
    return {
      category: name,
      avg_raw_score: found?.avg_raw_score ?? null,
      normalized_score: found?.normalized_score ?? null,
      color: CATEGORY_COLORS[i],
    }
  })
}

function normalizeReportCategories(categoryAverages) {
  if (!Array.isArray(categoryAverages)) return CATEGORY_NAMES.map((name, i) => ({ category: name, avg_raw_score: null, normalized_score: null, color: CATEGORY_COLORS[i] }))
  return CATEGORY_NAMES.map((name, i) => {
    const found = categoryAverages.find((c) => c.category === name)
    const normalizedAvg = found?.normalized_score_avg ?? null
    return {
      category: name,
      avg_raw_score: normalizedToRaw(normalizedAvg),
      normalized_score: normalizedAvg,
      color: CATEGORY_COLORS[i],
    }
  })
}

function computeOverallFromCategories(categoryScores) {
  const scores = categoryScores
    .map((c) => c.avg_raw_score)
    .filter((s) => s != null)
  if (scores.length === 0) return null
  return scores.reduce((sum, s) => sum + s, 0) / scores.length
}

export default function HasilPage() {
  const { questionnaireId } = useParams()

  if (questionnaireId) {
    return <ReportDetail questionnaireId={questionnaireId} />
  }

  return <ReportList />
}

function ReportList() {
  const navigate = useNavigate()
  const { profile } = useProfile()
  const [questionnaires, setQuestionnaires] = useState([])
  const [reports, setReports] = useState({})
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [reportsLoading, setReportsLoading] = useState(false)
  const [error, setError] = useState('')

  const isSuperAdmin = profile?.role === 'super_admin'

  // Only super_admin can see SUS Score
  const showSusScore = isSuperAdmin

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      setLoading(true)
      setError('')
      try {
        const params = { page, page_size: 20 }
        if (!isSuperAdmin && profile?.id) {
          params.administrator_id = profile.id
        }
        const result = await api.get('/questionnaires', { params, includeMeta: true })
        const items = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : []
        const meta = result?.meta
        if (cancelled) return
        setQuestionnaires(items)
        setTotalPages(meta?.total_pages || 1)
        setLoading(false)

        setReportsLoading(true)
        const reportResults = await Promise.allSettled(
          items.map((q) => api.get(`/questionnaires/${q.id}/report`))
        )
        if (cancelled) return
        const reportMap = {}
        reportResults.forEach((r, i) => {
          if (r.status === 'fulfilled') reportMap[items[i].id] = r.value
        })
        setReports(reportMap)
      } catch (err) {
        if (!cancelled) {
          setQuestionnaires([])
          setError(err.message || 'Gagal memuat data laporan.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          setReportsLoading(false)
        }
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [page, profile, isSuperAdmin])

  return (
    <div className="page-container hasil-page">
      <div className="page-header">
        <div>
          <p className="page-eyebrow">ITAUQ</p>
          <h1>Hasil Evaluasi</h1>
          <p className="page-subtitle">Pantau skor usability dari seluruh evaluasi yang telah dilakukan.</p>
        </div>
      </div>

      {error && <div className="page-error" role="alert">{error}</div>}

      <section className="data-table-card hasil-board">
        <div className="hasil-board-header">
          <div>
            <p className="board-eyebrow">Laporan</p>
            <h2>Daftar laporan evaluasi</h2>
            <p>Pilih evaluasi untuk melihat skor I-TAUQ, performa task, dan detail responden.</p>
          </div>
          <span className="board-count">{questionnaires.length} item</span>
        </div>

        {loading ? (
          <div className="table-loading">Memuat laporan evaluasi...</div>
        ) : questionnaires.length === 0 ? (
          <div className="table-empty">
            <span className="empty-state-icon" aria-hidden="true">📊</span>
            <strong>Belum ada laporan.</strong>
            <span>Responden belum menyelesaikan evaluasi apa pun.</span>
          </div>
        ) : (
          <div className="hasil-card-grid">
            {questionnaires.map((q) => {
              const report = reports[q.id]
              const hasReport = report && report.respondent_count > 0
              const categoryScores = hasReport ? normalizeReportCategories(report.category_averages) : []
              const overallScore = hasReport ? computeOverallFromCategories(categoryScores) : null
              return (
                <article className="hasil-card" key={q.id}>
                  <div className="hasil-card-topline">
                    <span className={`status-badge ${q.status === 'active' ? 'badge-approved' : q.status === 'closed' ? 'badge-rejected' : 'badge-pending'}`}>
                      {q.status === 'active' ? 'Aktif' : q.status === 'closed' ? 'Selesai' : 'Draft'}
                    </span>
                  </div>
                  <div className="hasil-card-body">
                    <p className="hasil-card-app">{q.app_name || '—'}</p>
                    <h3 className="hasil-card-title">{q.title}</h3>
                  </div>
                  {hasReport ? (
                    <div className="hasil-card-scores">
                      <div className="hasil-card-score-main">
                        <span className="hasil-card-score-label">Skor I-TAUQ</span>
                        <strong>{formatScore(overallScore)}<small>/7</small></strong>
                      </div>
                      <div className="hasil-card-score-details">
                        <span><small>Responden</small><strong>{report.respondent_count}</strong></span>
                        <span><small>Task Success</small><strong>{report.task_success_rate_avg != null ? `${report.task_success_rate_avg.toFixed(1)}%` : '—'}</strong></span>
                        {showSusScore && (
                          <span><small>SUS Score</small><strong>{report.evaluation_website_sus_score_avg != null ? report.evaluation_website_sus_score_avg.toFixed(1) : '—'}</strong></span>
                        )}
                      </div>
                    </div>
                  ) : reportsLoading ? (
                    <div className="hasil-card-empty">
                      <span className="hasil-card-skeleton">Memuat skor...</span>
                    </div>
                  ) : (
                    <div className="hasil-card-empty">
                      <span>Belum ada data responden</span>
                    </div>
                  )}
                  <button className="hasil-card-open" onClick={() => navigate(`/admin/hasil/${q.id}`)}>
                    Lihat Hasil <span aria-hidden="true">↗</span>
                  </button>
                </article>
              )
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="table-pagination">
            <button className="pagination-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>← Sebelumnya</button>
            <span className="pagination-info">Halaman {page} dari {totalPages}</span>
            <button className="pagination-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Berikutnya →</button>
          </div>
        )}
      </section>
    </div>
  )
}

function ReportDetail({ questionnaireId }) {
  const navigate = useNavigate()
  const { profile } = useProfile()
  const [report, setReport] = useState(null)
  const [questionnaire, setQuestionnaire] = useState(null)
  const [tasks, setTasks] = useState([])
  const [respondents, setRespondents] = useState([])
  const [respondentsMeta, setRespondentsMeta] = useState(null)
  const [respPage, setRespPage] = useState(1)
  const [selectedRespondent, setSelectedRespondent] = useState(null)
  const [taskStats, setTaskStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [respLoading, setRespLoading] = useState(false)
  const [error, setError] = useState('')

  // Only super_admin can see SUS Score
  const showSusScore = profile?.role === 'super_admin'

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [reportData, taskData, respondentResult] = await Promise.all([
        api.get(`/questionnaires/${questionnaireId}/report`),
        api.get(`/questionnaires/${questionnaireId}/task-scenarios`),
        api.get('/respondents', {
          params: { questionnaire_id: questionnaireId, page: 1, page_size: 10 },
          includeMeta: true,
        }),
      ])
      setReport(reportData)
      setQuestionnaire(reportData.questionnaire)
      setTasks(Array.isArray(taskData) ? taskData : [])
      const respondentItems = Array.isArray(respondentResult?.data) ? respondentResult.data : Array.isArray(respondentResult) ? respondentResult : []
      setRespondents(respondentItems)
      setRespondentsMeta(respondentResult?.meta || null)
      setRespPage(1)

      const statsData = await api.get(`/questionnaires/${questionnaireId}/task-scenarios/stats`)
      setTaskStats(Array.isArray(statsData?.task_scenarios) ? statsData.task_scenarios : [])
    } catch (err) {
      setError(err.message || 'Gagal memuat laporan evaluasi.')
    } finally {
      setLoading(false)
    }
  }, [questionnaireId])

  const fetchRespondents = useCallback(async () => {
    setRespLoading(true)
    try {
      const result = await api.get('/respondents', {
        params: { questionnaire_id: questionnaireId, page: respPage, page_size: 10 },
        includeMeta: true,
      })
      const items = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : []
      setRespondents(items)
      setRespondentsMeta(result?.meta || null)
    } catch {
      // keep existing data on pagination error
    } finally {
      setRespLoading(false)
    }
  }, [questionnaireId, respPage])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  const respInitial = useRef(true)

  useEffect(() => {
    if (respInitial.current) {
      respInitial.current = false
      return
    }
    fetchRespondents()
  }, [fetchRespondents])

  if (loading) {
    return <div className="page-container hasil-page"><div className="detail-loading">Memuat laporan evaluasi...</div></div>
  }

  if (error && !report) {
    return (
      <div className="page-container hasil-page">
        <button className="back-link" onClick={() => navigate('/admin/hasil')}>← Kembali ke daftar laporan</button>
        <div className="page-error" role="alert">{error}</div>
      </div>
    )
  }

  if (!report) return null

  const categoryScores = normalizeReportCategories(report.category_averages)
  const overallScore = computeOverallFromCategories(categoryScores)

  return (
    <div className="page-container hasil-page hasil-detail-page">
      <button className="back-link" onClick={() => navigate('/admin/hasil')}>← Kembali ke daftar laporan</button>
      {error && <div className="page-error" role="alert">{error}</div>}

      <section className="hasil-hero">
        <div className="hasil-hero-left">
          <div className="hasil-hero-info">
            <p className="hasil-hero-eyebrow">INDONESIAN TOURISM USABILITY QUESTIONNAIRE DASHBOARD</p>
            <div className="hasil-hero-title-group">
              <p className="hasil-hero-app">{questionnaire?.app_name}</p>
              <h1>{questionnaire?.title}</h1>
            </div>
          </div>
          <div className="hasil-score-card">
            <div className="hasil-score-label">I-TAUQ SCORE</div>
            <div className="hasil-score-value">
              <span className="hasil-score-number">{formatScore(overallScore)}</span>
              <span className="hasil-score-scale">/ 7</span>
            </div>
            <div className="hasil-score-meta">{report.respondent_count} responden</div>
          </div>
          <div className="hasil-hero-actions">
            <button className="hasil-action-btn" onClick={() => document.getElementById('hasil-respondents')?.scrollIntoView({ behavior: 'smooth' })}>
              <span>📋</span> Detail Responden
            </button>
            <button className="hasil-action-btn" onClick={() => navigate(`/admin/evaluasi/${questionnaireId}`)}>
              <span>🔗</span> Kelola Evaluasi
            </button>
          </div>
        </div>

        <div className="hasil-hero-right">
          <section className="hasil-task-section">
            <div className="hasil-task-header">
              <h2>Scenario Task Performance</h2>
            </div>
            {tasks.length === 0 ? (
              <div className="hasil-task-empty">Belum ada task scenario.</div>
            ) : (
              <div className="hasil-task-table-wrap">
                <table className="hasil-task-table">
                  <thead>
                    <tr>
                      <th>Task Name</th>
                      <th>Avg Completion Time</th>
                      <th>Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => {
                      const stats = taskStats.find((s) => s.task_scenario_id === task.id)
                      const avgTime = stats?.avg_completion_time ?? null
                      const rate = stats?.completion_rate ?? null
                      return (
                        <tr key={task.id}>
                          <td>
                            <strong>{task.title}</strong>
                            {task.instruction && <small>{task.instruction}</small>}
                          </td>
                          <td>{formatDuration(avgTime)}</td>
                          <td>
                            <span className={`hasil-rate ${rate != null && rate >= 80 ? 'rate-good' : rate != null && rate >= 50 ? 'rate-mid' : ''}`}>
                              {rate != null ? `${rate.toFixed(0)}%` : '—'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </section>

      <section className="hasil-metrics-section">
        <div className="hasil-metrics-header">
          <h2>I-TAUQ Metric Score</h2>
        </div>
        <div className="hasil-metrics-grid">
          {categoryScores.map((cat) => (
            <article className="hasil-metric-card" key={cat.category}>
              <div className="hasil-metric-icon" style={{ background: `${cat.color}18`, color: cat.color }}>
                {cat.category.charAt(0)}
              </div>
              <span className="hasil-metric-name">{cat.category}</span>
              <strong className="hasil-metric-score">{formatScore(cat.avg_raw_score)}<small>/7</small></strong>
            </article>
          ))}
        </div>
      </section>

      <section className="hasil-respondents-section" id="hasil-respondents">
        <div className="hasil-respondents-header">
          <div>
            <h2>Detail Responden</h2>
            <p>Daftar responden yang telah menyelesaikan evaluasi ini.</p>
          </div>
          <span className="board-count">{respondentsMeta?.total || respondents.length} responden</span>
        </div>

        {respondents.length === 0 && !respLoading ? (
          <div className="table-empty">
            <strong>Belum ada responden.</strong>
          </div>
        ) : (
          <div className="table-scroll hasil-resp-table-wrap">
            {respLoading && <div className="hasil-resp-loading">Memuat responden...</div>}
            <table className="data-table hasil-respondent-table" style={{ opacity: respLoading ? 0.4 : 1 }}>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Skor I-TAUQ</th>
                  <th>Task Success</th>
                  {showSusScore && <th>SUS Score</th>}
                  <th>Tanggal Submit</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {respondents.map((r) => {
                  const rawScore = normalizedToRaw(r.overall_usability_score)
                  return (
                    <tr key={r.respondent_id}>
                      <td><strong>{r.respondent_name}</strong></td>
                      <td>{rawScore != null ? `${formatScore(rawScore)}/7` : '—'}</td>
                      <td>{r.task_success_rate_pct != null ? `${r.task_success_rate_pct.toFixed(1)}%` : '—'}</td>
                      {showSusScore && (
                        <td>{r.evaluation_website_sus_score != null ? r.evaluation_website_sus_score.toFixed(1) : '—'}</td>
                      )}
                      <td>{formatDate(r.submitted_at)}</td>
                      <td>
                        <button className="text-action" onClick={() => fetchRespondentDetail(r.respondent_id)}>
                          Detail
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {respondentsMeta && respondentsMeta.total_pages > 1 && (
          <div className="table-pagination">
            <button className="pagination-btn" onClick={() => setRespPage((p) => Math.max(1, p - 1))} disabled={respPage <= 1}>← Sebelumnya</button>
            <span className="pagination-info">Halaman {respPage} dari {respondentsMeta.total_pages}</span>
            <button className="pagination-btn" onClick={() => setRespPage((p) => Math.min(respondentsMeta.total_pages, p + 1))} disabled={respPage >= respondentsMeta.total_pages}>Berikutnya →</button>
          </div>
        )}
      </section>

      {selectedRespondent && (
        <RespondentDetailModal
          respondent={selectedRespondent}
          onClose={() => setSelectedRespondent(null)}
        />
      )}
    </div>
  )

  async function fetchRespondentDetail(id) {
    try {
      const data = await api.get(`/respondents/${id}`)
      setSelectedRespondent(data)
    } catch (err) {
      setError(err.message || 'Gagal memuat detail responden.')
    }
  }
}

function RespondentDetailModal({ respondent, onClose }) {
  const { profile } = useProfile()
  const categoryScores = normalizeRespondentCategories(respondent.category_scores)
  const overallRaw = respondent.overall_usability_score != null
    ? normalizedToRaw(respondent.overall_usability_score)
    : computeOverallFromCategories(categoryScores)

  // Only super_admin can see SUS Score
  const showSusScore = profile?.role === 'super_admin'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card hasil-respondent-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hasil-respondent-modal-header">
          <h2>{respondent.respondent?.name || 'Responden'}</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Tutup">&times;</button>
        </div>

        <div className="hasil-respondent-info">
          <span><small>Usia</small><strong>{respondent.respondent?.age || '—'}</strong></span>
          <span><small>Gender</small><strong>{respondent.respondent?.gender || '—'}</strong></span>
          <span><small>Pekerjaan</small><strong>{respondent.respondent?.occupation || '—'}</strong></span>
        </div>

        <div className="hasil-respondent-score-hero">
          <div className="hasil-respondent-score-label">Skor I-TAUQ</div>
          <div className="hasil-respondent-score-value">
            <span>{formatScore(overallRaw)}</span>
            <small>/7</small>
          </div>
        </div>

        <div className="hasil-respondent-categories">
          <h3>Skor Per Kategori</h3>
          <div className="hasil-respondent-cat-grid">
            {categoryScores.map((cat) => (
              <div className="hasil-respondent-cat-item" key={cat.category}>
                <span className="hasil-respondent-cat-name">{cat.category}</span>
                <div className="hasil-respondent-cat-bar-wrap">
                  <div className="hasil-respondent-cat-bar" style={{ width: `${cat.avg_raw_score != null ? (cat.avg_raw_score / 7) * 100 : 0}%`, background: cat.color }} />
                </div>
                <span className="hasil-respondent-cat-score">{formatScore(cat.avg_raw_score)}/7</span>
              </div>
            ))}
          </div>
        </div>

        {respondent.task_results && respondent.task_results.length > 0 && (
          <div className="hasil-respondent-tasks">
            <h3>Hasil Task</h3>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Status</th>
                    <th>Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {respondent.task_results.map((tr) => (
                    <tr key={tr.task_scenario_id}>
                      <td>{tr.title}</td>
                      <td>
                        <span className={`status-badge ${tr.is_success === true ? 'badge-approved' : tr.is_success === false ? 'badge-rejected' : 'badge-pending'}`}>
                          {tr.is_success === true ? 'Berhasil' : tr.is_success === false ? 'Gagal' : 'Dilewati'}
                        </span>
                      </td>
                      <td>{formatDuration(tr.duration_seconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showSusScore && respondent.evaluation_website_sus && (
          <div className="hasil-respondent-sus">
            <h3>Evaluation Website SUS</h3>
            <p>
              Items answered: <strong>{respondent.evaluation_website_sus.answered_items}</strong> &middot;{' '}
              Score: <strong>{respondent.evaluation_website_sus.sus_score != null ? respondent.evaluation_website_sus.sus_score.toFixed(1) : '—'}</strong>
            </p>
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="modal-btn cancel" onClick={onClose}>Tutup</button>
        </div>
      </div>
    </div>
  )
}
