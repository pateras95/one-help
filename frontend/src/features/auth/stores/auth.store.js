import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  login as loginRequest,
  register as registerRequest,
  logout as logoutRequest,
  refreshSession as refreshSessionRequest,
  getCurrentSession as getCurrentSessionRequest
} from '../services/auth.service'
import { setAccessToken, clearAccessToken, setSessionHandlers, getAccessToken } from '@/services/authSession'

/**
 * Owns the real auth session: current user, in-memory access token, loading/error
 * state, and login/register/logout/session-restoration. The backend is now the
 * source of truth (ADR-1) — nothing about the session is persisted to
 * localStorage/sessionStorage/IndexedDB or a frontend-created cookie; the access
 * token lives only in this store's reactive state (mirrored into `authSession.js`
 * for the HTTP layer) and is gone on every page reload by design. Session
 * restoration after a reload goes through the browser's own HttpOnly refresh
 * cookie instead — see `initializeSession()`.
 */
export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref(null)
  const accessToken = ref(null)
  const expiresIn = ref(null)
  const isInitialized = ref(false)
  const loading = ref(false)
  const error = ref(null)

  const isAuthenticated = computed(() => currentUser.value !== null)

  let initPromise = null

  /** True if there's a current user and their role is one of `roles`. */
  function hasRole(...roles) {
    return isAuthenticated.value && roles.includes(currentUser.value.role)
  }

  function clearError() {
    error.value = null
  }

  /** @param {{accessToken: string|null, expiresIn: number|null, user: Object}} session */
  function hydrateSession(session) {
    currentUser.value = session.user
    accessToken.value = session.accessToken
    expiresIn.value = session.expiresIn
    setAccessToken(session.accessToken)
  }

  /**
   * Clears every piece of session state at once, in memory only — this is the one
   * place "log the user out" happens, so switching users (or losing a session)
   * never leaves a stale field from the previous user behind.
   */
  function clearSession() {
    currentUser.value = null
    accessToken.value = null
    expiresIn.value = null
    clearAccessToken()
  }

  async function runInitialization() {
    try {
      // One silent POST /auth/refresh, not GET /auth/me first: there is no
      // in-memory access token yet on a fresh page load, so calling /auth/me
      // first would be a guaranteed, pointless 401 (Part 10) — the refresh
      // cookie alone is enough to attempt restoration directly.
      const session = await refreshSessionRequest()
      hydrateSession(session)
    } catch {
      // No valid refresh cookie (never logged in, already logged out, or the
      // session genuinely expired) — remain logged out, silently, no error
      // snackbar; this is the expected state for most page loads.
      clearSession()
    } finally {
      isInitialized.value = true
    }
  }

  /**
   * Restores a session from the refresh cookie, if any. Safe to call repeatedly
   * (e.g. once from `main.js` at boot and again from the router guard) — every
   * caller awaits the same underlying run, and it only ever runs once.
   */
  function initializeSession() {
    if (!initPromise) {
      initPromise = runInitialization()
    }
    return initPromise
  }

  async function login(email, password) {
    loading.value = true
    error.value = null
    try {
      const session = await loginRequest(email, password)
      hydrateSession(session)
      return session.user
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function register(payload) {
    loading.value = true
    error.value = null
    try {
      const session = await registerRequest(payload)
      hydrateSession(session)
      return session.user
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Always clears local state, even if the backend call itself fails (an
   * already-expired access token, or the backend being briefly unreachable, must
   * never leave the frontend appearing logged in).
   */
  async function logout() {
    try {
      await logoutRequest()
    } finally {
      clearSession()
    }
  }

  /**
   * Re-fetches the current user (`GET /auth/me`) and updates `currentUser` in
   * place, without touching `isAuthenticated`'s underlying session or redirecting
   * anywhere. Used after an action taken elsewhere (e.g. an admin approving this
   * same user's organizer application) may have changed their role/status.
   */
  async function refreshCurrentUser() {
    if (!currentUser.value) return
    try {
      currentUser.value = await getCurrentSessionRequest()
    } catch {
      clearSession()
    }
  }

  // Wires the HTTP layer's own silent-refresh interceptor (`services/http.js`)
  // back into this store's reactive state, without `http.js` ever importing this
  // store — see `services/authSession.js` for why.
  setSessionHandlers({
    onSessionRefreshed(user, newExpiresIn) {
      currentUser.value = user
      accessToken.value = getAccessToken()
      expiresIn.value = newExpiresIn
    },
    onSessionExpired() {
      clearSession()
    }
  })

  return {
    currentUser,
    accessToken,
    expiresIn,
    isAuthenticated,
    isInitialized,
    loading,
    error,
    login,
    register,
    logout,
    initializeSession,
    refreshCurrentUser,
    hasRole,
    clearError
  }
})
