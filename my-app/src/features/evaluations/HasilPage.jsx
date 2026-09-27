import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useProfile } from '../../app/providers/ProfileProvider'
import { api } from '../../shared/api/apiClient'
import { useModalDialog, scrollBehavior } from '../../shared/clients/modalDialog'
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

const LIKERT_MIN = 1
const LIKERT_MAX = 7

// The respondents endpoint caps at 100 per page. Loading the full set in one request
// is what makes client-side sorting truthful: sorting one page of ten would reorder
// a slice and imply a ranking the user cannot see.
const RESPONDENT_LIMIT = 100

// ─── Interpretation bands ───
// The band is a classification, not a caption. It decides the hue of the score on the
// 0–7 instrument and the screen-reader description of that figure; it is not printed
// beside the number. A visible "Baik" chip on top of a 5.64 that already sits between
// 5 and 6 on the axis restates what the instrument shows and gives the eye one more
// thing to read.
const ITAUQ_BANDS = [
  { min: 5.21, label: 'sangat baik', color: '#047857' },
  { min: 4.21, label: 'baik', color: '#0f766e' },
  { min: 3.21, label: 'cukup', color: '#b45309' },
  { min: 2.21, label: 'kurang', color: '#c2410c' },
  { min: -Infinity, label: 'sangat kurang', color: '#b42318' },
]

const NO_DATA_BAND = { label: 'belum ada data', color: '#526460' }

// SUS uses the adjective grading from the dedicated SUS report (Excellent /
// Acceptable / Marginal / Poor, 80 / 68 / 50), so a score reads the same way on both
// screens. The old Indonesian bands were a different, invented cut-off and made the
// same number mean two different things.
const SUS_BANDS = [
  { min: 80, label: 'Excellent', color: '#0f766e', tint: '#ccfbf1' },
  { min: 68, label: 'Acceptable', color: '#059669', tint: '#d1fae5' },
  { min: 50, label: 'Marginal', color: '#b45309', tint: '#fef3c7' },
  { min: -Infinity, label: 'Poor', color: '#dc2626', tint: '#fee2e2' },
]

function itauqBand(raw) {
  if (raw == null) return NO_DATA_BAND
  return ITAUQ_BANDS.find((b) => raw >= b.min)
}

function susBand(score) {
  if (score == null) return null
  return SUS_BANDS.find((b) => score >= b.min)
}

function rateBand(rate) {
  if (rate == null) return 'none'
  if (rate >= 80) return 'good'
  if (rate >= 50) return 'mid'
  return 'low'
}

const RATE_BAND_LABEL = {
  good: 'Tinggi',
  mid: 'Sedang',
  low: 'Rendah',
  none: null,
}

// In the ranked category profile, a bar is coloured by how it sits against the overall
// average, not by its absolute band. Colouring by absolute band made the two weakest
// categories render green while the delta beside them read "-0.98" — the bar and the
// number argued with each other. The absolute band still appears on its own, in the
// verdict figure and each respondent's own profile, where it is the whole point.
const DELTA_STYLE = {
  below: { color: '#b42318', label: 'di bawah rata-rata' },
  above: { color: '#047857', label: 'di atas rata-rata' },
  even: { color: '#64748b', label: 'sepanjang rata-rata' },
}

// ─── Formatting ───
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
  // A leading zero on the minutes column ("00m 45s") reads like a stopwatch, not a
  // duration. The zero is only kept once the hour column is in play.
  if (m === 0) return `${s} detik`
  if (m < 60) return s === 0 ? `${m} menit` : `${m} menit ${s} detik`
  const h = Math.floor(m / 60)
  const remM = m % 60
  return remM === 0 ? `${h} jam` : `${h} jam ${remM} menit`
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// A bar that runs the full 0–7 range, matching the published ITAUQ normalization
// (score/7 × 100). The axis below is labelled on the same 0–7 basis, so a marker at
// 5.64/7 lands between 5 and 6 rather than appearing to sit on 6. Sizing the bar to
// the 1–7 range instead would make every bar look near-full and compress the spread
// that the ranking exists to show.
function barPercent(raw) {
  if (raw == null) return 0
  return Math.max(0, Math.min(100, (raw / LIKERT_MAX) * 100))
}

