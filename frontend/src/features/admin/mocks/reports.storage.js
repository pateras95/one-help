import { REPORT_STATUS, REPORT_REASON } from '../utils/reportStatus'

const STORAGE_KEY = 'onehelp.admin.reports'

function isValidRecord(record) {
  return Boolean(
    record &&
    typeof record.id === 'string' && record.id &&
    typeof record.actionId === 'string' && record.actionId &&
    typeof record.reporterUserId === 'string' && record.reporterUserId &&
    Object.values(REPORT_REASON).includes(record.reason) &&
    Object.values(REPORT_STATUS).includes(record.status) &&
    typeof record.createdAt === 'string' && record.createdAt
  )
}

/**
 * Reads and validates persisted action reports. Malformed storage is
 * repaired rather than just ignored in memory — same "repair on read"
 * approach used by every other mock store in this app.
 *
 * @returns {Array<Object>}
 */
export function readReports() {
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
    writeReports([])
    return []
  }

  if (!Array.isArray(parsed)) {
    writeReports([])
    return []
  }

  const valid = parsed.filter(isValidRecord)
  if (valid.length !== parsed.length) {
    writeReports(valid)
  }
  return valid
}

/** @param {Array<Object>} records */
export function writeReports(records) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    // Ignore write failures — persistence is a nice-to-have, not required
    // for the app to function (same approach as the other mock stores).
  }
}

/**
 * Appends a new report record.
 *
 * @param {Object} record
 */
export function addReport(record) {
  const records = readReports()
  records.push(record)
  writeReports(records)
  return record
}

/**
 * Upserts a report record by id (used for admin status changes).
 *
 * @param {Object} record
 */
export function upsertReport(record) {
  const records = readReports()
  const index = records.findIndex((existing) => existing.id === record.id)
  if (index === -1) {
    records.push(record)
  } else {
    records[index] = record
  }
  writeReports(records)
  return record
}
