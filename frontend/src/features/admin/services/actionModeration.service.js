import { mockResponse } from '@/utils/mockResponse'
import { getMergedActions } from '@/features/organizer/mocks/organizerActions.storage'
import { getModerationRecord, setModerationStatus } from '../mocks/actionModeration.storage'
import { getOrganizationByOrganizerId } from '../mocks/organizations.storage'
import { logActivity } from '../mocks/activityLog.storage'
import { ACTION_MODERATION_STATUS, canTransitionModeration } from '../utils/actionModerationStatus'
import { ACTIVITY_ACTION_TYPE, ACTIVITY_TARGET_TYPE } from '../utils/activityLogTypes'
import { ADMIN_ERROR } from '../utils/adminErrors'

/**
 * Decorates a raw merged action (organizer lifecycle only) with its
 * moderation record and owning organization — the shape the admin
 * actions workspace displays. Returns raw bilingual fields, same
 * convention as `getOrganizerActions()`, so a locale switch never needs
 * a refetch.
 */
function decorate(action) {
  const moderation = getModerationRecord(action.id)
  const organization = getOrganizationByOrganizerId(action.organizerId)
  return {
    ...action,
    moderationStatus: moderation.status,
    moderationReason: moderation.reason,
    moderationReviewedAt: moderation.reviewedAt,
    moderationReviewedBy: moderation.reviewedBy,
    organizationName: organization?.name ?? null,
    organizationStatus: organization?.status ?? null
  }
}

function findAction(actionId) {
  return getMergedActions().find((action) => action.id === actionId) ?? null
}

/**
 * All actions across every organizer lifecycle state, decorated with
 * moderation + organization info — the admin actions-moderation list.
 *
 * @returns {Promise<Array<Object>>}
 */
export async function getModeratedActions() {
  const decorated = getMergedActions().map(decorate)
  decorated.sort((a, b) => new Date(b.date) - new Date(a.date))
  return mockResponse(decorated)
}

/**
 * @param {string} actionId
 * @returns {Promise<Object|null>}
 */
export async function getModeratedActionById(actionId) {
  if (!actionId) {
    return mockResponse(null, { shouldFail: true, errorMessage: ADMIN_ERROR.INVALID_REQUEST })
  }
  const action = findAction(actionId)
  return mockResponse(action ? decorate(action) : null)
}

function applyTransition(actionId, nextStatus, { adminUserId, reason = null }) {
  const currentStatus = getModerationRecord(actionId).status
  if (!canTransitionModeration(currentStatus, nextStatus)) {
    return { error: ADMIN_ERROR.INVALID_TRANSITION }
  }
  const record = setModerationStatus(actionId, nextStatus, { reason, reviewedBy: adminUserId })
  return { record }
}

/**
 * @param {string} adminUserId
 * @param {string} actionId
 * @returns {Promise<Object>}
 */
export async function approveAction(adminUserId, actionId) {
  if (!adminUserId || !actionId) {
    return mockResponse(null, { shouldFail: true, errorMessage: ADMIN_ERROR.INVALID_REQUEST })
  }
  const action = findAction(actionId)
  if (!action) {
    return mockResponse(null, { shouldFail: true, errorMessage: ADMIN_ERROR.NOT_FOUND })
  }

  const { error } = applyTransition(actionId, ACTION_MODERATION_STATUS.APPROVED, { adminUserId })
  if (error) return mockResponse(null, { shouldFail: true, errorMessage: error })

  logActivity({
    adminUserId,
    actionType: ACTIVITY_ACTION_TYPE.ACTION_APPROVED,
    targetType: ACTIVITY_TARGET_TYPE.ACTION,
    targetId: actionId,
    metadata: { title: action.title.en }
  })
  return mockResponse(decorate(action))
}

/**
 * @param {string} adminUserId
 * @param {string} actionId
 * @param {string} reason
 * @returns {Promise<Object>}
 */
export async function rejectAction(adminUserId, actionId, reason) {
  if (!adminUserId || !actionId) {
    return mockResponse(null, { shouldFail: true, errorMessage: ADMIN_ERROR.INVALID_REQUEST })
  }
  if (!reason || !reason.trim()) {
    return mockResponse(null, { shouldFail: true, errorMessage: ADMIN_ERROR.REASON_REQUIRED })
  }
  const action = findAction(actionId)
  if (!action) {
    return mockResponse(null, { shouldFail: true, errorMessage: ADMIN_ERROR.NOT_FOUND })
  }

  const { error } = applyTransition(actionId, ACTION_MODERATION_STATUS.REJECTED, { adminUserId, reason: reason.trim() })
  if (error) return mockResponse(null, { shouldFail: true, errorMessage: error })

  logActivity({
    adminUserId,
    actionType: ACTIVITY_ACTION_TYPE.ACTION_REJECTED,
    targetType: ACTIVITY_TARGET_TYPE.ACTION,
    targetId: actionId,
    metadata: { title: action.title.en, reason: reason.trim() }
  })
  return mockResponse(decorate(action))
}

/**
 * @param {string} adminUserId
 * @param {string} actionId
 * @returns {Promise<Object>}
 */
export async function hideAction(adminUserId, actionId) {
  if (!adminUserId || !actionId) {
    return mockResponse(null, { shouldFail: true, errorMessage: ADMIN_ERROR.INVALID_REQUEST })
  }
  const action = findAction(actionId)
  if (!action) {
    return mockResponse(null, { shouldFail: true, errorMessage: ADMIN_ERROR.NOT_FOUND })
  }

  const { error } = applyTransition(actionId, ACTION_MODERATION_STATUS.HIDDEN, { adminUserId })
  if (error) return mockResponse(null, { shouldFail: true, errorMessage: error })

  logActivity({
    adminUserId,
    actionType: ACTIVITY_ACTION_TYPE.ACTION_HIDDEN,
    targetType: ACTIVITY_TARGET_TYPE.ACTION,
    targetId: actionId,
    metadata: { title: action.title.en }
  })
  return mockResponse(decorate(action))
}

/**
 * Restores a hidden action back to `approved`.
 *
 * @param {string} adminUserId
 * @param {string} actionId
 * @returns {Promise<Object>}
 */
export async function restoreAction(adminUserId, actionId) {
  if (!adminUserId || !actionId) {
    return mockResponse(null, { shouldFail: true, errorMessage: ADMIN_ERROR.INVALID_REQUEST })
  }
  const action = findAction(actionId)
  if (!action) {
    return mockResponse(null, { shouldFail: true, errorMessage: ADMIN_ERROR.NOT_FOUND })
  }

  const { error } = applyTransition(actionId, ACTION_MODERATION_STATUS.APPROVED, { adminUserId })
  if (error) return mockResponse(null, { shouldFail: true, errorMessage: error })

  logActivity({
    adminUserId,
    actionType: ACTIVITY_ACTION_TYPE.ACTION_RESTORED,
    targetType: ACTIVITY_TARGET_TYPE.ACTION,
    targetId: actionId,
    metadata: { title: action.title.en }
  })
  return mockResponse(decorate(action))
}
