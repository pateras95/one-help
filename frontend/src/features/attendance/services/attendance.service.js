import { mockResponse } from '@/utils/mockResponse'
import { getMergedActions } from '@/features/organizer/mocks/organizerActions.storage'
import { ORGANIZER_ACTION_STATUS } from '@/features/organizer/utils/organizerActionStatus'
import { isActionPubliclyVisible } from '@/features/actions/utils/actionVisibility'
import { getParticipation, getParticipationById } from '@/features/participation/services/participation.service'
import { PARTICIPATION_STATUS } from '@/features/participation/utils/participationStatus'
import { readAttendance, addAttendanceRecord, updateAttendanceRecord } from '../mocks/attendance.storage'
import { getQrSessionForAction, upsertQrSession } from '../mocks/qrSession.storage'
import { ATTENDANCE_STATUS, CHECK_IN_METHOD } from '../utils/attendanceStatus'
import { ATTENDANCE_ERROR } from '../utils/attendanceErrors'
import { createQrTokenPayload, encodeQrToken, decodeQrToken, isTokenExpired } from '../utils/qrToken'

function clone(record) {
  return record ? { ...record } : record
}

function findAction(actionId) {
  return getMergedActions().find((action) => action.id === actionId) ?? null
}

function findAttendanceByParticipation(participationId) {
  return readAttendance().find((record) => record.participationId === participationId) ?? null
}

/**
 * Shared validation + record creation for both check-in methods. Only a
 * `published` action accepts new check-ins (closed/cancelled/draft never
 * do, regardless of date) and only a confirmed participant may check in.
 */
async function performCheckIn({ action, participation, method, recordedByOrganizerId }) {
  if (action.organizerStatus !== ORGANIZER_ACTION_STATUS.PUBLISHED || !isActionPubliclyVisible(action)) {
    return mockResponse(null, { shouldFail: true, errorMessage: ATTENDANCE_ERROR.ACTION_NOT_JOINABLE })
  }
  if (!participation || participation.status !== PARTICIPATION_STATUS.CONFIRMED) {
    return mockResponse(null, { shouldFail: true, errorMessage: ATTENDANCE_ERROR.NOT_CONFIRMED })
  }
  if (findAttendanceByParticipation(participation.id)) {
    return mockResponse(null, { shouldFail: true, errorMessage: ATTENDANCE_ERROR.ALREADY_CHECKED_IN })
  }

  const record = {
    id: crypto.randomUUID(),
    participationId: participation.id,
    actionId: action.id,
    userId: participation.userId,
    status: ATTENDANCE_STATUS.CHECKED_IN,
    checkedInAt: new Date().toISOString(),
    checkedOutAt: null,
    checkInMethod: method,
    recordedByOrganizerId
  }
  addAttendanceRecord(record)
  return mockResponse(clone(record))
}

/**
 * All attendance records for an action.
 *
 * @param {string} actionId
 * @returns {Promise<Array<Object>>}
 */
export async function getActionAttendance(actionId) {
  if (!actionId) {
    return mockResponse([], { shouldFail: true, errorMessage: ATTENDANCE_ERROR.INVALID_REQUEST })
  }
  const records = readAttendance().filter((record) => record.actionId === actionId).map(clone)
  return mockResponse(records)
}

/**
 * All attendance records for a user, across every action.
 *
 * @param {string} userId
 * @returns {Promise<Array<Object>>}
 */
export async function getUserAttendance(userId) {
  if (!userId) {
    return mockResponse([], { shouldFail: true, errorMessage: ATTENDANCE_ERROR.INVALID_REQUEST })
  }
  const records = readAttendance().filter((record) => record.userId === userId).map(clone)
  return mockResponse(records)
}

/**
 * @param {string} participationId
 * @returns {Promise<Object|null>}
 */
export async function getAttendanceByParticipation(participationId) {
  if (!participationId) {
    return mockResponse(null, { shouldFail: true, errorMessage: ATTENDANCE_ERROR.INVALID_REQUEST })
  }
  return mockResponse(clone(findAttendanceByParticipation(participationId)))
}

/**
 * Self-service check-in via a scanned/entered QR token. The token
 * carries `actionId` + `organizerId`; a token whose `organizerId` doesn't
 * match the action's real owner is treated as invalid, the same as any
 * other tampered token — this is what prevents a forged token from
 * bypassing organizer ownership.
 *
 * @param {Object} params
 * @param {string} params.token
 * @param {string} params.userId
 * @returns {Promise<Object>}
 */
export async function checkInByQr({ token, userId }) {
  if (!token || !userId) {
    return mockResponse(null, { shouldFail: true, errorMessage: ATTENDANCE_ERROR.INVALID_REQUEST })
  }

  const payload = decodeQrToken(token)
  if (!payload) {
    return mockResponse(null, { shouldFail: true, errorMessage: ATTENDANCE_ERROR.INVALID_TOKEN })
  }
  if (isTokenExpired(payload)) {
    return mockResponse(null, { shouldFail: true, errorMessage: ATTENDANCE_ERROR.EXPIRED_TOKEN })
  }

  const action = findAction(payload.actionId)
  if (!action || action.organizerId !== payload.organizerId) {
    return mockResponse(null, { shouldFail: true, errorMessage: ATTENDANCE_ERROR.INVALID_TOKEN })
  }

  const participation = await getParticipation(userId, action.id)
  return performCheckIn({ action, participation, method: CHECK_IN_METHOD.QR, recordedByOrganizerId: null })
}

