import axios from 'axios'
import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  notifySessionRefreshed,
  notifySessionExpired
} from './authSession'
import { normalizeApiUser } from './normalizeApiUser'

/**
 * Shared Axios instance for real backend calls. `withCredentials: true` is required
 * for the HttpOnly refresh cookie to be sent/accepted cross-origin between the Vite
 * dev server (`:5173`) and the Spring Boot backend (`:8080`) — see
 * docs/backend-architecture/security-and-authentication.md § CORS and CSRF policy.
 */
export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  withCredentials: true
})

httpClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/**
 * Extracts the backend's stable `ApiErrorResponse` shape
 * (docs/backend-architecture/error-contract.md) from an Axios error, or a safe
 * fallback for a network failure/unreachable backend (no HTTP response at all).
 *
 * @param {import('axios').AxiosError} error
 * @returns {{code: string, message: string, fieldErrors: Object|null, status: number|null}}
 */
export function extractApiError(error) {
  const data = error?.response?.data
  if (data && typeof data.code === 'string') {
    return {
      code: data.code,
      message: data.message ?? '',
      fieldErrors: data.fieldErrors ?? null,
      status: error.response.status
    }
  }
  return {
    code: 'common.unexpectedError',
    message: 'Network error or the backend is unreachable.',
    fieldErrors: null,
    status: error?.response?.status ?? null
  }
}

const AUTH_ENDPOINTS_EXEMPT_FROM_REFRESH = ['/auth/login', '/auth/register', '/auth/refresh']

function isExemptFromRefresh(url) {
  return AUTH_ENDPOINTS_EXEMPT_FROM_REFRESH.some((path) => url?.startsWith(path))
}

/**
 * Single-flight silent refresh: every 401 that isn't from login/register/refresh
 * itself, and hasn't already been retried once, triggers at most one
 * `POST /auth/refresh` — concurrent 401s share the same in-flight promise rather
 * than each starting their own (no refresh storm). Calls `httpClient` directly
 * (not `auth.service.js`) specifically to avoid a circular import between this file
 * and the auth service/store — see `authSession.js`.
 */
let refreshPromise = null

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config
    const status = error.response?.status

    if (status !== 401 || !config || isExemptFromRefresh(config.url) || config._retriedAfterRefresh) {
      return Promise.reject(error)
    }

    config._retriedAfterRefresh = true

    if (!refreshPromise) {
      refreshPromise = httpClient
        .post('/auth/refresh')
        .then((refreshResponse) => {
          const { accessToken, user, expiresIn } = refreshResponse.data
          setAccessToken(accessToken)
          notifySessionRefreshed(normalizeApiUser(user), expiresIn)
          return accessToken
        })
        .catch((refreshError) => {
          clearAccessToken()
          notifySessionExpired()
          throw refreshError
        })
        .finally(() => {
          refreshPromise = null
        })
    }

    try {
      const newAccessToken = await refreshPromise
      config.headers.Authorization = `Bearer ${newAccessToken}`
      return httpClient(config)
    } catch (refreshError) {
      // The session could not be restored — this is more actionable to the caller
      // than the original request's stale-token 401, so it replaces it.
      return Promise.reject(refreshError)
    }
  }
)
