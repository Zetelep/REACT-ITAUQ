import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ApiError } from '../../shared/api/apiClient'
import { lockBodyScroll } from '../../shared/clients/scrollLock'
import { useModalDialog } from '../../shared/clients/modalDialog'
import { getPublicEvaluation, startRespondent } from './respondentApi'
import RespondentTaskScenarioPage from './RespondentTaskScenarioPage'
import RespondentQuestionnairePage from './RespondentQuestionnairePage'
import './RespondentEligibilityPage.css'

const EMPTY_PROFILE = {
  name: '',
  email: '',
  age: '',
  gender: '',
  occupation: '',
  province: '',
}

const PROVINCES = [
  { code: '11', name: 'Aceh' },
  { code: '12', name: 'Sumatera Utara' },
  { code: '13', name: 'Sumatera Barat' },
  { code: '14', name: 'Riau' },
  { code: '15', name: 'Jambi' },
  { code: '16', name: 'Sumatera Selatan' },
  { code: '17', name: 'Bengkulu' },
  { code: '18', name: 'Lampung' },
  { code: '19', name: 'Kepulauan Bangka Belitung' },
  { code: '21', name: 'Kepulauan Riau' },
  { code: '31', name: 'DKI Jakarta' },
  { code: '32', name: 'Jawa Barat' },
  { code: '33', name: 'Jawa Tengah' },
  { code: '34', name: 'DI Yogyakarta' },
  { code: '35', name: 'Jawa Timur' },
  { code: '36', name: 'Banten' },
  { code: '51', name: 'Bali' },
  { code: '52', name: 'Nusa Tenggara Barat' },
  { code: '53', name: 'Nusa Tenggara Timur' },
  { code: '61', name: 'Kalimantan Barat' },
  { code: '62', name: 'Kalimantan Tengah' },
  { code: '63', name: 'Kalimantan Selatan' },
  { code: '64', name: 'Kalimantan Timur' },
  { code: '65', name: 'Kalimantan Utara' },
  { code: '71', name: 'Sulawesi Utara' },
  { code: '72', name: 'Sulawesi Tengah' },
  { code: '73', name: 'Sulawesi Selatan' },
  { code: '74', name: 'Sulawesi Tenggara' },
  { code: '75', name: 'Gorontalo' },
  { code: '76', name: 'Sulawesi Barat' },
  { code: '81', name: 'Maluku' },
  { code: '82', name: 'Maluku Utara' },
  { code: '91', name: 'Papua Barat' },
  { code: '92', name: 'Papua' },
]

