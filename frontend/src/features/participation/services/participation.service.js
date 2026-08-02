import { mockResponse } from '@/utils/mockResponse'
import { isPastDate } from '@/utils/date'
import { getActionById } from '@/features/actions/services/actions.service'
import { readParticipations, writeParticipations } from '../mocks/participations.storage'
import { PARTICIPATION_STATUS } from '../utils/participationStatus'
import { PARTICIPATION_ERROR } from '../utils/participationErrors'
import { getLocalConfirmedCount } from '../utils/participationCount'

function clone(record) {
  return record ? { ...record } : record
}

function findConfirmed(records, userId, actionId) {
  return records.find(
    (record) => record.userId === userId && record.actionId === actionId && record.status === PARTICIPATION_STATUS.CONFIRMED
  )
}

/**
 * All participation records (confirmed and cancelled) for a user, most
 * recent first. Callers (store/My Actions view) do their own upcoming/
 * past/cancelled classification — this just returns the raw history.
 *
 * @param {string} userId
 * @returns {Promise<Array<Object>>}
 */
export async function getUserParticipations(userId) {
  if (!userId) {
    return mockResponse([], { shouldFail: true, errorMessage: PARTICIPATION_ERROR.INVALID_REQUEST })
  }
  const records = readParticipations()
    .filter((record) => record.userId === userId)
    .sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt))
    .map(clone)
  return mockResponse(records)
}

/**
 * All participation records (confirmed and cancelled) for a single
 * action, across every user — used by the organizer participant list.
 * Returns raw records only (no user identity); callers resolve identity
 * separately (e.g. via the auth service).
 *
 * @param {string} actionId
 * @returns {Promise<Array<Object>>}
 */
export async function getActionParticipants(actionId) {
  if (!actionId) {
    return mockResponse([], { shouldFail: true, errorMessage: PARTICIPATION_ERROR.INVALID_REQUEST })
  }
  const records = readParticipations()
    .filter((record) => record.actionId === actionId)
    .map(clone)
  return mockResponse(records)
}

/**
 * The "current" participation record for a user+action: the confirmed
 * record if one exists, otherwise the most recently cancelled one (so a
 * caller can still see "you cancelled this"), otherwise `null`.
 *
 * @param {string} userId
 * @param {string} actionId
 * @returns {Promise<Object|null>}
 */
export async function getParticipation(userId, actionId) {
  if (!userId || !actionId) {
    return mockResponse(null, { shouldFail: true, errorMessage: PARTICIPATION_ERROR.INVALID_REQUEST })
  }

  const records = readParticipations().filter(
    (record) => record.userId === userId && record.actionId === actionId
  )
  if (!records.length) return mockResponse(null)

  const confirmed = records.find((record) => record.status === PARTICIPATION_STATUS.CONFIRMED)
  if (confirmed) return mockResponse(clone(confirmed))

  const mostRecent = [...records].sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt))[0]
  return mockResponse(clone(mostRecent))
}

/**
 * @param {string} userId
 * @param {string} actionId
 * @returns {Promise<boolean>}
 */
export async function isParticipating(userId, actionId) {
  if (!userId || !actionId) return mockResponse(false)
  return mockResponse(Boolean(findConfirmed(readParticipations(), userId, actionId)))
}

/**
 * Joins the given action as the given user. Always appends a new record
 * rather than overwriting a prior cancelled one, so a user's join/cancel
 * history for the same action is preserved across multiple cycles.
 *
 * @param {string} userId
 * @param {string} actionId
 * @returns {Promise<Object>}
 */
export async function joinAction(userId, actionId) {
  if (!userId || !actionId) {
    return mockResponse(null, { shouldFail: true, errorMessage: PARTICIPATION_ERROR.INVALID_REQUEST })
  }

  const action = await getActionById(actionId)
  if (!action) {
    return mockResponse(null, { shouldFail: true, errorMessage: PARTICIPATION_ERROR.ACTION_NOT_FOUND })
  }

  // The mock domain has no organizer-side action cancellation (out of
  // scope), so "closed" is derived purely from the date: a past action
  // can no longer be joined.
  if (isPastDate(action.date)) {
    return mockResponse(null, { shouldFail: true, errorMessage: PARTICIPATION_ERROR.ACTION_CLOSED })
  }

  const records = readParticipations()
  if (findConfirmed(records, userId, actionId)) {
    return mockResponse(null, { shouldFail: true, errorMessage: PARTICIPATION_ERROR.ALREADY_JOINED })
  }

  // Checked against the overlaid count (base + everyone's local confirmed
  // records), not just the base mock figure, since the base alone can't
  // see joins made in this browser.
  const overlay = getLocalConfirmedCount(actionId)
  if (action.registeredCount + overlay >= action.capacity) {
    return mockResponse(null, { shouldFail: true, errorMessage: PARTICIPATION_ERROR.ACTION_FULL })
  }

  const record = {
    id: crypto.randomUUID(),
    userId,
    actionId,
    status: PARTICIPATION_STATUS.CONFIRMED,
    joinedAt: new Date().toISOString(),
    cancelledAt: null
  }
  records.push(record)
  writeParticipations(records)

  return mockResponse(clone(record))
}

/**
 * Cancels the user's confirmed participation in an action. The record is
 * kept (status flipped to cancelled) rather than deleted, preserving it
 * for the My Actions "cancelled" history.
 *
 * @param {string} userId
 * @param {string} actionId
 * @returns {Promise<Object>}
 */
export async function cancelParticipation(userId, actionId) {
  if (!userId || !actionId) {
    return mockResponse(null, { shouldFail: true, errorMessage: PARTICIPATION_ERROR.INVALID_REQUEST })
  }

  const records = readParticipations()
  const index = records.findIndex(
    (record) => record.userId === userId && record.actionId === actionId && record.status === PARTICIPATION_STATUS.CONFIRMED
  )
  if (index === -1) {
    return mockResponse(null, { shouldFail: true, errorMessage: PARTICIPATION_ERROR.PARTICIPATION_NOT_FOUND })
  }

  const cancelled = {
    ...records[index],
    status: PARTICIPATION_STATUS.CANCELLED,
    cancelledAt: new Date().toISOString()
  }
  records[index] = cancelled
  writeParticipations(records)

  return mockResponse(clone(cancelled))
}
