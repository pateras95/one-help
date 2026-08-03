import { ACTIVITY_ACTION_TYPE, ACTIVITY_TARGET_TYPE } from '../utils/activityLogTypes'

const STORAGE_KEY = 'onehelp.admin.activityLog'

function isValidRecord(record) {
  return Boolean(
    record &&
    typeof record.id === 'string' && record.id &&
    typeof record.adminUserId === 'string' && record.adminUserId &&
    Object.values(ACTIVITY_ACTION_TYPE).includes(record.actionType) &&
    Object.values(ACTIVITY_TARGET_TYPE).includes(record.targetType) &&
    typeof record.targetId === 'string' && record.targetId &&
    typeof record.timestamp === 'string' && record.timestamp
  )
}

/**
 * Reads and validates the persisted activity log. Malformed storage is
 * repaired rather than just ignored in memory — same "repair on read"
 * approach used by every other mock store in this app.
 *
 * This is a mocked administrative history for this demo only — not a
 * legally compliant audit log, and never stores passwords, tokens, or
 * other sensitive personal data (only short, safe metadata strings).
 *
 * @returns {Array<Object>}
 */
export function readActivityLog() {
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
    writeActivityLog([])
    return []
  }

  if (!Array.isArray(parsed)) {
    writeActivityLog([])
    return []
  }

  const valid = parsed.filter(isValidRecord)
  if (valid.length !== parsed.length) {
    writeActivityLog(valid)
  }
  return valid
}

/** @param {Array<Object>} records */
export function writeActivityLog(records) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    // Ignore write failures — persistence is a nice-to-have, not required
    // for the app to function (same approach as the other mock stores).
  }
}

/**
 * Appends a new, immutable activity entry — the log is read-only in
 * the UI and entries are never edited or removed once written.
 *
 * @param {Object} params
 * @param {string} params.adminUserId
 * @param {string} params.actionType - One of `ACTIVITY_ACTION_TYPE`.
 * @param {string} params.targetType - One of `ACTIVITY_TARGET_TYPE`.
 * @param {string} params.targetId
 * @param {Object} [params.metadata] - Short, safe, translatable details only.
 */
export function logActivity({ adminUserId, actionType, targetType, targetId, metadata = {} }) {
  const records = readActivityLog()
  const entry = {
    id: crypto.randomUUID(),
    adminUserId,
    actionType,
    targetType,
    targetId,
    timestamp: new Date().toISOString(),
    metadata
  }
  records.push(entry)
  writeActivityLog(records)
  return entry
}
