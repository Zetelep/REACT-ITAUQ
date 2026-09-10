import { supabase } from '../clients/supabaseClient'

const BASE_URL = import.meta.env.VITE_API_URL || ''

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function getToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token || null
}

async function request(method, path, { body, params, public: isPublic, includeMeta = false } = {}) {
  const url = new URL(path, BASE_URL || window.location.origin)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    })
  }

  const headers = { 'Content-Type': 'application/json' }
  if (!isPublic) {
    const token = await getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  const options = { method, headers }
  if (body !== undefined) {
    options.body = JSON.stringify(body)
  }

  const res = await fetch(url.toString(), options)

  if (res.status === 204) return null

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    const code = data?.error?.code || 'INTERNAL_ERROR'
    const message = data?.error?.message || `Request failed (${res.status})`
    throw new ApiError(res.status, code, message)
  }

  if (includeMeta && data?.data !== undefined) {
    return { data: data.data, meta: data.meta }
  }

  return data?.data ?? data
}

export const api = {
  get: (path, opts) => request('GET', path, opts),
  post: (path, body, opts) => request('POST', path, { ...opts, body }),
  patch: (path, body, opts) => request('PATCH', path, { ...opts, body }),
  del: (path, opts) => request('DELETE', path, opts),
}