/**
 * Organizer-recorded check-in for one of their own participants.
 *
 * @param {string} organizerId
 * @param {string} participationId
 * @returns {Promise<Object>}
 */
export async function checkInManually(organizerId, participationId) {
  if (!organizerId || !participationId) {
    return mockResponse(null, { shouldFail: true, errorMessage: ATTENDANCE_ERROR.INVALID_REQUEST })
  }

  const participation = await getParticipationById(participationId)
  if (!participation) {
    return mockResponse(null, { shouldFail: true, errorMessage: ATTENDANCE_ERROR.PARTICIPATION_NOT_FOUND })
  }

  const action = findAction(participation.actionId)
  if (!action || action.organizerId !== organizerId) {
    return mockResponse(null, { shouldFail: true, errorMessage: ATTENDANCE_ERROR.NOT_OWNER })
  }

  return performCheckIn({ action, participation, method: CHECK_IN_METHOD.MANUAL, recordedByOrganizerId: organizerId })
}

/**
 * @param {string} organizerId
 * @param {string} attendanceId
 * @returns {Promise<Object>}
 */
export async function checkOut(organizerId, attendanceId) {
  if (!organizerId || !attendanceId) {
    return mockResponse(null, { shouldFail: true, errorMessage: ATTENDANCE_ERROR.INVALID_REQUEST })
  }

  const record = readAttendance().find((candidate) => candidate.id === attendanceId)
  if (!record) {
    return mockResponse(null, { shouldFail: true, errorMessage: ATTENDANCE_ERROR.NOT_CHECKED_IN })
  }

  const action = findAction(record.actionId)
  if (!action || action.organizerId !== organizerId) {
    return mockResponse(null, { shouldFail: true, errorMessage: ATTENDANCE_ERROR.NOT_OWNER })
  }
  if (record.status !== ATTENDANCE_STATUS.CHECKED_IN) {
    return mockResponse(null, { shouldFail: true, errorMessage: ATTENDANCE_ERROR.NOT_CHECKED_IN })
  }

  const updated = { ...record, status: ATTENDANCE_STATUS.CHECKED_OUT, checkedOutAt: new Date().toISOString() }
  updateAttendanceRecord(updated)
  return mockResponse(clone(updated))
}

/**
 * The action's current QR session, if one exists and hasn't expired.
 * Used on mount so refreshing the organizer's check-in screen doesn't
 * invalidate a session volunteers may already be scanning.
 *
 * @param {string} organizerId
 * @param {string} actionId
 * @returns {Promise<Object|null>}
 */
export async function getActiveCheckInSession(organizerId, actionId) {
  if (!organizerId || !actionId) {
    return mockResponse(null, { shouldFail: true, errorMessage: ATTENDANCE_ERROR.INVALID_REQUEST })
  }
  const action = findAction(actionId)
  if (!action || action.organizerId !== organizerId) {
    return mockResponse(null, { shouldFail: true, errorMessage: ATTENDANCE_ERROR.NOT_OWNER })
  }

  const session = getQrSessionForAction(actionId)
  if (!session) return mockResponse(null)

  const payload = decodeQrToken(session.token)
  if (!payload || isTokenExpired(payload)) return mockResponse(null)

  return mockResponse(clone(session))
}

/**
 * Issues a brand-new QR session/token for an action, replacing any
 * previous one (used for both the initial screen load and "regenerate").
 *
 * @param {string} organizerId
 * @param {string} actionId
 * @returns {Promise<Object>}
 */
export async function generateCheckInSession(organizerId, actionId) {
  if (!organizerId || !actionId) {
    return mockResponse(null, { shouldFail: true, errorMessage: ATTENDANCE_ERROR.INVALID_REQUEST })
  }
  const action = findAction(actionId)
  if (!action || action.organizerId !== organizerId) {
    return mockResponse(null, { shouldFail: true, errorMessage: ATTENDANCE_ERROR.NOT_OWNER })
  }
  if (action.organizerStatus !== ORGANIZER_ACTION_STATUS.PUBLISHED || !isActionPubliclyVisible(action)) {
    return mockResponse(null, { shouldFail: true, errorMessage: ATTENDANCE_ERROR.ACTION_NOT_JOINABLE })
  }

  const payload = createQrTokenPayload({ actionId, organizerId })
  const session = {
    actionId,
    organizerId,
    tokenId: payload.tokenId,
    token: encodeQrToken(payload),
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt
  }
  upsertQrSession(session)
  return mockResponse(clone(session))
}

/**
 * Decodes + validates a scanned/entered token and resolves it to its
 * action, without performing the check-in itself — used to show "you're
 * about to check into X" before the volunteer confirms.
 *
 * @param {string} token
 * @returns {Promise<{action: Object, payload: Object}>}
 */
export async function validateCheckInToken(token) {
  const payload = decodeQrToken(token)
  if (!payload) {
    return mockResponse(null, { shouldFail: true, errorMessage: ATTENDANCE_ERROR.INVALID_TOKEN })
  }
  if (isTokenExpired(payload)) {
    return mockResponse(null, { shouldFail: true, errorMessage: ATTENDANCE_ERROR.EXPIRED_TOKEN })
  }

  const action = findAction(payload.actionId)
  if (!action || action.organizerId !== payload.organizerId) {
    return mockResponse(null, { shouldFail: true, errorMessage: ATTENDANCE_ERROR.INVALID_TOKEN })
  }

  return mockResponse({ action: clone(action), payload })
}
