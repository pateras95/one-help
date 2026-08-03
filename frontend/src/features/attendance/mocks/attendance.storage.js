import { ATTENDANCE_STATUS, CHECK_IN_METHOD } from '../utils/attendanceStatus'

const STORAGE_KEY = 'onehelp.attendance'

function isValidRecord(record) {
  return Boolean(
    record &&
    typeof record.id === 'string' && record.id &&
    typeof record.participationId === 'string' && record.participationId &&
    typeof record.actionId === 'string' && record.actionId &&
    typeof record.userId === 'string' && record.userId &&
    (record.status === ATTENDANCE_STATUS.CHECKED_IN || record.status === ATTENDANCE_STATUS.CHECKED_OUT) &&
    typeof record.checkedInAt === 'string' && record.checkedInAt &&
    Object.values(CHECK_IN_METHOD).includes(record.checkInMethod)
  )
}

/**
 * Reads and validates persisted attendance records. Malformed storage is
 * repaired rather than just ignored in memory — same "repair on read"
 * approach used by auth/participation/organizer storage in this app: an
 * unparsable value is cleared outright, and a parsed array containing
 * some invalid entries is rewritten with only the valid ones.
 *
 * Never stores or reads full participation/user objects — only the
 * `participationId`/`actionId`/`userId` references, and never any health
 * information.
 *
 * @returns {Array<Object>}
 */
export function readAttendance() {
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
    writeAttendance([])
    return []
  }

  if (!Array.isArray(parsed)) {
    writeAttendance([])
    return []
  }

  const valid = parsed.filter(isValidRecord)
  if (valid.length !== parsed.length) {
    writeAttendance(valid)
  }
  return valid
}

/**
 * @param {Array<Object>} records
 */
export function writeAttendance(records) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    // Ignore write failures — persistence is a nice-to-have, not required
    // for the app to function (same approach as the other mock stores).
  }
}

/**
 * Appends a new attendance record. Callers are responsible for having
 * already rejected duplicates — this just persists.
 *
 * @param {Object} record
 */
export function addAttendanceRecord(record) {
  const records = readAttendance()
  records.push(record)
  writeAttendance(records)
  return record
}

/**
 * Replaces one existing record by id (used for check-out).
 *
 * @param {Object} record
 */
export function updateAttendanceRecord(record) {
  const records = readAttendance()
  const index = records.findIndex((existing) => existing.id === record.id)
  if (index !== -1) {
    records[index] = record
    writeAttendance(records)
  }
  return record
}

/**
 * Permanently removes every attendance/check-in record for the given
 * actions — used by `demoteOrganizerToVolunteer`. Never touches
 * attendance for any other action.
 *
 * @param {Array<string>} actionIds
 */
export function deleteAttendanceByActionIds(actionIds) {
  if (!actionIds.length) return
  const records = readAttendance()
  const remaining = records.filter((record) => !actionIds.includes(record.actionId))
  if (remaining.length !== records.length) writeAttendance(remaining)
}
