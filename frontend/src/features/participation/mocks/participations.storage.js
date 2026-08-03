import { PARTICIPATION_STATUS } from '../utils/participationStatus'

const STORAGE_KEY = 'onehelp.participations'

function isValidRecord(record) {
  return Boolean(
    record &&
    typeof record.id === 'string' && record.id &&
    typeof record.userId === 'string' && record.userId &&
    typeof record.actionId === 'string' && record.actionId &&
    Object.values(PARTICIPATION_STATUS).includes(record.status) &&
    typeof record.joinedAt === 'string' && record.joinedAt
  )
}

/**
 * Reads and validates the persisted participation records. Malformed
 * storage is repaired rather than just ignored in memory: an unparsable
 * value is cleared outright, and a parsed array containing some invalid
 * entries is rewritten with only the valid ones — so a corrupt or
 * tampered value never lingers indefinitely.
 *
 * @returns {Array<Object>}
 */
export function readParticipations() {
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
    writeParticipations([])
    return []
  }

  if (!Array.isArray(parsed)) {
    writeParticipations([])
    return []
  }

  const valid = parsed.filter(isValidRecord)
  if (valid.length !== parsed.length) {
    writeParticipations(valid)
  }
  return valid
}

/**
 * @param {Array<Object>} records
 */
export function writeParticipations(records) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    // Ignore write failures — persistence is a nice-to-have, not required
    // for the app to function (same approach as the auth/locale stores).
  }
}

/**
 * Permanently removes every participation for the given actions — used
 * by `demoteOrganizerToVolunteer` when an organizer's actions are
 * deleted. Never touches participations for any other action.
 *
 * @param {Array<string>} actionIds
 */
export function deleteParticipationsByActionIds(actionIds) {
  if (!actionIds.length) return
  const records = readParticipations()
  const remaining = records.filter((record) => !actionIds.includes(record.actionId))
  if (remaining.length !== records.length) writeParticipations(remaining)
}
