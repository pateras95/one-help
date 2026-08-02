const STORAGE_KEY = 'onehelp.attendance.qrSession'

function isValidSession(session) {
  return Boolean(
    session &&
    typeof session.actionId === 'string' && session.actionId &&
    typeof session.organizerId === 'string' && session.organizerId &&
    typeof session.token === 'string' && session.token &&
    typeof session.tokenId === 'string' && session.tokenId &&
    typeof session.expiresAt === 'string' && session.expiresAt
  )
}

/**
 * Reads and validates persisted organizer QR sessions (one active session
 * per action). Malformed storage is repaired rather than ignored, same
 * "repair on read" pattern as every other mock store in this app.
 *
 * @returns {Array<Object>}
 */
export function readQrSessions() {
  let raw
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return []
  }

  if (!raw) return []

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    writeQrSessions([])
    return []
  }

  if (!Array.isArray(parsed)) {
    writeQrSessions([])
    return []
  }

  const valid = parsed.filter(isValidSession)
  if (valid.length !== parsed.length) {
    writeQrSessions(valid)
  }
  return valid
}

/**
 * @param {Array<Object>} sessions
 */
export function writeQrSessions(sessions) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  } catch {
    // Ignore write failures — persistence is a nice-to-have here too.
  }
}

/**
 * Reads the persisted session for a single action, if any.
 *
 * @param {string} actionId
 * @returns {Object|null}
 */
export function getQrSessionForAction(actionId) {
  return readQrSessions().find((session) => session.actionId === actionId) ?? null
}

/**
 * Replaces (or creates) the single active session for `session.actionId` —
 * generating a new token for an action always supersedes its old one.
 *
 * @param {Object} session
 */
export function upsertQrSession(session) {
  const sessions = readQrSessions().filter((existing) => existing.actionId !== session.actionId)
  sessions.push(session)
  writeQrSessions(sessions)
  return session
}
