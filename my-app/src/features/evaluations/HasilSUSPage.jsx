import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../../shared/api/apiClient'
import './HasilSUSPage.css'

const SUS_RANGES = [
  { label: 'Excellent', min: 80, max: 100, color: '#0f766e', bg: '#ccfbf1' },
  { label: 'Acceptable', min: 68, max: 79, color: '#059669', bg: '#d1fae5' },
  { label: 'Marginal', min: 50, max: 67, color: '#b45309', bg: '#fef3c7' },
  { label: 'Poor', min: 0, max: 49, color: '#dc2626', bg: '#fee2e2' },
]

function classifySUS(score) {
  if (score == null) return null
  if (score >= 80) return 'Excellent'
  if (score >= 68) return 'Acceptable'
  if (score >= 50) return 'Marginal'
  return 'Poor'
}

function getRangeMeta(label) {
  return SUS_RANGES.find((r) => r.label === label)
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

async function fetchAllRespondents() {
  const all = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const result = await api.get('/respondents', {
      params: { page, page_size: 100 },
      includeMeta: true,
    })
    const items = Array.isArray(result?.data) ? result.data : []
    all.push(...items)
    totalPages = result?.meta?.total_pages || 1
    page++
  }

  return all
}

export default function HasilSUSPage() {
  const [respondents, setRespondents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortBy, setSortBy] = useState('score-desc')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const data = await fetchAllRespondents()
        if (!cancelled) setRespondents(data)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Gagal memuat data responden.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const respondentsWithSUS = useMemo(
    () => respondents.filter((r) => r.evaluation_website_sus_score != null),
    [respondents]
  )

  const stats = useMemo(() => {
    const scores = respondentsWithSUS.map((r) => r.evaluation_website_sus_score)
    if (scores.length === 0) {
      return { count: 0, avg: null, median: null, min: null, max: null, stdDev: null, distribution: {} }
    }

    const count = scores.length
    const avg = scores.reduce((sum, s) => sum + s, 0) / count
    const sorted = [...scores].sort((a, b) => a - b)
    const median = count % 2 === 0
      ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
      : sorted[Math.floor(count / 2)]
    const min = sorted[0]
    const max = sorted[sorted.length - 1]
    const variance = scores.reduce((sum, s) => sum + (s - avg) ** 2, 0) / count
    const stdDev = Math.sqrt(variance)

    const distribution = {}
    SUS_RANGES.forEach((r) => { distribution[r.label] = 0 })
    scores.forEach((s) => {
      const cls = classifySUS(s)
      if (cls) distribution[cls]++
    })

    return { count, avg, median, min, max, stdDev, distribution }
  }, [respondentsWithSUS])

  const sortedRespondents = useMemo(() => {
    const copy = [...respondentsWithSUS]
    switch (sortBy) {
      case 'score-asc': return copy.sort((a, b) => a.evaluation_website_sus_score - b.evaluation_website_sus_score)
      case 'name': return copy.sort((a, b) => (a.respondent_name || '').localeCompare(b.respondent_name || ''))
      case 'date': return copy.sort((a, b) => new Date(b.submitted_at || 0) - new Date(a.submitted_at || 0))
      case 'score-desc':
      default: return copy.sort((a, b) => b.evaluation_website_sus_score - a.evaluation_website_sus_score)
    }
  }, [respondentsWithSUS, sortBy])

  const maxDistCount = Math.max(...Object.values(stats.distribution), 1)

  return (
    <div className="page-container sus-page">
      <div className="page-header">
        <div>
          <p className="page-eyebrow">SUS ANALYSIS</p>
          <h1>Hasil SUS</h1>
          <p className="page-subtitle">Statistik System Usability Score dari seluruh responden yang telah mengisi kuesioner.</p>
        </div>
      </div>

      {error && <div className="page-error" role="alert">{error}</div>}

      {loading ? (
        <div className="table-loading">Memuat data SUS...</div>
      ) : stats.count === 0 ? (
        <div className="sus-empty">
          <span className="empty-state-icon" aria-hidden="true">📊</span>
          <strong>Belum ada data SUS.</strong>
          <span>Responden belum menyelesaikan pengisian SUS.</span>
        </div>
      ) : (
        <>
          {/* ─── Summary Stats ─── */}
          <section className="sus-summary-grid" aria-label="Ringkasan SUS">
            <article className="sus-stat-card sus-stat-featured">
              <span className="sus-stat-label">Rata-rata SUS</span>
              <strong className="sus-stat-value">{stats.avg.toFixed(1)}</strong>
              <small className="sus-stat-unit">/ 100</small>
              <span className="sus-stat-meta">{stats.count} responden</span>
              <span className="sus-stat-mark" aria-hidden="true">SUS</span>
            </article>
            <article className="sus-stat-card">
              <span className="sus-stat-label">Median</span>
              <strong className="sus-stat-value-secondary">{stats.median.toFixed(1)}</strong>
              <small className="sus-stat-note">nilai tengah distribusi</small>
            </article>
            <article className="sus-stat-card">
              <span className="sus-stat-label">Rentang</span>
              <strong className="sus-stat-value-secondary">{stats.min.toFixed(1)} – {stats.max.toFixed(1)}</strong>
              <small className="sus-stat-note">min – max</small>
            </article>
            <article className="sus-stat-card">
              <span className="sus-stat-label">Std. Deviasi</span>
              <strong className="sus-stat-value-secondary">{stats.stdDev.toFixed(2)}</strong>
              <small className="sus-stat-note">sebaran skor</small>
            </article>
          </section>

          {/* ─── SUS Adjective Rating ─── */}
          <section className="sus-adjective-section">
            <div className="sus-adjective-header">
              <div>
                <h2>Adjective Rating</h2>
                <p>Klasifikasi skor SUS berdasarkan standar usability grading.</p>
              </div>
            </div>
            <div className="sus-adjective-bar-container">
              <div className="sus-adjective-bar">
                {SUS_RANGES.map((range) => {
                  const count = stats.distribution[range.label] || 0
                  const pct = stats.count > 0 ? (count / stats.count) * 100 : 0
                  if (pct === 0) return null
                  return (
                    <div
                      key={range.label}
                      className="sus-adjective-segment"
                      style={{ width: `${pct}%`, background: range.color }}
                      title={`${range.label}: ${count} (${pct.toFixed(1)}%)`}
                    >
                      {pct > 12 && <span>{range.label}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="sus-adjective-legend">
              {SUS_RANGES.map((range) => {
                const count = stats.distribution[range.label] || 0
                const pct = stats.count > 0 ? (count / stats.count) * 100 : 0
                return (
                  <div className="sus-adjective-legend-item" key={range.label}>
                    <span className="sus-legend-dot" style={{ background: range.color }} />
                    <span className="sus-legend-label">{range.label}</span>
                    <span className="sus-legend-count">{count}</span>
                    <span className="sus-legend-pct">{pct.toFixed(1)}%</span>
                    <span className="sus-legend-range">{range.min}–{range.max}</span>
                  </div>
                )
              })}
            </div>
          </section>

          {/* ─── Distribution Chart ─── */}
          <section className="sus-distribution-section">
            <div className="sus-distribution-header">
              <div>
                <h2>Distribusi Skor SUS</h2>
                <p>Frekuensi responden berdasarkan rentang skor SUS.</p>
              </div>
            </div>
            <div className="sus-distribution-chart">
              {SUS_RANGES.map((range) => {
                const count = stats.distribution[range.label] || 0
                const pct = maxDistCount > 0 ? (count / maxDistCount) * 100 : 0
                return (
                  <div className="sus-dist-bar-group" key={range.label}>
                    <div className="sus-dist-bar-count">{count}</div>
                    <div className="sus-dist-bar-track">
                      <div
                        className="sus-dist-bar-fill"
                        style={{ height: `${pct}%`, background: range.color }}
                      />
                    </div>
                    <div className="sus-dist-bar-label">{range.label}</div>
                    <div className="sus-dist-bar-range">{range.min}–{range.max}</div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* ─── Respondent Table ─── */}
          <section className="sus-respondents-section">
            <div className="sus-respondents-header">
              <div>
                <h2>Detail Skor Responden</h2>
                <p>Daftar lengkap skor SUS seluruh responden.</p>
              </div>
              <div className="sus-sort-control">
                <label htmlFor="sus-sort">Urutkan</label>
                <select id="sus-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="score-desc">Skor Tertinggi</option>
                  <option value="score-asc">Skor Terendah</option>
                  <option value="name">Nama A–Z</option>
                  <option value="date">Tanggal Terbaru</option>
                </select>
              </div>
            </div>

            <div className="table-scroll">
              <table className="data-table sus-respondent-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nama</th>
                    <th>Kuesioner</th>
                    <th>Administrator</th>
                    <th>Skor SUS</th>
                    <th>Rating</th>
                    <th>Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRespondents.map((r, i) => {
                    const cls = classifySUS(r.evaluation_website_sus_score)
                    const meta = getRangeMeta(cls)
                    return (
                      <tr key={r.respondent_id}>
                        <td className="sus-td-index">{i + 1}</td>
                        <td><strong>{r.respondent_name}</strong></td>
                        <td className="sus-td-questionnaire">
                          <span>{r.questionnaire_title || '—'}</span>
                          {r.app_name && <small>{r.app_name}</small>}
                        </td>
                        <td className="sus-td-admin">{r.administrator_name || '—'}</td>
                        <td>
                          <strong className="sus-td-score">{r.evaluation_website_sus_score.toFixed(1)}</strong>
                        </td>
                        <td>
                          {meta && (
                            <span
                              className="sus-rating-badge"
                              style={{ background: meta.bg, color: meta.color }}
                            >
                              {cls}
                            </span>
                          )}
                        </td>
                        <td className="sus-td-date">{formatDate(r.submitted_at)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
