import { useEffect, useMemo, useState } from 'react'
import { ApiError } from '../../shared/api/apiClient'
import { lockBodyScroll } from '../../shared/clients/scrollLock'
import { submitTaskAttempts } from './respondentApi'
import './RespondentTaskScenarioPage.css'

function getStoredTaskProgress(token) {
  try {
    const stored = window.localStorage.getItem(`itauq:respondent:${token}:taskProgress`)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

function storeTaskProgress(token, currentIndex) {
  try {
    window.localStorage.setItem(`itauq:respondent:${token}:taskProgress`, JSON.stringify({ currentIndex }))
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

function getWebsiteUrl(appName, appLink) {
  if (appLink && /^https?:\/\//i.test(appLink)) return appLink
  if (!appName) return ''
  if (/^https?:\/\//i.test(appName)) return appName
  if (/^[\w-]+(\.[\w-]+)+([/?#].*)?$/i.test(appName)) return `https://${appName}`
  return ''
}

async function writeToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
}


export default function RespondentTaskScenarioPage({ tasks: sourceTasks, appName, appLink, token, respondentId, onFinished }) {
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
  const [lastResult, setLastResult] = useState(null)
  const [error, setError] = useState('')
  const [websiteNotice, setWebsiteNotice] = useState('')
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const currentTask = tasks[currentIndex]
  const websiteUrl = getWebsiteUrl(appName, appLink)
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
    if (isStarted) return undefined
    return lockBodyScroll()
  }, [isStarted])

  useEffect(() => {
    storeTaskProgress(token, currentIndex)
  }, [token, currentIndex])

  const handleCopyInstruction = async () => {
    const instructionText = `${currentTask.title || `Skenario tugas ${currentIndex + 1}`}\n\n${currentTask.instruction || 'Ikuti instruksi dari peneliti untuk menyelesaikan tugas ini.'}`
    await writeToClipboard(instructionText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyWebsiteLink = async () => {
    await writeToClipboard(websiteUrl)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  if (!currentTask) return null

  const handleOpenWebsite = () => {
    if (websiteUrl) {
      window.open(websiteUrl, '_blank', 'width=1024,height=768,noopener,noreferrer')
      setWebsiteNotice('Website dibuka di jendela baru. Kembali ke halaman ini setelah selesai.')
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

      setLastResult({ success: isSuccess, duration: elapsedSeconds })
      setCurrentIndex((index) => index + 1)
      setNote('')
      setWebsiteNotice('')
      setIsStarted(false)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  const handleStartNext = () => {
    setLastResult(null)
    setIsStarted(true)
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
            <button
              className="task-copy-button"
              type="button"
              onClick={handleCopyInstruction}
              disabled={!isStarted}
            >
              {copied ? '✓ Tersalin' : '📋 Salin Instruksi'}
            </button>
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
          {lastResult ? (
            <section className="task-start-dialog task-interstitial-dialog" role="dialog" aria-modal="true" aria-labelledby="task-interstitial-heading">
              <div className="task-interstitial-result" data-success={lastResult.success}>
                <span className="task-interstitial-result-icon" aria-hidden="true">{lastResult.success ? '✓' : '△'}</span>
                <span>{lastResult.success ? 'Tugas Selesai' : 'Tugas Gagal'}</span>
              </div>
              <p className="task-interstitial-duration">Waktu: {formatDuration(lastResult.duration)}</p>
              <h2 id="task-interstitial-heading">Tugas {String(currentIndex).padStart(2, '0')} selesai</h2>
              <p className="task-interstitial-next-label">Tugas selanjutnya:</p>
              <div className="task-interstitial-next-task">
                <strong>TASK SCENARIO {String(currentIndex + 1).padStart(2, '0')}</strong>
                <p>{currentTask.title || `Skenario tugas ${currentIndex + 1}`}</p>
              </div>
              <button className="task-start-button" type="button" onClick={handleStartNext}>
                Mulai Tugas Berikutnya <span aria-hidden="true">→</span>
              </button>
            </section>
          ) : (
            <section className="task-start-dialog" role="dialog" aria-modal="true" aria-labelledby="task-start-heading" aria-describedby="task-start-description">
              <div className="task-start-icon" aria-hidden="true">◷</div>
              <span className="task-eyebrow">Persiapan tugas</span>
              <h2 id="task-start-heading">Siap memulai skenario?</h2>
              <p id="task-start-description">
                Instruksi tugas ditampilkan di panel kiri. Tekan tombol mulai untuk mengaktifkan timer, lalu buka website evaluasi di tab baru atau perangkat lain melalui tombol di bawah.
              </p>
              <ul className="task-start-checklist">
                <li>Baca instruksi skenario di panel kiri sebelum memulai.</li>
                <li>Buka website evaluasi di tab baru atau perangkat lain.</li>
                <li>Kembali ke halaman ini untuk menandai tugas selesai atau gagal.</li>
                <li>Pilih "Saya Gagal Menyelesaikan" jika mengalami kendala teknis.</li>
              </ul>

              <div className="task-dialog-website">
                <span className="task-dialog-website-label">Website yang akan dievaluasi</span>
                {websiteUrl ? (
                  <>
                    <p className="task-dialog-website-name">{appName}</p>
                    <span className="task-dialog-website-link">{websiteUrl}</span>
                    <div className="task-dialog-website-actions">
                      <button className="task-dialog-open-button" type="button" onClick={handleOpenWebsite}>
                        Buka Website Sekarang <span aria-hidden="true">↗</span>
                      </button>
                      <button className="task-dialog-copy-button" type="button" onClick={handleCopyWebsiteLink}>
                        {linkCopied ? '✓ Tersalin' : 'Salin Tautan'}
                      </button>
                    </div>
                    <p className="task-dialog-website-hint">
                      Ingin mengerjakan dari perangkat lain (misalnya HP)? Buka tautan di atas di perangkat tersebut, lalu
                      kembali ke halaman ini untuk menandai setiap tugas. Website boleh dibuka lebih dulu sebelum Anda menekan
                      tombol mulai.
                    </p>
                  </>
                ) : (
                  <p className="task-dialog-website-hint">
                    Tautan website belum tersedia pada data evaluasi ini. Silakan minta tautan kepada peneliti sebelum memulai.
                  </p>
                )}
              </div>

              {websiteNotice && <div className="task-dialog-notice" role="status">{websiteNotice}</div>}

              <button className="task-start-button" type="button" onClick={() => setIsStarted(true)}>
                Mulai Skenario <span aria-hidden="true">→</span>
              </button>
            </section>
          )}
        </div>
      )}
    </main>
  )
}
