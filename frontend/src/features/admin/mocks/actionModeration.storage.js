import { MOCK_ACTIONS } from '@/features/actions/mocks/actions.mock'
import { ACTION_MODERATION_STATUS } from '../utils/actionModerationStatus'

const STORAGE_KEY = 'onehelp.admin.actionModeration'

/** The 13 actions seeded before this feature existed — always default to `approved`. */
const ORIGINAL_ACTION_IDS = new Set(MOCK_ACTIONS.map((action) => action.id))

function isValidRecord(record) {
  return Boolean(
    record &&
    typeof record.actionId === 'string' && record.actionId &&
    Object.values(ACTION_MODERATION_STATUS).includes(record.status)
  )
}

/**
 * Reads and validates the persisted moderation-decision overlay.
 * Malformed storage is repaired rather than just ignored in memory —
 * same "repair on read" approach used by every other mock store in
 * this app.
 *
 * @returns {Array<Object>}
 */
export function readModerationRecords() {
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
    writeModerationRecords([])
    return []
  }

  if (!Array.isArray(parsed)) {
    writeModerationRecords([])
    return []
  }

  const valid = parsed.filter(isValidRecord)
  if (valid.length !== parsed.length) {
    writeModerationRecords(valid)
  }
  return valid
}

/** @param {Array<Object>} records */
export function writeModerationRecords(records) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    // Ignore write failures — persistence is a nice-to-have, not required
    // for the app to function (same approach as the other mock stores).
  }
}

/**
 * An action's current moderation record. Absent from storage means it
 * was never explicitly reviewed — one of the 13 original fixture
 * actions defaults to `approved` (preserving current public behavior),
 * anything else (an organizer-created action) defaults to
 * `pendingReview` (a genuine moderation gate for new content).
 *
 * @param {string} actionId
 * @returns {{status: string, reason: string|null, reviewedAt: string|null, reviewedBy: string|null}}
 */
export function getModerationRecord(actionId) {
  const record = readModerationRecords().find((candidate) => candidate.actionId === actionId)
  if (record) return record
  return {
    status: ORIGINAL_ACTION_IDS.has(actionId) ? ACTION_MODERATION_STATUS.APPROVED : ACTION_MODERATION_STATUS.PENDING_REVIEW,
    reason: null,
    reviewedAt: null,
    reviewedBy: null
  }
}

/**
 * @param {string} actionId
 * @param {string} status
 * @param {Object} [details]
 * @param {string|null} [details.reason]
 * @param {string} [details.reviewedBy]
 */
export function setModerationStatus(actionId, status, { reason = null, reviewedBy = null } = {}) {
  const records = readModerationRecords()
  const index = records.findIndex((record) => record.actionId === actionId)
  const entry = { actionId, status, reason, reviewedAt: new Date().toISOString(), reviewedBy }
  if (index === -1) {
    records.push(entry)
  } else {
    records[index] = entry
  }
  writeModerationRecords(records)
  return entry
}

/**
 * Permanently removes the moderation record for the given actions —
 * used by `demoteOrganizerToVolunteer`. Never touches moderation
 * records for any other action.
 *
 * @param {Array<string>} actionIds
 */
export function deleteModerationRecordsByActionIds(actionIds) {
  if (!actionIds.length) return
  const records = readModerationRecords()
  const remaining = records.filter((record) => !actionIds.includes(record.actionId))
  if (remaining.length !== records.length) writeModerationRecords(remaining)
}
