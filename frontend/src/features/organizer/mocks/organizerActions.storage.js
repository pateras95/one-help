import { MOCK_ACTIONS } from '@/features/actions/mocks/actions.mock'
import { ORGANIZER_ACTION_STATUS } from '../utils/organizerActionStatus'

const STORAGE_KEY = 'onehelp.organizer.actions'
const DELETED_IDS_STORAGE_KEY = 'onehelp.organizer.actions.deletedIds'

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
 * Reads the set of permanently-deleted action ids (via
 * `demoteOrganizerToVolunteer`). The base fixture array is immutable in
 * memory, so a fixture action can only ever be "deleted" by being
 * excluded here — this tombstone is consulted by `getMergedActions()`.
 *
 * @returns {Array<string>}
 */
export function readDeletedActionIds() {
  let raw
  try {
    raw = window.localStorage.getItem(DELETED_IDS_STORAGE_KEY)
  } catch {
    return []
  }
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

/** @param {Array<string>} ids */
function writeDeletedActionIds(ids) {
  try {
    window.localStorage.setItem(DELETED_IDS_STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // Ignore write failures, same as every other mock store.
  }
}

/**
 * Permanently removes a set of actions: tombstones their ids (so they
 * never resurface from the base fixture) and drops any persisted
 * override for them. Used only by `demoteOrganizerToVolunteer`.
 *
 * @param {Array<string>} actionIds
 */
export function deleteActionsByIds(actionIds) {
  if (!actionIds.length) return
  const deletedIds = readDeletedActionIds()
  const nextDeletedIds = new Set([...deletedIds, ...actionIds])
  writeDeletedActionIds([...nextDeletedIds])

  const records = readOrganizerActions()
  const remaining = records.filter((record) => !actionIds.includes(record.id))
  if (remaining.length !== records.length) writeOrganizerActions(remaining)
}

/**
 * The canonical "all actions" list: the immutable base fixture with any
 * persisted organizer edits applied on top (by id), plus any wholly new
 * organizer-created actions appended, minus anything permanently
 * deleted via `demoteOrganizerToVolunteer`. Never mutates `MOCK_ACTIONS` —
 * both the public Actions feature and the organizer feature read
 * through this instead of `MOCK_ACTIONS` directly, so an organizer's
 * create/edit is immediately visible to both.
 *
 * @returns {Array<Object>}
 */
export function getMergedActions() {
  const overrides = new Map(readOrganizerActions().map((record) => [record.id, record]))
  const baseIds = new Set(MOCK_ACTIONS.map((action) => action.id))
  const deletedIds = new Set(readDeletedActionIds())

  const merged = MOCK_ACTIONS.map((action) => {
    const override = overrides.get(action.id)
    return override ? { ...action, ...override } : action
  })

  const created = readOrganizerActions().filter((record) => !baseIds.has(record.id))

  return [...merged, ...created].filter((action) => !deletedIds.has(action.id))
}