function getStoredCriteria(token) {
  try {
    const stored = window.localStorage.getItem(`itauq:respondent:${token}:eligibility`)
    const parsed = stored ? JSON.parse(stored) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function storeCriteria(token, criteriaIds) {
  try {
    window.localStorage.setItem(
      `itauq:respondent:${token}:eligibility`,
      JSON.stringify(criteriaIds),
    )
  } catch {
    // Session storage is an enhancement; the current selection remains in React state.
  }
}

function storeRespondent(token, respondent) {
  try {
    window.localStorage.setItem(`itauq:respondent:${token}:session`, JSON.stringify(respondent))
  } catch {
    // The API response is still available in component state when storage is unavailable.
  }
}

function getStoredRespondent(token) {
  try {
    const stored = window.localStorage.getItem(`itauq:respondent:${token}:session`)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

function getStoredFlowStep(token) {
  try {
    return window.localStorage.getItem(`itauq:respondent:${token}:flowStep`) || ''
  } catch {
    return ''
  }
}

function storeFlowStep(token, step) {
  try {
    window.localStorage.setItem(`itauq:respondent:${token}:flowStep`, step)
  } catch {
    // Enhancement only
  }
}

function getErrorMessage(error, fallback = 'Terjadi kesalahan. Silakan coba lagi.') {
  if (error instanceof ApiError) {
    if (error.code === 'LINK_INACTIVE') return 'Tautan evaluasi ini sudah tidak aktif atau telah kedaluwarsa.'
    if (error.code === 'NOT_FOUND') return 'Tautan evaluasi tidak ditemukan. Periksa kembali URL yang Anda buka.'
    if (error.code === 'ELIGIBILITY_NOT_CONFIRMED') {
      return 'Pastikan semua kriteria responden sudah dikonfirmasi sebelum melanjutkan.'
    }
    if (error.code === 'VALIDATION_ERROR') return error.message || 'Periksa kembali data yang Anda isi.'
  }

  return error?.message || fallback
}

function sortCriteria(criteria) {
  return [...criteria].sort((first, second) => {
    const firstOrder = Number(first.criteria_order) || 0
    const secondOrder = Number(second.criteria_order) || 0
    return firstOrder - secondOrder
  })
}

function AppPreview({ appName, imgLink }) {
  if (imgLink) {
    return (
      <div className="respondent-app-preview" aria-label={`Pratinjau aplikasi ${appName}`}>
        <img className="respondent-app-preview-img" src={imgLink} alt={`Pratinjau ${appName}`} />
      </div>
    )
  }

  return (
    <div className="respondent-app-preview" aria-label={`Pratinjau aplikasi ${appName}`}>
      <div className="respondent-preview-window respondent-preview-window--back" />
      <div className="respondent-preview-window respondent-preview-window--front">
        <span className="respondent-preview-icon" aria-hidden="true">✦</span>
        <span>Gambar</span>
        <span>App</span>
      </div>
      <div className="respondent-preview-window respondent-preview-window--right" />
    </div>
  )
}

function FlowProgress({ step }) {
  return (
    <div className="respondent-progress" aria-label={`Tahap ${step === 'profile' ? '2' : '1'} dari 2`}>
      <div className={`respondent-progress-step${step === 'eligibility' ? ' is-active' : ' is-complete'}`}>
        <span className="respondent-progress-number">{step === 'eligibility' ? '1' : '✓'}</span>
        <span>Konfirmasi</span>
      </div>
      <span className="respondent-progress-line" aria-hidden="true" />
      <div className={`respondent-progress-step${step === 'profile' ? ' is-active' : ''}`}>
        <span className="respondent-progress-number">2</span>
        <span>Data diri</span>
      </div>
    </div>
  )
}

function EligibilityCard({ criteria, checkedCriteriaIds, onToggle, onContinue }) {
  const allCriteriaChecked = criteria.length > 0 && criteria.every((criterion) => checkedCriteriaIds.has(criterion.id))

  return (
    <section className="respondent-card respondent-criteria-card" aria-labelledby="criteria-heading">
      <div className="respondent-card-heading">
        <h2 id="criteria-heading">Kriteria Responden</h2>
        <p>Pastikan Anda memenuhi seluruh kriteria berikut untuk ikut berpartisipasi.</p>
      </div>
      <div className="respondent-criteria-list">
        {criteria.map((criterion) => {
          const inputId = `eligibility-${criterion.id}`
          return (
            <label className="respondent-criterion" htmlFor={inputId} key={criterion.id}>
              <input
                id={inputId}
                type="checkbox"
                checked={checkedCriteriaIds.has(criterion.id)}
                onChange={() => onToggle(criterion.id)}
              />
              <span className="respondent-checkmark" aria-hidden="true">✓</span>
              <span className="respondent-criterion-text">{criterion.statement}</span>
            </label>
          )
        })}
      </div>
      <button className="respondent-continue-button" type="button" disabled={!allCriteriaChecked} onClick={onContinue}>
        Lanjutkan Mengisi Data Diri
        <span aria-hidden="true">→</span>
      </button>
      <p className="respondent-card-footnote">
        {allCriteriaChecked ? 'Semua kriteria telah dikonfirmasi.' : 'Centang semua pernyataan untuk melanjutkan.'}
      </p>
    </section>
  )
}

function ProfileCard({ profile, error, submitting, submittedRespondent, onChange, onSubmit, onBack }) {
  if (submittedRespondent) {
    return (
      <section className="respondent-card respondent-profile-card respondent-profile-card--success" aria-live="polite">
        <div className="respondent-success-icon" aria-hidden="true">✓</div>
        <span className="respondent-card-kicker">Data tersimpan</span>
        <h2>Terima kasih, {profile.name}</h2>
        <p className="respondent-success-copy">
          Profil Anda sudah tercatat. Anda siap melanjutkan ke evaluasi aplikasi.
        </p>
        <div className="respondent-ready-badge">
          <span aria-hidden="true">✦</span>
          Siap untuk tahap berikutnya
        </div>
        <p className="respondent-card-footnote respondent-card-footnote--success">
          Tahap evaluasi berikutnya akan tersedia pada alur selanjutnya.
        </p>
      </section>
    )
  }

  return (
    <section className="respondent-card respondent-profile-card" aria-labelledby="profile-heading">
      <div className="respondent-card-heading">
        <span className="respondent-card-kicker">Langkah 2 dari 2</span>
        <h2 id="profile-heading">Profil Responden</h2>
        <p>Informasi ini membantu memastikan validitas kumpulan data penelitian kami mengenai E-Tourism.</p>
      </div>

      {error && <div className="respondent-form-error" role="alert">{error}</div>}

      <form className="respondent-profile-form" onSubmit={onSubmit} noValidate>
        <div className="respondent-field respondent-field--full">
          <label htmlFor="respondent-name">Nama <span>*</span></label>
          <input
            id="respondent-name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Masukkan nama lengkap Anda"
            value={profile.name}
            onChange={onChange}
            required
          />
        </div>

        <div className="respondent-field respondent-field--half">
          <label htmlFor="respondent-age">Umur <span>*</span></label>
          <div className="respondent-input-with-suffix">
            <input
              id="respondent-age"
              name="age"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              placeholder="Contoh: 22"
              value={profile.age}
              onChange={onChange}
              required
            />
            <span>tahun</span>
          </div>
        </div>

        <div className="respondent-field respondent-field--half">
          <label htmlFor="respondent-gender">Gender <span>*</span></label>
          <select id="respondent-gender" name="gender" value={profile.gender} onChange={onChange} required>
            <option value="">Pilih gender</option>
            <option value="male">Laki-laki</option>
            <option value="female">Perempuan</option>
            <option value="other">Lainnya</option>
            <option value="prefer_not_to_say">Memilih untuk tidak menjawab</option>
          </select>
        </div>

        <div className="respondent-field respondent-field--full">
          <label htmlFor="respondent-occupation">Pekerjaan <span>*</span></label>
          <input
            id="respondent-occupation"
            name="occupation"
            type="text"
            autoComplete="organization-title"
            placeholder="Contoh: Mahasiswa"
            value={profile.occupation}
            onChange={onChange}
            required
          />
        </div>

        <div className="respondent-field respondent-field--full">
          <label htmlFor="respondent-province">Domisili <span>*</span></label>
          <select id="respondent-province" name="province" value={profile.province} onChange={onChange} required>
            <option value="">Pilih provinsi</option>
            {PROVINCES.map((p) => (
              <option key={p.code} value={p.code}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="respondent-field respondent-field--full">
          <label htmlFor="respondent-email">Email <span>*</span></label>
          <input
            id="respondent-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="nama@email.com"
            value={profile.email}
            onChange={onChange}
            required
          />
        </div>

        <div className="respondent-form-actions respondent-field--full">
          {onBack && (
            <button className="respondent-back-button" type="button" onClick={onBack}>
              <span aria-hidden="true">←</span> Kembali
            </button>
          )}
          <button className="respondent-submit-button" type="submit" disabled={submitting}>
            {submitting ? 'Menyimpan...' : 'Mulai Mengevaluasi Aplikasi'}
            {!submitting && <span aria-hidden="true">→</span>}
          </button>
        </div>
        <p className="respondent-privacy-note respondent-field--full">
          <span aria-hidden="true">🔒</span> Data Anda hanya digunakan untuk keperluan penelitian ini.
        </p>
      </form>
    </section>
  )
}

function ScenarioBriefingDialog({ taskCount, estimateMinutes, submitting, onConfirm, onCancel }) {
  const hasTasks = taskCount > 0
  const dialogRef = useRef(null)

  useModalDialog({ dialogRef, onClose: onCancel })

  return (
    <div className="respondent-modal-overlay" role="presentation">
      <section
        ref={dialogRef}
        className="respondent-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="briefing-heading"
        aria-describedby="briefing-description"
        tabIndex={-1}
      >
        <div className="respondent-modal-icon" aria-hidden="true">◷</div>
        <h2 id="briefing-heading">Siap mengerjakan skenario tugas?</h2>
        <p id="briefing-description">
          {hasTasks
            ? `Anda akan mengerjakan ${taskCount} skenario tugas pada aplikasi yang dievaluasi. Setiap skenario meminta Anda mencoba satu fitur tertentu, lalu menandai apakah tugas berhasil atau gagal diselesaikan.`
            : 'Setelah ini Anda akan langsung mengisi kuesioner usability untuk aplikasi yang dievaluasi.'}
        </p>
        <ul className="respondent-modal-list">
          <li><strong>Perkiraan waktu ± {estimateMinutes} menit.</strong> Kerjakan dalam satu sesi sampai selesai.</li>
          <li>Dibutuhkan fokus penuh — hindari gangguan selama mengerjakan.</li>
          <li>Jangan menutup atau me-refresh halaman ini; waktu pengerjaan tiap tugas dicatat otomatis.</li>
          <li>Tidak ada jawaban benar atau salah. Pilih "Saya Gagal Menyelesaikan" bila mengalami kendala teknis.</li>
        </ul>
        <div className="respondent-modal-actions">
          <button className="respondent-back-button" type="button" onClick={onCancel} disabled={submitting}>
            Periksa Data Lagi
          </button>
          <button className="respondent-submit-button" type="button" onClick={onConfirm} disabled={submitting}>
            {submitting ? 'Menyimpan...' : 'Saya Mengerti, Mulai'}
            {!submitting && <span aria-hidden="true">→</span>}
          </button>
        </div>
      </section>
    </div>
  )
}

export default function RespondentEligibilityPage() {
  const { token = '' } = useParams()
  const [evaluation, setEvaluation] = useState(null)
  const [checkedCriteriaIds, setCheckedCriteriaIds] = useState(() => new Set(getStoredCriteria(token)))
  const [profile, setProfile] = useState(EMPTY_PROFILE)
  const storedRespondent = getStoredRespondent(token)
  const storedFlowStep = getStoredFlowStep(token)
  const [submittedRespondent, setSubmittedRespondent] = useState(storedRespondent)
  const [flowStep, setFlowStep] = useState(() => {
    if (storedRespondent && storedFlowStep) return storedFlowStep
    if (storedRespondent) return 'tasks'
    return 'eligibility'
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [profileError, setProfileError] = useState('')
  const [showBriefing, setShowBriefing] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    if (submittedRespondent && (flowStep === 'tasks' || flowStep === 'questionnaire')) {
      storeFlowStep(token, flowStep)
    }
  }, [flowStep, submittedRespondent, token])

  useEffect(() => {
    if (!showBriefing) return undefined
    return lockBodyScroll()
  }, [showBriefing])

  useEffect(() => {
    let mounted = true

    async function loadEvaluation() {
      if (!token) {
        if (mounted) {
          setError('Tautan evaluasi tidak valid.')
          setLoading(false)
        }
        return
      }

      setLoading(true)
      setError('')
      try {
        const data = await getPublicEvaluation(token)
        if (!mounted) return
        setEvaluation(data)
        const criteria = data.eligibility_criteria || []
        const criteriaIds = new Set(criteria.map((criterion) => criterion.id))
        const storedCriteria = getStoredCriteria(token).filter((id) => criteriaIds.has(id))
        setCheckedCriteriaIds(new Set(storedCriteria))

        const existingRespondent = getStoredRespondent(token)
        if (!existingRespondent) {
          setFlowStep(criteria.length > 0 ? 'eligibility' : 'profile')
        }
      } catch (requestError) {
        if (mounted) setError(getErrorMessage(requestError, 'Evaluasi tidak dapat dimuat. Silakan coba lagi.'))
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadEvaluation()
    return () => {
      mounted = false
    }
  }, [token, retryKey])

  const criteria = useMemo(
    () => sortCriteria(evaluation?.eligibility_criteria || []),
    [evaluation],
  )

  const questionnaire = evaluation?.questionnaire || {}
  const appName = questionnaire.app_name || 'Aplikasi yang akan dievaluasi'
  const appLink = questionnaire.app_link || ''
  const taskScenarios = evaluation?.task_scenarios || []
  const isProfileStep = flowStep === 'profile'
  const briefingEstimateMinutes = taskScenarios.length > 0
    ? Math.ceil((taskScenarios.length * 3 + 7) / 5) * 5
    : 10
  const showBriefingDialog = showBriefing && isProfileStep && !submittedRespondent

  const toggleCriteria = (criterionId) => {
    setCheckedCriteriaIds((current) => {
      const next = new Set(current)
      if (next.has(criterionId)) {
        next.delete(criterionId)
      } else {
        next.add(criterionId)
      }
      storeCriteria(token, [...next])
      return next
    })
  }

  const handleEligibilityContinue = () => {
    storeCriteria(token, [...checkedCriteriaIds])
    setFlowStep('profile')
    setProfileError('')
  }

  const handleProfileChange = (event) => {
    const { name, value } = event.target
    setProfile((current) => ({ ...current, [name]: value }))
    setProfileError('')
  }

  const validateProfile = () => {
    const name = profile.name.trim()
    const age = profile.age === '' ? undefined : Number(profile.age)

    if (!name) return { error: 'Nama wajib diisi sebelum memulai evaluasi.' }
    if (profile.age === '' || !Number.isInteger(age) || age < 0) {
      return { error: 'Umur wajib diisi dengan bilangan bulat 0 atau lebih.' }
    }
    if (!profile.gender) return { error: 'Gender wajib dipilih.' }
    if (!profile.occupation.trim()) return { error: 'Pekerjaan wajib diisi.' }
    if (!profile.province) return { error: 'Domisili wajib dipilih.' }
    if (!profile.email.trim()) return { error: 'Email wajib diisi.' }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) {
      return { error: 'Gunakan format email yang valid.' }
    }

    return {
      data: {
        name,
        email: profile.email.trim(),
        age,
        gender: profile.gender,
        occupation: profile.occupation.trim(),
        province: profile.province,
        checked_criteria_ids: [...checkedCriteriaIds],
      },
    }
  }

  const handleProfileSubmit = (event) => {
    event.preventDefault()
    const { error: validationError } = validateProfile()
    if (validationError) {
      setProfileError(validationError)
      return
    }
    setProfileError('')
    setShowBriefing(true)
  }

  const handleConfirmStart = async () => {
    const { data, error: validationError } = validateProfile()
    if (validationError) {
      setProfileError(validationError)
      setShowBriefing(false)
      return
    }

    setSubmitting(true)
    setProfileError('')
    try {
      const respondent = await startRespondent(token, data)
      setSubmittedRespondent(respondent)
      storeRespondent(token, respondent)
      setShowBriefing(false)
      setFlowStep(taskScenarios.length > 0 ? 'tasks' : 'questionnaire')
    } catch (requestError) {
      setShowBriefing(false)
      setProfileError(getErrorMessage(requestError, 'Data diri belum dapat disimpan. Silakan coba lagi.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="respondent-page respondent-page--centered" aria-busy="true">
        <div className="respondent-status-card">
          <span className="respondent-spinner" aria-hidden="true" />
          <p>Menyiapkan survei untuk Anda...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="respondent-page respondent-page--centered">
        <div className="respondent-status-card respondent-status-card--error" role="alert">
          <div className="respondent-status-icon" aria-hidden="true">!</div>
          <h1>Evaluasi tidak tersedia</h1>
          <p>{error}</p>
          <button type="button" onClick={() => setRetryKey((current) => current + 1)}>
            Coba Lagi
          </button>
        </div>
      </main>
    )
  }

  if (flowStep === 'tasks' && submittedRespondent) {
    return (
      <RespondentTaskScenarioPage
        tasks={taskScenarios}
        appName={appName}
        appLink={appLink}
        token={token}
        respondentId={submittedRespondent.respondent_id}
        onFinished={() => setFlowStep('questionnaire')}
      />
    )
  }

  if (flowStep === 'questionnaire' && submittedRespondent) {
    return (
      <RespondentQuestionnairePage
        evaluation={evaluation}
        appName={appName}
        token={token}
        respondentId={submittedRespondent.respondent_id}
      />
    )
  }

  return (
    <main className="respondent-page">
      <div className="respondent-decoration respondent-decoration--one" aria-hidden="true" />
      <div className="respondent-decoration respondent-decoration--two" aria-hidden="true" />
      <div className="respondent-shell">
        <div className="respondent-topbar">
          <div className="respondent-brand">
            <span className="respondent-brand-mark">I</span>
            <span>I-TAUQ</span>
          </div>
          <span className="respondent-topbar-caption">Survei responden</span>
        </div>

        <header className={`respondent-hero${isProfileStep ? ' respondent-hero--profile' : ''}`}>
          <div className="respondent-hero-copy">
            <span className="respondent-eyebrow">Indonesian Tourism Application Usability Questionnaire</span>
            <h1>Survei Usability<br />E-Tourism Indonesia</h1>
            <p>
              {isProfileStep
                ? 'Silahkan mengisi data diri Anda untuk melanjutkan.'
                : 'Selamat datang di halaman responden I-TAUQ. Partisipasi Anda membantu kami memetakan masa depan kegunaan E-Tourism berkelanjutan di Indonesia.'}
            </p>
          </div>
          <div className="respondent-hero-art" aria-hidden="true">
            <div className="respondent-hero-art-card respondent-hero-art-card--back" />
            <div className="respondent-hero-art-card respondent-hero-art-card--front">
              <span>ITAUQ</span>
              <strong>Usability<br />Study</strong>
            </div>
            <span className="respondent-hero-art-spark">✦</span>
          </div>
        </header>

        <FlowProgress step={flowStep} />

        <div className="respondent-content-grid">
          <section className="respondent-card respondent-app-card" aria-labelledby="app-heading">
            <div className="respondent-card-heading">
              <span className="respondent-card-kicker">Objek evaluasi</span>
              <h2 id="app-heading">Sekilas Aplikasi yang akan Anda evaluasi</h2>
            </div>
            <AppPreview appName={appName} imgLink={questionnaire.img_link} />
            <p className="respondent-app-name">{appName}</p>
            <p className="respondent-app-caption">Bantu kami membuat pengalaman digital pariwisata yang lebih baik.</p>
          </section>

          {isProfileStep ? (
            <ProfileCard
              profile={profile}
              error={profileError}
              submitting={submitting}
              submittedRespondent={submittedRespondent}
              onChange={handleProfileChange}
              onSubmit={handleProfileSubmit}
              onBack={criteria.length > 0 ? () => setFlowStep('eligibility') : undefined}
            />
          ) : (
            <EligibilityCard
              criteria={criteria}
              checkedCriteriaIds={checkedCriteriaIds}
              onToggle={toggleCriteria}
              onContinue={handleEligibilityContinue}
            />
          )}
        </div>
      </div>

      {showBriefingDialog && (
        <ScenarioBriefingDialog
          taskCount={taskScenarios.length}
          estimateMinutes={briefingEstimateMinutes}
          submitting={submitting}
          onConfirm={handleConfirmStart}
          onCancel={() => setShowBriefing(false)}
        />
      )}
    </main>
  )
}
