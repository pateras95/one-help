/**
 * In-memory-only bridge between the low-level HTTP client (`http.js`) and the auth
 * store, so `http.js` never has to import the Pinia store directly (avoiding a
 * `http.js` → `auth.store.js` → `auth.service.js` → `http.js` circular import, and
 * any risk of running before Pinia is installed). The access token is held here as a
 * plain module-scoped variable — never localStorage/sessionStorage/IndexedDB/a
 * frontend-created cookie — so it is gone on every page reload by design (ADR-1).
 *
 * `auth.store.js` calls `setSessionHandlers()` once, at store creation, so the HTTP
 * layer's silent-refresh interceptor can update the store's reactive state without
 * ever referencing `useAuthStore` itself.
 */

let accessToken = null

let handlers = {
  onSessionRefreshed: null,
  onSessionExpired: null
}

export function getAccessToken() {
  return accessToken
}

export function setAccessToken(token) {
  accessToken = token
}

export function clearAccessToken() {
  accessToken = null
}

/**
 * @param {{onSessionRefreshed?: (user: object, expiresIn: number) => void, onSessionExpired?: () => void}} newHandlers
 */
export function setSessionHandlers(newHandlers) {
  handlers = { ...handlers, ...newHandlers }
}

export function notifySessionRefreshed(user, expiresIn) {
  handlers.onSessionRefreshed?.(user, expiresIn)
}

export function notifySessionExpired() {
  handlers.onSessionExpired?.()
}
