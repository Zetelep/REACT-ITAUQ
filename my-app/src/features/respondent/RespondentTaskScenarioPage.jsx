import { useEffect, useMemo, useState } from 'react'
import { ApiError } from '../../shared/api/apiClient'
import { submitTaskAttempts } from './respondentApi'
import './RespondentTaskScenarioPage.css'

function getStoredTaskProgress(token) {
  try {
    const stored = window.sessionStorage.getItem(`itauq:respondent:${token}:taskProgress`)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

function storeTaskProgress(token, currentIndex) {
  try {
    window.sessionStorage.setItem(`itauq:respondent:${token}:taskProgress`, JSON.stringify({ currentIndex }))
  } catch {
    // Enhancement only
  }
}

function sortTasks(tasks) {
  return [...tasks].sort((first, second) => {
    const firstOrder = Number(first.task_order) || 0
    const secondOrder = Number(second.task_order) || 0
    return firstOrder - secondOrder
  })
}

function formatDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}

function getScenarioId(task, index) {
  return task.id || `TOUR-${String(index + 1).padStart(2, '0')}`
}

function getErrorMessage(error) {
  if (error instanceof ApiError) {
    if (error.code === 'LINK_INACTIVE') return 'Tautan evaluasi sudah tidak aktif atau telah kedaluwarsa.'
    if (error.code === 'INVALID_ATTEMPTS') return 'Skenario tugas ini tidak dapat dicatat. Silakan coba lagi.'
  }
  return error?.message || 'Hasil tugas belum dapat disimpan. Silakan coba lagi.'
}

function getWebsiteUrl(appName) {
  if (!appName) return ''
  if (/^https?:\/\//i.test(appName)) return appName
  if (/^[\w-]+(\.[\w-]+)+([/?#].*)?$/i.test(appName)) return `https://${appName}`
  return ''
}


export default function RespondentTaskScenarioPage({ tasks: sourceTasks, appName, token, respondentId, onFinished }) {
  const tasks = useMemo(() => sortTasks(sourceTasks || []), [sourceTasks])
  const [currentIndex, setCurrentIndex] = useState(() => {
    const stored = getStoredTaskProgress(token)
    const idx = stored?.currentIndex ?? 0
    return idx < tasks.length ? idx : 0
  })
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isStarted, setIsStarted] = useState(false)
  const [error, setError] = useState('')
  const [websiteNotice, setWebsiteNotice] = useState('')
  const currentTask = tasks[currentIndex]
  const websiteUrl = getWebsiteUrl(appName)
  const completedCount = currentIndex

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])

  useEffect(() => {
    if (!isStarted) {
      setElapsedSeconds(0)
      return undefined
    }

    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [currentIndex, isStarted])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    if (!isStarted) document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isStarted])

  useEffect(() => {
    storeTaskProgress(token, currentIndex)
  }, [token, currentIndex])

  if (!currentTask) return null

  const handleOpenWebsite = () => {
    if (websiteUrl) {
      window.open(websiteUrl, '_blank', 'noopener,noreferrer')
      setWebsiteNotice('Website dibuka di tab baru. Kembali ke halaman ini setelah selesai.')
      return
    }

    setWebsiteNotice('Tautan website evaluasi belum tersedia pada data evaluasi ini. Gunakan informasi dari peneliti untuk membuka websitenya.')
  }

  const handleTaskResult = async (isSuccess) => {
    if (!isStarted) return
    setSubmitting(true)
    setError('')
    try {
      await submitTaskAttempts(token, respondentId, [{
        task_scenario_id: currentTask.id,
        is_success: isSuccess,
        duration_seconds: elapsedSeconds,
        notes: note.trim() || undefined,
      }])

      if (currentIndex === tasks.length - 1) {
        onFinished()
        return
      }

      setCurrentIndex((index) => index + 1)
      setNote('')
      setWebsiteNotice('')
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  const progressWidth = `${(completedCount / tasks.length) * 100}%`

  return (
    <main className="task-scenario-page">
      <header className="task-scenario-header">
        <div className="task-scenario-brand">EVALUASI USABILITY E-TOURISM</div>
        <nav className="task-scenario-nav" aria-label="Navigasi evaluasi">
          <span className="task-scenario-nav-item is-active">Skenario Tugas</span>
          <span className="task-scenario-nav-item is-disabled">Kuesioner</span>
          <button className="task-help-button" type="button" aria-label="Bantuan" onClick={() => setWebsiteNotice('Selesaikan setiap tugas sesuai instruksi. Jika website bermasalah, pilih Saya Gagal Menyelesaikan dan lanjutkan ke tugas berikutnya.')}>
            ?
          </button>
        </nav>
      </header>

      <div className="task-scenario-layout">
        <aside className="task-scenario-sidebar">
          <div className="task-sidebar-heading">
            <span className="task-eyebrow">Skenario aktif</span>
            <h1>TASK SCENARIO {String(currentIndex + 1).padStart(2, '0')}</h1>
            <p>Scenario ID: {getScenarioId(currentTask, currentIndex)}</p>
          </div>

          <div className="task-instruction-card">
            <strong>{currentTask.title || `Skenario tugas ${currentIndex + 1}`}</strong>
            <p>{currentTask.instruction || 'Ikuti instruksi dari peneliti untuk menyelesaikan tugas ini.'}</p>
          </div>

          <div className="task-elapsed-block">
            <span className="task-sidebar-label">TIME ELAPSED</span>
            <strong><span className="task-stopwatch" aria-hidden="true">◷</span>{formatDuration(elapsedSeconds)}</strong>
          </div>

          <div className="task-sidebar-actions">
            <button className="task-success-button" type="button" disabled={!isStarted || submitting} onClick={() => handleTaskResult(true)}>
              {submitting ? 'MENYIMPAN...' : <>TUGAS<br />SELESAI</>}
            </button>
            <button className="task-fail-button" type="button" disabled={!isStarted || submitting} onClick={() => handleTaskResult(false)}>
              <span aria-hidden="true">△</span>
              SAYA GAGAL<br />MENYELESAIKAN
            </button>
          </div>

          <div className="task-progress-block">
            <span className="task-sidebar-label">PROGRESS</span>
            <div className="task-progress-bar" aria-label={`${completedCount} dari ${tasks.length} tugas selesai`}>
              <span style={{ width: progressWidth }} />
            </div>
            <span className="task-progress-count">{completedCount}/{tasks.length} Tasks</span>
          </div>
        </aside>

        <section className="task-scenario-main" aria-labelledby="scenario-session-heading">
          <div className="task-session-preview">
            <div className="task-preview-cross task-preview-cross--one" aria-hidden="true" />
            <div className="task-preview-cross task-preview-cross--two" aria-hidden="true" />
            <div className="task-session-message">
              <h2 id="scenario-session-heading">Sesi Skenario<br />Tugas</h2>
              <p>Biarkan tab ini tetap terbuka selama evaluasi berlangsung.</p>
              <p>Situs tugas akan terbuka di tab baru.</p>
              <p>Kembali ke sini untuk menandai tugas sebagai selesai.</p>
            </div>
          </div>

          <button className="task-open-website-button" type="button" disabled={!isStarted} onClick={handleOpenWebsite}>
            BUKA WEBSITE YANG AKAN DIEVALUASI
          </button>

          {(websiteNotice || error) && (
            <div className={`task-message-box${error ? ' task-message-box--error' : ''}`} role={error ? 'alert' : 'status'}>
              <span className="task-message-icon" aria-hidden="true">{error ? '!' : 'i'}</span>
              <div>
                <strong>{error ? 'Tidak dapat menyimpan hasil' : 'Informasi'}</strong>
                <p>{error || websiteNotice}</p>
              </div>
            </div>
          )}

          <div className="task-notes-card">
            <label htmlFor="task-notes">CATATAN UNTUK EVALUATOR</label>
            <textarea
              id="task-notes"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Tuliskan catatan atau kendala yang Anda alami saat mengerjakan tugas ini..."
              rows={4}
              disabled={!isStarted}
            />
          </div>
        </section>
      </div>

      {!isStarted && (
        <div className="task-start-overlay" role="presentation">
          <section className="task-start-dialog" role="dialog" aria-modal="true" aria-labelledby="task-start-heading" aria-describedby="task-start-description">
            <div className="task-start-icon" aria-hidden="true">◷</div>
            <span className="task-eyebrow">Persiapan tugas</span>
            <h2 id="task-start-heading">Siap memulai skenario?</h2>
            <p id="task-start-description">
              Timer akan mulai berjalan setelah Anda menekan tombol mulai. Baca instruksi terlebih dahulu, lalu buka website yang akan dievaluasi.
            </p>
            <ul className="task-start-checklist">
              <li>Ikuti instruksi skenario sesuai urutan.</li>
              <li>Kembali ke halaman ini setelah tugas selesai.</li>
              <li>Pilih gagal jika Anda mengalami kendala teknis.</li>
            </ul>
            <button className="task-start-button" type="button" onClick={() => setIsStarted(true)}>
              Mulai Skenario <span aria-hidden="true">→</span>
            </button>
          </section>
        </div>
      )}
    </main>
  )
}