// ─── Data shaping ───
function normalizeCategoryScores(list, pick) {
  const source = Array.isArray(list) ? list : []
  return CATEGORY_NAMES.map((name) => {
    const found = source.find((c) => c.category === name)
    const raw = found ? pick(found) : null
    return { category: name, raw, band: itauqBand(raw) }
  })
}

function reportCategories(categoryAverages) {
  return normalizeCategoryScores(categoryAverages, (c) => normalizedToRaw(c.normalized_score_avg))
}

function respondentCategories(categoryScores) {
  return normalizeCategoryScores(categoryScores, (c) => c.avg_raw_score)
}

function meanOf(values) {
  const present = values.filter((v) => v != null)
  if (present.length === 0) return null
  return present.reduce((sum, v) => sum + v, 0) / present.length
}

// ─── Report cache ───
// A report does not change while the operator is on the list, and the list is the
// screen people move back to. Cache survives the round trip so scrolling back up
// does not refetch a score that is already on screen.
const reportCache = new Map()

function useLazyReport(questionnaireId) {
  const [state, setState] = useState(() => {
    const cached = reportCache.get(questionnaireId)
    return cached ? { status: 'ready', report: cached, error: '' } : { status: 'idle', report: null, error: '' }
  })
  const [node, setNode] = useState(null)

  useEffect(() => {
    if (state.status !== 'idle' || !node) return undefined

    const load = () => {
      setState((s) => ({ ...s, status: 'loading' }))
      api.get(`/questionnaires/${questionnaireId}/report`)
        .then((data) => {
          reportCache.set(questionnaireId, data)
          setState({ status: 'ready', report: data, error: '' })
        })
        .catch((err) => {
          setState({ status: 'error', report: null, error: err.message || 'Gagal memuat skor.' })
        })
    }

    // Without IntersectionObserver the card cannot report its own visibility, so
    // fetching immediately is the only way to show the score at all.
    if (typeof IntersectionObserver === 'undefined') {
      load()
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        observer.disconnect()
        load()
      },
      { rootMargin: '240px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [node, questionnaireId, state.status])

  return { ref: setNode, ...state }
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
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isSuperAdmin = profile?.role === 'super_admin'

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      setLoading(true)
      setError('')
      try {
        const params = { page, page_size: 20 }
        if (profile?.id) {
          params.administrator_id = profile.id
        }
        const result = await api.get('/questionnaires', { params, includeMeta: true })
        const items = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : []
        if (cancelled) return
        setQuestionnaires(items)
        setTotalPages(result?.meta?.total_pages || 1)
      } catch (err) {
        if (!cancelled) {
          setQuestionnaires([])
          setError(err.message || 'Gagal memuat daftar evaluasi.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [page, profile, isSuperAdmin])

  return (
    <div className="page-container hasil-page">
      <div className="page-header">
        <div>
          <h1>Hasil Evaluasi</h1>
          <p className="page-subtitle">Bandingkan skor usability, lalu buka evaluasi yang perlu ditindaklanjuti.</p>
        </div>
      </div>

      {error && <div className="page-error" role="alert">{error}</div>}

      <section className="hasil-board">
        <div className="hasil-board-header">
          <div>
            <h2>Daftar laporan evaluasi</h2>
            <p>Skor dimuat saat kartu terlihat di layar.</p>
          </div>
          <span className="board-count">{questionnaires.length} item</span>
        </div>

        {loading ? (
          <div className="table-loading" role="status">Memuat daftar evaluasi...</div>
        ) : questionnaires.length === 0 ? (
          <div className="table-empty">
            <strong>Belum ada laporan.</strong>
            <span>Evaluasi akan muncul di sini setelah responden pertama kali menyelesaikan survey.</span>
          </div>
        ) : (
          <div className="hasil-card-grid">
            {questionnaires.map((q) => (
              <ResultCard
                key={q.id}
                questionnaire={q}
                showSusScore={isSuperAdmin}
                onOpen={() => navigate(`/admin/hasil/${q.id}`)}
              />
            ))}
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

function ResultCard({ questionnaire, showSusScore, onOpen }) {
  const { ref, status, report, error } = useLazyReport(questionnaire.id)

  // The API already sends the overall average. Recomputing it from the ten categories
  // silently re-averages over whichever categories happen to be non-null, which drifts
  // from the real value as soon as one respondent is missing an item.
  const overallRaw = report ? normalizedToRaw(report.overall_usability_score_avg) : null
  const band = itauqBand(overallRaw)
  const hasReport = report && report.respondent_count > 0

  return (
    <article className="hasil-card" ref={ref}>
      <div className="hasil-card-topline">
        <span className={`status-badge ${questionnaire.status === 'active' ? 'badge-approved' : questionnaire.status === 'closed' ? 'badge-neutral' : 'badge-pending'}`}>
          {questionnaire.status === 'active' ? 'Aktif' : questionnaire.status === 'closed' ? 'Selesai' : 'Draft'}
        </span>
        <span className="hasil-card-date">{formatDate(questionnaire.created_at)}</span>
      </div>

      <div className="hasil-card-body">
        <p className="hasil-card-app">{questionnaire.app_name || '—'}</p>
        <h3 className="hasil-card-title">{questionnaire.title}</h3>
      </div>

      {status === 'loading' || status === 'idle' ? (
        <div className="hasil-card-skeleton" role="status" aria-label="Memuat skor">
          <span className="hasil-skeleton-line" />
          <span className="hasil-skeleton-line hasil-skeleton-line-short" />
        </div>
      ) : status === 'error' ? (
        <p className="hasil-card-note hasil-card-note-error">{error}</p>
      ) : hasReport ? (
        <>
          <div className="hasil-card-verdict">
            <div className="hasil-card-score">
              <strong>{formatScore(overallRaw)}</strong>
              <span className="hasil-card-scale">/7</span>
            </div>
          </div>
          <p className="hasil-card-normalized">
            Setara <strong>{formatScore(report.overall_usability_score_avg)}</strong> pada skala 0–100
          </p>
          <div className="hasil-bar-track">
            <div className="hasil-bar-fill" style={{ width: `${barPercent(overallRaw)}%`, background: band.color }} />
          </div>
          <dl className="hasil-card-facts">
            <div>
              <dt>Responden</dt>
              <dd>{report.respondent_count}</dd>
            </div>
            <div>
              <dt>Task sukses</dt>
              <dd>{report.task_success_rate_avg != null ? `${report.task_success_rate_avg.toFixed(1)}%` : '—'}</dd>
            </div>
            {showSusScore && (
              <div>
                <dt>SUS</dt>
                <dd>{report.evaluation_website_sus_score_avg != null ? report.evaluation_website_sus_score_avg.toFixed(1) : '—'}</dd>
              </div>
            )}
          </dl>
        </>
      ) : (
        <p className="hasil-card-note">Belum ada responden yang menjawab.</p>
      )}

      <button className="hasil-card-open" onClick={onOpen}>
        Lihat hasil <span aria-hidden="true">→</span>
      </button>
    </article>
  )
}

function ReportDetail({ questionnaireId }) {
  const navigate = useNavigate()
  const { profile } = useProfile()
  const [report, setReport] = useState(null)
  const [questionnaire, setQuestionnaire] = useState(null)
  const [tasks, setTasks] = useState([])
  const [taskStats, setTaskStats] = useState([])
  const [respondents, setRespondents] = useState([])
  const [respondentsTotal, setRespondentsTotal] = useState(0)
  const [selectedRespondent, setSelectedRespondent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortKey, setSortKey] = useState('score_asc')
  const [statusFilter, setStatusFilter] = useState('all')

  const showSusScore = profile?.role === 'super_admin'

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [reportData, taskData, respondentResult, statsData] = await Promise.all([
        api.get(`/questionnaires/${questionnaireId}/report`),
        api.get(`/questionnaires/${questionnaireId}/task-scenarios`),
        api.get('/respondents', {
          params: { questionnaire_id: questionnaireId, page: 1, page_size: RESPONDENT_LIMIT },
          includeMeta: true,
        }),
        api.get(`/questionnaires/${questionnaireId}/task-scenarios/stats`),
      ])

      setReport(reportData)
      setQuestionnaire(reportData?.questionnaire || null)
      setTasks(Array.isArray(taskData) ? taskData : [])
      setTaskStats(Array.isArray(statsData?.task_scenarios) ? statsData.task_scenarios : [])

      const items = Array.isArray(respondentResult?.data)
        ? respondentResult.data
        : Array.isArray(respondentResult) ? respondentResult : []
      setRespondents(items)
      setRespondentsTotal(respondentResult?.meta?.total || items.length)
    } catch (err) {
      setError(err.message || 'Gagal memuat laporan evaluasi.')
    } finally {
      setLoading(false)
    }
  }, [questionnaireId])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  const categories = useMemo(() => reportCategories(report?.category_averages), [report])
  const overallRaw = report ? normalizedToRaw(report.overall_usability_score_avg) : null
  const band = itauqBand(overallRaw)

  const submittedCount = useMemo(
    () => respondents.filter((r) => r.submitted_at != null).length,
    [respondents],
  )
  const countsAreExact = respondentsTotal <= RESPONDENT_LIMIT

  const rows = useMemo(() => respondents.map((r) => ({
    ...r,
    rawScore: normalizedToRaw(r.overall_usability_score),
  })), [respondents])

  const visibleRows = useMemo(() => {
    const filtered = statusFilter === 'all'
      ? rows
      : rows.filter((r) => (statusFilter === 'done' ? r.submitted_at != null : r.submitted_at == null))

    const direction = sortKey.endsWith('_desc') ? -1 : 1
    const base = sortKey.replace(/_(asc|desc)$/, '')

    const value = (r) => {
      if (base === 'score') return r.rawScore
      if (base === 'task') return r.task_success_rate_pct
      if (base === 'date') return r.submitted_at ? new Date(r.submitted_at).getTime() : null
      return null
    }

    if (base === 'name') {
      return [...filtered].sort((a, b) =>
        direction * (a.respondent_name || '').localeCompare(b.respondent_name || '', 'id'))
    }

    // Respondents without a score sort last in both directions. Reversing a list that
    // contains nulls would otherwise float the unanswered rows to the top, which reads
    // as "worst performer" when it actually means "not submitted".
    const scored = filtered.filter((r) => value(r) != null).sort((a, b) => direction * (value(a) - value(b)))
    const unscored = filtered.filter((r) => value(r) == null)
    return [...scored, ...unscored]
  }, [rows, sortKey, statusFilter])

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => (a.raw ?? Infinity) - (b.raw ?? Infinity)),
    [categories],
  )

  if (loading) {
    return (
      <div className="page-container hasil-page">
        <div className="detail-loading" role="status">Memuat laporan evaluasi...</div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="page-container hasil-page">
        <button className="back-link" onClick={() => navigate('/admin/hasil')}>← Kembali ke daftar laporan</button>
        <div className="page-error" role="alert">{error || 'Laporan tidak ditemukan.'}</div>
      </div>
    )
  }

  const respondentAverage = meanOf(rows.map((r) => r.rawScore))
  const lowCategories = sortedCategories.filter((c) => c.raw != null && overallRaw != null && c.raw < overallRaw)

  return (
    <div className="page-container hasil-page hasil-detail-page">
      <button className="back-link" onClick={() => navigate('/admin/hasil')}>← Kembali ke daftar laporan</button>
      {error && <div className="page-error" role="alert">{error}</div>}

      <header className="hasil-detail-header">
        <div>
          <p className="hasil-detail-app">{questionnaire?.app_name}</p>
          <h1>{questionnaire?.title}</h1>
        </div>
        <div className="hasil-detail-actions">
          <button className="hasil-action-btn hasil-action-btn-secondary" onClick={() => document.getElementById('hasil-respondents')?.scrollIntoView({ behavior: scrollBehavior() })}>
            Detail responden
          </button>
          <button className="hasil-action-btn hasil-action-btn-secondary" onClick={() => navigate(`/admin/evaluasi/${questionnaireId}`)}>
            Kelola evaluasi
          </button>
        </div>
      </header>

      <div className="hasil-topline">
        <section className="hasil-verdict" aria-labelledby="hasil-verdict-title">
          <h2 id="hasil-verdict-title" className="hasil-section-title">Ringkasan skor</h2>

          <div className="hasil-verdict-figure">
            <span className="hasil-verdict-number">{formatScore(overallRaw)}</span>
            <span className="hasil-verdict-denom">/ {LIKERT_MAX}</span>
          </div>

          <p className="hasil-verdict-normalized">
            Setara <strong>{formatScore(report.overall_usability_score_avg)}</strong> pada skala 0–100
          </p>

          <div
            className="hasil-axis"
            role={overallRaw == null ? undefined : 'img'}
            aria-label={overallRaw == null
              ? undefined
              : `Skor ${formatScore(overallRaw)} dari ${LIKERT_MAX}, ${band.label}`}
          >
            <div className="hasil-axis-track">
              {/* No marker without a score. Rendering one at 0% claimed the lowest
                  possible value for an evaluation nobody has answered yet. */}
              {overallRaw != null && (
                <div
                  className="hasil-axis-marker"
                  style={{ left: `${barPercent(overallRaw)}%`, background: band.color }}
                />
              )}
            </div>
            <div className="hasil-axis-scale" aria-hidden="true">
              {[0, ...Array.from({ length: LIKERT_MAX }, (_, i) => LIKERT_MIN + i)].map((tick) => (
                <span key={tick}>{tick}</span>
              ))}
            </div>
          </div>

          <dl className="hasil-verdict-facts">
            <div>
              <dt>Responden selesai</dt>
              <dd>
                {countsAreExact ? submittedCount : `${submittedCount}+`}
                <span className="hasil-fact-of">dari {respondentsTotal}</span>
              </dd>
            </div>
            <div>
              <dt>Task sukses</dt>
              <dd>{report.task_success_rate_avg != null ? `${report.task_success_rate_avg.toFixed(1)}%` : '—'}</dd>
            </div>
            {showSusScore && (
              <div>
                <dt>SUS</dt>
                <dd>
                  {report.evaluation_website_sus_score_avg != null ? report.evaluation_website_sus_score_avg.toFixed(1) : '—'}
                </dd>
                {susBand(report.evaluation_website_sus_score_avg) && (
                  <span
                    className="hasil-sus-badge"
                    style={{
                      color: susBand(report.evaluation_website_sus_score_avg).color,
                      background: susBand(report.evaluation_website_sus_score_avg).tint,
                    }}
                  >
                    {susBand(report.evaluation_website_sus_score_avg).label}
                  </span>
                )}
              </div>
            )}
          </dl>

          {!countsAreExact && (
            <p className="hasil-note">
              Skor dihitung dari {RESPONDENT_LIMIT} responden pertama. Daftar lengkap memuat {respondentsTotal}.
            </p>
          )}
        </section>

        <section className="hasil-panel" aria-labelledby="hasil-task-title">
          <div className="hasil-panel-head">
            <h2 id="hasil-task-title" className="hasil-section-title">Performa task</h2>
            <span className="hasil-panel-meta">{tasks.length} task</span>
          </div>

          {tasks.length === 0 ? (
            <p className="hasil-empty">Belum ada task scenario yang diukur.</p>
          ) : (
            <ul className="hasil-task-list">
              {tasks.map((task) => {
                const stats = taskStats.find((s) => s.task_scenario_id === task.id)
                const rate = stats?.completion_rate ?? null
                const attempted = stats?.total_attempts ?? null
                const band_ = rateBand(rate)
                return (
                  <li className="hasil-task-row" key={task.id}>
                    <div className="hasil-task-head">
                      <span className="hasil-task-name">{task.title}</span>
                      <span className={`hasil-task-rate rate-${band_}`}>
                        {rate != null ? `${rate.toFixed(0)}%` : '—'}
                        {RATE_BAND_LABEL[band_] && (
                          <span className="hasil-task-rate-label">{RATE_BAND_LABEL[band_]}</span>
                        )}
                      </span>
                    </div>

                    <div className="hasil-bar-track hasil-bar-track-thin">
                      <div
                        className="hasil-bar-fill"
                        style={{ width: `${rate != null ? Math.max(0, Math.min(100, rate)) : 0}%` }}
                        data-band={band_}
                      />
                    </div>

                    <p className="hasil-task-meta">
                      {attempted != null && (
                        <span>{stats.successful_attempts} dari {attempted} percobaan berhasil</span>
                      )}
                      <span>Rata-rata {formatDuration(stats?.avg_completion_time)}</span>
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="hasil-panel" aria-labelledby="hasil-category-title">
        <div className="hasil-panel-head">
          <div>
            <h2 id="hasil-category-title" className="hasil-section-title">Profil 10 kategori I-TAUQ</h2>
            <p className="hasil-panel-hint">
              Diurutkan dari yang terendah.
              {lowCategories.length > 0 && (
                <> {lowCategories.length} kategori di bawah rata-rata keseluruhan.</>
              )}
            </p>
          </div>
          {respondentAverage != null && (
            <span className="hasil-panel-meta">
              Rata-rata responden {formatScore(respondentAverage)}/7
            </span>
          )}
        </div>

        {sortedCategories.every((c) => c.raw == null) ? (
          <p className="hasil-empty">Belum ada skor kategori. Tidak ada responden yang menjawab instrument.</p>
        ) : (
          <ul className="hasil-profile">
            {sortedCategories.map((cat) => {
              const delta = cat.raw != null && overallRaw != null ? cat.raw - overallRaw : null
              const tone = delta == null || Math.abs(delta) < 0.005 ? 'even' : delta < 0 ? 'below' : 'above'
              return (
                <li className="hasil-profile-row" key={cat.category}>
                  <span className="hasil-profile-name">{cat.category}</span>

                  <div className="hasil-profile-plot">
                    <div className="hasil-bar-track hasil-bar-track-thin">
                      <div
                        className="hasil-bar-fill"
                        style={{ width: `${barPercent(cat.raw)}%`, background: DELTA_STYLE[tone].color }}
                      />
                    </div>
                    {overallRaw != null && (
                      <span
                        className="hasil-profile-marker"
                        style={{ left: `${barPercent(overallRaw)}%` }}
                        title={`Rata-rata ${formatScore(overallRaw)}`}
                      />
                    )}
                  </div>

                  <span className="hasil-profile-score">{formatScore(cat.raw)}</span>

                  <span className="hasil-profile-delta" data-tone={tone}>
                    <span className="sr-only">{DELTA_STYLE[tone].label}</span>
                    <span aria-hidden="true">
                      {delta == null
                        ? '—'
                        : delta === 0
                          ? 'sama dengan rata-rata'
                          : `${delta > 0 ? '+' : ''}${delta.toFixed(2)} vs rata-rata`}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="hasil-panel" id="hasil-respondents" aria-labelledby="hasil-respondents-title">
        <div className="hasil-panel-head">
          <div>
            <h2 id="hasil-respondents-title" className="hasil-section-title">Detail responden</h2>
            <p className="hasil-panel-hint">
              Menampilkan {visibleRows.length} dari {respondentsTotal} responden
              {respondentsTotal > RESPONDENT_LIMIT && ` (${RESPONDENT_LIMIT} pertama)`}.
            </p>
          </div>

          <div className="hasil-controls">
            <div className="hasil-control">
              <label htmlFor="hasil-status-filter">Status</label>
              <select
                id="hasil-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Semua responden</option>
                <option value="done">Sudah selesai</option>
                <option value="pending">Belum selesai</option>
              </select>
            </div>

            <div className="hasil-control">
              <label htmlFor="hasil-sort">Urutkan</label>
              <select
                id="hasil-sort"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
              >
                <option value="score_asc">Skor I-TAUQ, terendah dulu</option>
                <option value="score_desc">Skor I-TAUQ, tertinggi dulu</option>
                <option value="task_asc">Task sukses, terendah dulu</option>
                <option value="task_desc">Task sukses, tertinggi dulu</option>
                <option value="date_desc">Submit, terbaru dulu</option>
                <option value="name_asc">Nama, A–Z</option>
              </select>
            </div>
          </div>
        </div>

        {visibleRows.length === 0 ? (
          <p className="hasil-empty">
            {statusFilter === 'all'
              ? 'Belum ada responden yang menjawab evaluasi ini.'
              : 'Tidak ada responden yang cocok dengan filter ini.'}
          </p>
        ) : (
          <div className="table-scroll">
            <table className="data-table hasil-respondent-table">
              <thead>
                <tr>
                  <th scope="col">Nama</th>
                  <th scope="col">Skor I-TAUQ</th>
                  <th scope="col">Task sukses</th>
                  {showSusScore && <th scope="col">SUS</th>}
                  <th scope="col">Tanggal submit</th>
                  <th scope="col"><span className="sr-only">Aksi</span></th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((r) => {
                  const rowBand = itauqBand(r.rawScore)
                  return (
                    <tr key={r.respondent_id}>
                      <td>
                        <strong>{r.respondent_name}</strong>
                        {r.submitted_at == null && <span className="hasil-row-flag">Belum selesai</span>}
                      </td>
                      <td>
                        <span className="hasil-cell-score">
                          {r.rawScore != null ? (
                            <>
                              <span className="hasil-cell-score-bar" aria-hidden="true">
                                <span className="hasil-bar-fill" style={{ width: `${barPercent(r.rawScore)}%`, background: rowBand.color }} />
                              </span>
                              <span className="hasil-cell-score-value">{formatScore(r.rawScore)}</span>
                            </>
                          ) : '—'}
                        </span>
                      </td>
                      <td>{r.task_success_rate_pct != null ? `${r.task_success_rate_pct.toFixed(1)}%` : '—'}</td>
                      {showSusScore && (
                        <td>{r.evaluation_website_sus_score != null ? r.evaluation_website_sus_score.toFixed(1) : '—'}</td>
                      )}
                      <td>{formatDate(r.submitted_at)}</td>
                      <td>
                        <button className="text-action" onClick={() => openRespondent(r.respondent_id)}>
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
      </section>

      {selectedRespondent && (
        <RespondentDetailModal
          respondent={selectedRespondent}
          onClose={() => setSelectedRespondent(null)}
        />
      )}
    </div>
  )

  async function openRespondent(id) {
    try {
      setSelectedRespondent(await api.get(`/respondents/${id}`))
    } catch (err) {
      setError(err.message || 'Gagal memuat detail responden.')
    }
  }
}

function RespondentDetailModal({ respondent, onClose }) {
  const { profile } = useProfile()
  const dialogRef = useRef(null)
  const titleId = useId()
  const categories = respondentCategories(respondent.category_scores)
  const overallRaw = respondent.overall_usability_score != null
    ? normalizedToRaw(respondent.overall_usability_score)
    : meanOf(categories.map((c) => c.raw))
  const showSusScore = profile?.role === 'super_admin'

  useModalDialog({ dialogRef, onClose })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal-card hasil-respondent-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hasil-respondent-modal-header">
          <h2 id={titleId}>{respondent.respondent?.name || 'Responden'}</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Tutup">&times;</button>
        </div>

        <dl className="hasil-respondent-info">
          <div>
            <dt>Usia</dt>
            <dd>{respondent.respondent?.age || '—'}</dd>
          </div>
          <div>
            <dt>Gender</dt>
            <dd>{respondent.respondent?.gender || '—'}</dd>
          </div>
          <div>
            <dt>Pekerjaan</dt>
            <dd>{respondent.respondent?.occupation || '—'}</dd>
          </div>
        </dl>

        <div className="hasil-respondent-score">
          <span className="hasil-respondent-score-label">Skor I-TAUQ</span>
          <span className="hasil-respondent-score-value">
            {formatScore(overallRaw)}
            <small>/ {LIKERT_MAX}</small>
          </span>
        </div>

        <section className="hasil-respondent-block">
          <h3>Skor per kategori</h3>
          <ul className="hasil-profile hasil-profile-compact">
            {categories.map((cat) => (
              <li className="hasil-profile-row" key={cat.category}>
                <span className="hasil-profile-name">{cat.category}</span>
                <div className="hasil-profile-plot">
                  <div className="hasil-bar-track hasil-bar-track-thin">
                    <div className="hasil-bar-fill" style={{ width: `${barPercent(cat.raw)}%`, background: cat.band.color }} />
                  </div>
                </div>
                <span className="hasil-profile-score">{formatScore(cat.raw)}</span>
                <span className="hasil-profile-delta" data-tone="even" />
              </li>
            ))}
          </ul>
        </section>

        {respondent.task_results?.length > 0 && (
          <section className="hasil-respondent-block">
            <h3>Hasil task</h3>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Task</th>
                    <th scope="col">Status</th>
                    <th scope="col">Waktu</th>
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
          </section>
        )}

        {showSusScore && respondent.evaluation_website_sus && (
          <section className="hasil-respondent-block">
            <h3>Evaluasi website (SUS)</h3>
            <p className="hasil-sus-line">
              Item terjawab: <strong>{respondent.evaluation_website_sus.answered_items}</strong>
              {' · '}
              Skor: <strong>{respondent.evaluation_website_sus.sus_score != null ? respondent.evaluation_website_sus.sus_score.toFixed(1) : '—'}</strong>
              {susBand(respondent.evaluation_website_sus.sus_score) && (
                <span
                  className="hasil-sus-badge"
                  style={{
                    color: susBand(respondent.evaluation_website_sus.sus_score).color,
                    background: susBand(respondent.evaluation_website_sus.sus_score).tint,
                  }}
                >
                  {susBand(respondent.evaluation_website_sus.sus_score).label}
                </span>
              )}
            </p>
          </section>
        )}

        <div className="modal-actions">
          <button type="button" className="modal-btn cancel" onClick={onClose}>Tutup</button>
        </div>
      </div>
    </div>
  )
}
