import { ROLES } from '@/constants/roles'

const STORAGE_KEY = 'onehelp.auth.userRoleOverride'

/**
 * A persisted override of a user's mock `role` field — needed because
 * `auth.service.js`'s in-memory `usersDb` resets to the static fixture on every
 * reload, the same reason account *status* has its own overlay
 * (`admin/mocks/userStatus.storage.js`). Relevant only in mock-auth mode
 * (`VITE_DATA_SOURCE=mock`) now — the real backend (Organizations phase) has no
 * override concept at all: `users.role` is updated directly, in the same
 * transaction as organizer-application approval/demotion (ADR-4/ADR-8), with no
 * separate membership table or role field to keep in sync.
 */
function isValidRecord(record) {
  return Boolean(
    record &&
    typeof record.userId === 'string' && record.userId &&
    Object.values(ROLES).includes(record.role)
  )
}

/**
 * Reads and validates the persisted role-override list. Malformed
 * storage is repaired rather than just ignored in memory — same
 * "repair on read" approach used by every other mock store in this app.
 *
 * @returns {Array<{userId: string, role: string, updatedAt: string, updatedBy: string}>}
 */
export function readUserRoleOverrides() {
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
    writeUserRoleOverrides([])
    return []
  }

  if (!Array.isArray(parsed)) {
    writeUserRoleOverrides([])
    return []
  }

  const valid = parsed.filter(isValidRecord)
  if (valid.length !== parsed.length) {
    writeUserRoleOverrides(valid)
  }
  return valid
}

/** @param {Array<Object>} records */
export function writeUserRoleOverrides(records) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    // Ignore write failures — persistence is a nice-to-have, not required
    // for the app to function (same approach as the other mock stores).
  }
}

/**
 * @param {string} userId
 * @returns {string|null} The overridden role, or `null` if none is set
 *   (meaning the base fixture's role still applies).
 */
export function getUserRoleOverride(userId) {
  return readUserRoleOverrides().find((record) => record.userId === userId)?.role ?? null
}

/**
 * @param {string} userId
 * @param {string} role - One of `ROLES`.
 * @param {string} updatedBy - The admin user id making the change.
 */
export function setUserRoleOverride(userId, role, updatedBy) {
  const records = readUserRoleOverrides()
  const index = records.findIndex((record) => record.userId === userId)
  const entry = { userId, role, updatedAt: new Date().toISOString(), updatedBy }
  if (index === -1) records.push(entry)
  else records[index] = entry
  writeUserRoleOverrides(records)
  return entry
}
