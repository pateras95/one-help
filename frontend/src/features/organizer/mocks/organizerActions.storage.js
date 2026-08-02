import { MOCK_ACTIONS } from '@/features/actions/mocks/actions.mock'
import { ORGANIZER_ACTION_STATUS } from '../utils/organizerActionStatus'

const STORAGE_KEY = 'onehelp.organizer.actions'

function isValidRecord(record) {
  return Boolean(
    record &&
    typeof record.id === 'string' && record.id &&
    typeof record.organizerId === 'string' && record.organizerId &&
    Object.values(ORGANIZER_ACTION_STATUS).includes(record.organizerStatus) &&
    typeof record.categoryId === 'string' && record.categoryId &&
    typeof record.title === 'object' && record.title &&
    typeof record.title.el === 'string' && typeof record.title.en === 'string' &&
    typeof record.date === 'string' &&
    typeof record.capacity === 'number' && record.capacity > 0 &&
    typeof record.registeredCount === 'number' && record.registeredCount >= 0
  )
}

/**
 * Reads and validates persisted organizer actions (creates and edits).
 * Malformed storage is repaired rather than just ignored in memory: an
 * unparsable value is cleared outright, and a parsed array containing
 * some invalid entries is rewritten with only the valid ones — the same
 * "repair on read" approach used by the auth session and participation
 * storage in this app.
 *
 * @returns {Array<Object>}
 */
export function readOrganizerActions() {
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
    writeOrganizerActions([])
    return []
  }

  if (!Array.isArray(parsed)) {
    writeOrganizerActions([])
    return []
  }

  const valid = parsed.filter(isValidRecord)
  if (valid.length !== parsed.length) {
    writeOrganizerActions(valid)
  }
  return valid
}

/**
 * @param {Array<Object>} records
 */
export function writeOrganizerActions(records) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    // Ignore write failures — persistence is a nice-to-have, not required
    // for the app to function (same approach as the other mock stores).
  }
}

/**
 * Upserts a single organizer action record by id, preventing duplicate
 * ids — an existing id replaces its record, a new one is appended.
 *
 * @param {Object} record
 */
export function upsertOrganizerAction(record) {
  const records = readOrganizerActions()
  const index = records.findIndex((existing) => existing.id === record.id)
  if (index === -1) {
    records.push(record)
  } else {
    records[index] = record
  }
  writeOrganizerActions(records)
  return record
}

/**
 * The canonical "all actions" list: the immutable base fixture with any
 * persisted organizer edits applied on top (by id), plus any wholly new
 * organizer-created actions appended. Never mutates `MOCK_ACTIONS` —
 * both the public Actions feature and the organizer feature read
 * through this instead of `MOCK_ACTIONS` directly, so an organizer's
 * create/edit is immediately visible to both.
 *
 * @returns {Array<Object>}
 */
export function getMergedActions() {
  const overrides = new Map(readOrganizerActions().map((record) => [record.id, record]))
  const baseIds = new Set(MOCK_ACTIONS.map((action) => action.id))

  const merged = MOCK_ACTIONS.map((action) => {
    const override = overrides.get(action.id)
    return override ? { ...action, ...override } : action
  })

  const created = readOrganizerActions().filter((record) => !baseIds.has(record.id))

  return [...merged, ...created]
}
