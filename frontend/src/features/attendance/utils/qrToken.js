/**
 * Mocked QR check-in token: an opaque, base64url-encoded JSON payload —
 * NOT a cryptographically signed token. Nothing here proves authenticity;
 * it only carries enough shape to simulate the real flow (issue, display,
 * scan, validate, expire). A real backend would replace `decodeQrToken`
 * with genuine signature verification while keeping the same calling
 * contract (`{ actionId, organizerId, expiresAt, ... } | null`), so
 * callers never need to change.
 *
 * Deliberately excluded from the payload: any participant/user identity
 * (name, email), passwords, or session data — the token only identifies
 * an action + organizer + a short-lived session, never a person.
 */

export const QR_TOKEN_TTL_MINUTES = 10

function toBase64Url(value) {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  return atob(padded)
}

function isValidTokenPayload(payload) {
  return Boolean(
    payload &&
    typeof payload.tokenId === 'string' && payload.tokenId &&
    typeof payload.actionId === 'string' && payload.actionId &&
    typeof payload.organizerId === 'string' && payload.organizerId &&
    typeof payload.issuedAt === 'string' &&
    typeof payload.expiresAt === 'string' &&
    typeof payload.nonce === 'string' && payload.nonce
  )
}

/**
 * Builds a fresh token payload for one organizer-owned action.
 *
 * @param {Object} params
 * @param {string} params.actionId
 * @param {string} params.organizerId
 * @param {number} [params.ttlMinutes]
 * @returns {Object} The plain payload (encode with `encodeQrToken` to get the QR-able string).
 */
export function createQrTokenPayload({ actionId, organizerId, ttlMinutes = QR_TOKEN_TTL_MINUTES }) {
  const issuedAt = new Date()
  const expiresAt = new Date(issuedAt.getTime() + ttlMinutes * 60000)
  return {
    tokenId: crypto.randomUUID(),
    actionId,
    organizerId,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    nonce: crypto.randomUUID().slice(0, 8)
  }
}

/**
 * @param {Object} payload
 * @returns {string} Opaque token string, safe to embed in a QR code or a URL query param.
 */
export function encodeQrToken(payload) {
  return toBase64Url(JSON.stringify(payload))
}

/**
 * Decodes and structurally validates a token string. Never throws —
 * malformed input (bad base64, bad JSON, missing fields) resolves to
 * `null`, which callers treat as an `invalidToken` error.
 *
 * @param {string} tokenString
 * @returns {Object|null}
 */
export function decodeQrToken(tokenString) {
  if (!tokenString || typeof tokenString !== 'string') return null
  try {
    const parsed = JSON.parse(fromBase64Url(tokenString))
    return isValidTokenPayload(parsed) ? parsed : null
  } catch {
    return null
  }
}

/**
 * @param {Object} payload
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isTokenExpired(payload, now = new Date()) {
  return now.getTime() > new Date(payload.expiresAt).getTime()
}
