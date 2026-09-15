import { useMemo, useState } from 'react'
import { ApiError } from '../../shared/api/apiClient'
import { submitEvaluation, submitItauqAnswers, submitSusAnswers } from './respondentApi'
import './RespondentQuestionnairePage.css'

const EMPTY_QUESTIONS = []

function getStoredQuestionnaireState(token) {
  try {
    const stored = window.localStorage.getItem(`itauq:respondent:${token}:questionnaire`)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

function storeQuestionnaireState(token, state) {
  try {
    window.localStorage.setItem(`itauq:respondent:${token}:questionnaire`, JSON.stringify(state))
  } catch {
    // Enhancement only
  }
}

function getScale(min, max, fallbackMax) {
  const scaleMin = Number.isFinite(Number(min)) ? Number(min) : 1
  const scaleMax = Number.isFinite(Number(max)) ? Number(max) : fallbackMax
  return Array.from({ length: Math.max(scaleMax - scaleMin + 1, 0) }, (_, index) => scaleMin + index)
}

function groupQuestions(questions) {
  return questions.reduce((groups, question) => {
    const category = question.category || 'Usability'
    const current = groups.get(category) || []
    current.push(question)
    groups.set(category, current)
    return groups
  }, new Map())
}

function getErrorMessage(error) {
  if (error instanceof ApiError) {
    if (error.code === 'LINK_INACTIVE') return 'Tautan evaluasi sudah tidak aktif atau telah kedaluwarsa.'
    if (error.code === 'INCOMPLETE_SESSION') return 'Sesi belum lengkap. Pastikan semua pertanyaan dan skenario tugas telah diselesaikan.'
    if (error.code === 'INVALID_ANSWERS' || error.code === 'INVALID_SUS_ANSWERS') {
      return 'Ada jawaban yang belum dapat diterima server. Silakan periksa kembali pilihan Anda.'
    }
  }
  return error?.message || 'Jawaban belum dapat dikirim. Silakan coba lagi.'
}

function QuestionScale({ question, scale, value, onChange, minLabel, maxLabel, namePrefix }) {
  return (
    <fieldset className="questionnaire-question">
      <legend>
        <span className="questionnaire-question-number">{question.displayNumber}.</span>
        {question.text}
      </legend>
      <div className="questionnaire-scale">
        <span className="questionnaire-scale-label questionnaire-scale-label--min">{minLabel}</span>
        <div className="questionnaire-scale-options">
          {scale.map((score) => {
            const inputId = `${namePrefix}-${question.id}-${score}`
            return (
              <label className="questionnaire-scale-option" htmlFor={inputId} key={score}>
                <input
                  id={inputId}
                  name={`${namePrefix}-${question.id}`}
                  type="radio"
                  value={score}
                  checked={value === score}
                  onChange={() => onChange(question.id, score)}
                />
                <span className="questionnaire-radio" aria-hidden="true" />
                <span className="questionnaire-scale-number">{score}</span>
              </label>
            )
          })}
        </div>
        <span className="questionnaire-scale-label questionnaire-scale-label--max">{maxLabel}</span>
      </div>
    </fieldset>
  )
}

function CategorySection({ category, questions, answers, scale, onChange, startNumber, namePrefix = 'itauq', defaultMinLabel = 'Tidak sesuai', defaultMaxLabel = 'Sangat sesuai' }) {
  const sectionClass = namePrefix === 'sus' ? 'questionnaire-category questionnaire-category--sus' : 'questionnaire-category'
  return (
    <section className={sectionClass} aria-labelledby={`category-${namePrefix}-${category}`}>
      <h2 id={`category-${namePrefix}-${category}`} className="questionnaire-category-title">{category}</h2>
      <div className="questionnaire-question-list">
        {questions.map((question, index) => (
          <QuestionScale
            key={question.id}
            question={{ ...question, displayNumber: startNumber + index }}
            scale={scale}
            value={answers[question.id]}
            onChange={onChange}
            minLabel={question.minLabel || defaultMinLabel}
            maxLabel={question.maxLabel || defaultMaxLabel}
            namePrefix={namePrefix}
          />
        ))}
      </div>
    </section>
  )
}

function QuestionnaireSubmitted({ appName, submittedAt }) {
  return (
    <main className="respondent-questionnaire-page respondent-questionnaire-page--centered">
      <div className="questionnaire-submitted-card">
        <div className="questionnaire-submitted-icon" aria-hidden="true">✓</div>
        <span className="questionnaire-eyebrow">Jawaban terkirim</span>
        <h1>Terima kasih telah berpartisipasi</h1>
        <p>
          Jawaban Anda untuk evaluasi <strong>{appName}</strong> telah berhasil disimpan.
        </p>
        {submittedAt && <small>Dikirim pada {new Date(submittedAt).toLocaleString('id-ID')}</small>}
      </div>
    </main>
  )
}

export default function RespondentQuestionnairePage({ evaluation, appName, token, respondentId }) {
  const itauqQuestions = evaluation?.itauq?.questions ?? EMPTY_QUESTIONS
  const susQuestions = evaluation?.sus?.questions ?? EMPTY_QUESTIONS
  const itauqScale = getScale(evaluation?.itauq?.scale_min, evaluation?.itauq?.scale_max, 7)
  const susScale = getScale(evaluation?.sus?.scale_min, evaluation?.sus?.scale_max, 5)
  const categories = useMemo(() => [...groupQuestions(itauqQuestions).entries()], [itauqQuestions])
  const storedState = getStoredQuestionnaireState(token)
  const [instrumentStep, setInstrumentStep] = useState(storedState?.instrumentStep || 'itauq')
  const [itauqAnswers, setItauqAnswers] = useState(storedState?.itauqAnswers || {})
  const [susAnswers, setSusAnswers] = useState(storedState?.susAnswers || {})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submittedAt, setSubmittedAt] = useState('')

  const isItauqStep = instrumentStep === 'itauq'
  const activeQuestions = isItauqStep ? itauqQuestions : susQuestions
  const activeAnswers = isItauqStep ? itauqAnswers : susAnswers
  const activeScale = isItauqStep ? itauqScale : susScale
  const answeredCount = Object.keys(activeAnswers).length
  const totalQuestionCount = activeQuestions.length
  const totalStages = susQuestions.length > 0 ? 4 : 3
  const currentStage = isItauqStep ? 3 : 4

  const updateItauqAnswer = (questionId, score) => {
    setItauqAnswers((current) => {
      const next = { ...current, [questionId]: score }
      storeQuestionnaireState(token, { instrumentStep, itauqAnswers: next, susAnswers })
      return next
    })
    setError('')
  }

  const updateSusAnswer = (questionId, score) => {
    setSusAnswers((current) => {
      const next = { ...current, [questionId]: score }
      storeQuestionnaireState(token, { instrumentStep, itauqAnswers, susAnswers: next })
      return next
    })
    setError('')
  }

  const finishQuestionnaire = async () => {
    if (isItauqStep) {
      await submitItauqAnswers(token, respondentId, itauqQuestions.map((question) => ({
        item_id: question.id,
        category: question.category,
        score: itauqAnswers[question.id],
      })))

      if (susQuestions.length > 0) {
        setInstrumentStep('sus')
        storeQuestionnaireState(token, { instrumentStep: 'sus', itauqAnswers, susAnswers })
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return null
      }
    } else {
      await submitSusAnswers(token, respondentId, susQuestions.map((question) => ({
        item_id: question.id,
        score: susAnswers[question.id],
      })))
    }

    const result = await submitEvaluation(token, respondentId)
    return result?.submitted_at || ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const missingQuestion = activeQuestions.find((question) => activeAnswers[question.id] === undefined)

    if (missingQuestion) {
      setError('Silakan jawab semua pertanyaan sebelum melanjutkan.')
      const missingId = `${isItauqStep ? 'itauq' : 'sus'}-${missingQuestion.id}-${activeScale[0]}`
      document.getElementById(missingId)?.closest('.questionnaire-question')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const result = await finishQuestionnaire()
      if (result) {
        setSubmittedAt(result)
        try {
          window.localStorage.removeItem(`itauq:respondent:${token}:session`)
          window.localStorage.removeItem(`itauq:respondent:${token}:flowStep`)
          window.localStorage.removeItem(`itauq:respondent:${token}:taskProgress`)
          window.localStorage.removeItem(`itauq:respondent:${token}:questionnaire`)
        } catch {
          // cleanup best-effort
        }
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  if (submittedAt) {
    return <QuestionnaireSubmitted appName={appName} submittedAt={submittedAt} />
  }

  let questionNumber = 1
  const protocol = isItauqStep
    ? String(evaluation?.itauq?.version || 'ITAUQ').toUpperCase()
    : String(evaluation?.sus?.version || 'SUS').toUpperCase()
  const title = isItauqStep ? 'Kuesioner ITAUQ' : 'Kuesioner SUS'
  const description = isItauqStep
    ? `<b>Indonesian Tourism Application Usability Questionnaire (ITAUQ)</b>. Silakan isi survei di bawah ini untuk <b>membantu mengevaluasi kondisi pengalaman pengguna saat ini dari produk digital ${appName}</b>.`
    : '<b>System Usability Scale (SUS)</b>. Nilai pengalaman Anda saat <b>mengisi website evaluasi ini</b> berdasarkan pernyataan berikut.'

  return (
    <main className="respondent-questionnaire-page">
      <header className="questionnaire-header">
        <div className="questionnaire-brand">EVALUASI USABILITY E-TOURISM</div>
        <nav className="questionnaire-nav" aria-label="Navigasi evaluasi">
          <span className="questionnaire-nav-item">Skenario Tugas</span>
          <span className="questionnaire-nav-item is-active">Kuesioner</span>
          <span className="questionnaire-help" aria-label="Bantuan">?</span>
        </nav>
      </header>

      <div className="questionnaire-shell">
        <div className="questionnaire-progress-row">
          <span>TAHAP {currentStage} DARI {totalStages}</span>
          <span>{answeredCount}/{totalQuestionCount} pertanyaan terjawab</span>
        </div>
        <div className="questionnaire-progress-track" aria-hidden="true">
          <span style={{ width: `${totalQuestionCount ? (answeredCount / totalQuestionCount) * 100 : 0}%` }} />
        </div>

        <section className="questionnaire-intro-card">
          <div className="questionnaire-intro-copy">
            <span className="questionnaire-eyebrow">PROTOKOL: {protocol}</span>
            <h1>{title}</h1>
            <p dangerouslySetInnerHTML={{ __html: description }} />
          </div>
          <div className="questionnaire-hero-visual" aria-hidden="true">
            <span>{isItauqStep ? <>UX<br />STUDY</> : <>SUS<br />STUDY</>}</span>
          </div>
        </section>

        <form onSubmit={handleSubmit}>
          <div className="questionnaire-section-heading">
            <div>
              <span className="questionnaire-eyebrow">{isItauqStep ? 'BAGIAN 1' : 'BAGIAN 2'}</span>
              <h2>{isItauqStep ? 'Evaluasi pengalaman Anda' : 'Evaluasi website ini'}</h2>
            </div>
            <p>Pilih satu jawaban yang paling menggambarkan pendapat Anda.</p>
          </div>

          {isItauqStep ? (
            categories.map(([category, questions]) => {
              const startNumber = questionNumber
              questionNumber += questions.length
              return (
                <CategorySection
                  key={category}
                  category={category}
                  questions={questions}
                  answers={itauqAnswers}
                  scale={itauqScale}
                  onChange={updateItauqAnswer}
                  startNumber={startNumber}
                />
              )
            })
          ) : (
            <CategorySection
              category="System Usability Scale"
              questions={susQuestions}
              answers={susAnswers}
              scale={susScale}
              onChange={updateSusAnswer}
              startNumber={1}
              namePrefix="sus"
              defaultMinLabel="Sangat tidak setuju"
              defaultMaxLabel="Sangat setuju"
            />
          )}

          {error && <div className="questionnaire-form-error" role="alert">{error}</div>}

          <div className="questionnaire-submit-row">
            <p>Pastikan semua jawaban telah sesuai sebelum melanjutkan.</p>
            <button className="questionnaire-submit-button" type="submit" disabled={submitting}>
              {submitting ? 'Menyimpan...' : isItauqStep && susQuestions.length > 0 ? 'Lanjutkan ke SUS' : 'Submit Results'}
              {!submitting && <span aria-hidden="true">→</span>}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
