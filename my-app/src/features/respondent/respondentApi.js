import { api } from '../../shared/api/apiClient'

function evaluationPath(token) {
  return `/public/evaluation/${encodeURIComponent(token)}`
}

function respondentPath(token, respondentId, suffix = '') {
  return `${evaluationPath(token)}/respondents/${encodeURIComponent(respondentId)}${suffix}`
}

export function getPublicEvaluation(token) {
  return api.get(evaluationPath(token), { public: true })
}

export function startRespondent(token, respondent) {
  return api.post(`${evaluationPath(token)}/respondents`, respondent, { public: true })
}

export function submitTaskAttempts(token, respondentId, attempts) {
  return api.post(respondentPath(token, respondentId, '/task-attempts'), { attempts }, { public: true })
}

export function submitItauqAnswers(token, respondentId, answers) {
  return api.post(respondentPath(token, respondentId, '/answers'), { answers }, { public: true })
}

export function submitSusAnswers(token, respondentId, answers) {
  return api.post(respondentPath(token, respondentId, '/sus-answers'), { answers }, { public: true })
}

export function submitEvaluation(token, respondentId) {
  return api.post(respondentPath(token, respondentId, '/submit'), undefined, { public: true })
}

export const respondentApi = {
  getPublicEvaluation,
  startRespondent,
  submitTaskAttempts,
  submitItauqAnswers,
  submitSusAnswers,
  submitEvaluation,
}
