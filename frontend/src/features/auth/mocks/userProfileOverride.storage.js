const STORAGE_KEY = 'onehelp.auth.userProfileOverride'

/**
 * A persisted override of a user's own `firstName`/`lastName`/`email` —
 * needed for the same reason role/status have their own overlays:
 * `auth.service.js`'s in-memory `usersDb` resets to the static fixture
 * on every reload. Only the admin user-edit dialog ever writes this.
 */
function isValidRecord(record) {
  return Boolean(
    record &&
    typeof record.userId === 'string' && record.userId &&
    typeof record.firstName === 'string' && record.firstName &&
    typeof record.lastName === 'string' && record.lastName &&
    typeof record.email === 'string' && record.email
  )
}

/**
 * Reads and validates the persisted profile-override list. Malformed
 * storage is repaired rather than just ignored in memory — same
 * "repair on read" approach used by every other mock store in this app.
 *
 * @returns {Array<{userId: string, firstName: string, lastName: string, email: string, updatedAt: string, updatedBy: string}>}
 */
export function readUserProfileOverrides() {
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
    writeUserProfileOverrides([])
    return []
  }

  if (!Array.isArray(parsed)) {
    writeUserProfileOverrides([])
    return []
  }

  const valid = parsed.filter(isValidRecord)
  if (valid.length !== parsed.length) {
    writeUserProfileOverrides(valid)
  }
  return valid
}

/** @param {Array<Object>} records */
export function writeUserProfileOverrides(records) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    // Ignore write failures — persistence is a nice-to-have, not required
    // for the app to function (same approach as the other mock stores).
  }
}

/**
 * @param {string} userId
 * @returns {{firstName: string, lastName: string, email: string}|null}
 */
export function getUserProfileOverride(userId) {
  const record = readUserProfileOverrides().find((candidate) => candidate.userId === userId)
  return record ? { firstName: record.firstName, lastName: record.lastName, email: record.email } : null
}

/**
 * @param {string} userId
 * @param {{firstName: string, lastName: string, email: string}} profile
 * @param {string} updatedBy - The admin user id making the change.
 */
export function setUserProfileOverride(userId, { firstName, lastName, email }, updatedBy) {
  const records = readUserProfileOverrides()
  const index = records.findIndex((record) => record.userId === userId)
  const entry = { userId, firstName, lastName, email, updatedAt: new Date().toISOString(), updatedBy }
  if (index === -1) records.push(entry)
  else records[index] = entry
  writeUserProfileOverrides(records)
  return entry
}
