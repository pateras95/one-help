import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  login as loginRequest,
  register as registerRequest,
  logout as logoutRequest,
  getCurrentSession
} from '../services/auth.service'

const SESSION_STORAGE_KEY = 'onehelp.auth.session'

function readStoredSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.userId !== 'string' || !parsed.userId) return null
    return parsed
  } catch {
    // Malformed JSON or localStorage unavailable — treat as no session.
    return null
  }
}

function writeStoredSession(session) {
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Ignore write failures — persistence is a nice-to-have, not required
    // for the app to function (same approach as the locale store).
  }
}

function clearStoredSession() {
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
  } catch {
    // Ignore.
  }
}

/**
 * Owns the mocked auth session: current user, loading/error state, and
 * login/register/logout. Persists only `{ userId, issuedAt }` — never a
 * password or raw credentials — and re-validates it against the mock
 * user "database" on boot via `getCurrentSession`, mirroring how a real
 * app would re-check a session cookie/token rather than trusting
 * whatever's in storage at face value.
 */
export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref(null)
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

  async function runInitialization() {
    const stored = readStoredSession()
    if (!stored) {
      // Covers both "nothing stored" and "unparsable/malformed JSON" —
      // `readStoredSession` returns `null` for either. Clearing here too
      // (not just in the catch below) makes sure garbage left over from
      // a malformed value actually gets removed, not just ignored.
      clearStoredSession()
      isInitialized.value = true
      return
    }

    try {
      currentUser.value = await getCurrentSession(stored.userId)
    } catch {
      // Stale or otherwise invalid session — clear it rather than
      // leaving the app in a half-authenticated state.
      clearStoredSession()
      currentUser.value = null
    } finally {
      isInitialized.value = true
    }
  }

  /**
   * Restores a persisted session, if any. Safe to call repeatedly (e.g.
   * once from `main.js` at boot and again from the router guard) — every
   * caller awaits the same underlying run.
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
      const user = await loginRequest(email, password)
      currentUser.value = user
      writeStoredSession({ userId: user.id, issuedAt: new Date().toISOString() })
      return user
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
      const user = await registerRequest(payload)
      currentUser.value = user
      writeStoredSession({ userId: user.id, issuedAt: new Date().toISOString() })
      return user
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    await logoutRequest()
    currentUser.value = null
    clearStoredSession()
  }

  /**
   * Re-fetches the current user from the mock "database" and updates
   * `currentUser` in place, without touching the stored session or
   * redirecting anywhere. Used after an action taken elsewhere (e.g. an
   * admin approving this same user's organizer application) may have
   * changed their role/status — lets the already-open tab reflect it
   * immediately (nav, guards) without requiring a manual logout/login,
   * as long as the user revisits/refreshes the relevant screen. This is
   * not live cross-tab sync — a real backend would push this via a
   * session refresh or websocket; here it's an explicit, safe refetch.
   */
  async function refreshCurrentUser() {
    if (!currentUser.value) return
    try {
      currentUser.value = await getCurrentSession(currentUser.value.id)
    } catch {
      // Session no longer valid (e.g. suspended in the meantime) — same
      // handling as a failed boot-time initialization.
      currentUser.value = null
      clearStoredSession()
    }
  }

  return {
    currentUser,
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
