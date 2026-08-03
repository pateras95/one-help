import { ACCOUNT_STATUS } from '../utils/accountStatus'

const STORAGE_KEY = 'onehelp.admin.userStatus'

function isValidRecord(record) {
  return Boolean(
    record &&
    typeof record.userId === 'string' && record.userId &&
    Object.values(ACCOUNT_STATUS).includes(record.status)
  )
}

/**
 * Reads and validates the persisted account-status overlay. Malformed
 * storage is repaired rather than just ignored in memory — same
 * "repair on read" approach used by every other mock store in this app.
 *
 * @returns {Array<{userId: string, status: string, updatedAt: string, updatedBy: string}>}
 */
export function readUserStatusRecords() {
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
    writeUserStatusRecords([])
    return []
  }

  if (!Array.isArray(parsed)) {
    writeUserStatusRecords([])
    return []
  }

  const valid = parsed.filter(isValidRecord)
  if (valid.length !== parsed.length) {
    writeUserStatusRecords(valid)
  }
  return valid
}

/** @param {Array<Object>} records */
export function writeUserStatusRecords(records) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    // Ignore write failures — persistence is a nice-to-have, not required
    // for the app to function (same approach as the other mock stores).
  }
}

/**
 * A user's current account status. Absent from storage means they were
 * never suspended — always `active`.
 *
 * @param {string} userId
 * @returns {string}
 */
export function getUserStatus(userId) {
  return readUserStatusRecords().find((record) => record.userId === userId)?.status ?? ACCOUNT_STATUS.ACTIVE
}

/**
 * @param {string} userId
 * @param {string} status
 * @param {string} updatedBy - The admin user id making the change.
 */
export function setUserStatus(userId, status, updatedBy) {
  const records = readUserStatusRecords()
  const index = records.findIndex((record) => record.userId === userId)
  const entry = { userId, status, updatedAt: new Date().toISOString(), updatedBy }
  if (index === -1) {
    records.push(entry)
  } else {
    records[index] = entry
  }
  writeUserStatusRecords(records)
  return entry
}
