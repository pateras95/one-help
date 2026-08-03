import { mockResponse } from '@/utils/mockResponse'
import { isPastDate } from '@/utils/date'
import { isValidCategoryId } from '@/constants/actionCategories'
import { getUserById } from '@/features/auth/services/auth.service'
import { getActionParticipants } from '@/features/participation/services/participation.service'
import { getLocalConfirmedCount } from '@/features/participation/utils/participationCount'
import { getMergedActions, upsertOrganizerAction } from '../mocks/organizerActions.storage'
import { ORGANIZER_ACTION_STATUS, canTransition } from '../utils/organizerActionStatus'
import { ORGANIZER_ACTION_ERROR } from '../utils/organizerActionErrors'
import { getOrganizationStatus } from '@/features/admin/mocks/organizations.storage'
import { ORGANIZATION_STATUS } from '@/features/admin/utils/organizationStatus'

const URGENCY_LEVELS = ['normal', 'high', 'urgent']
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

function clone(action) {
  return action ? { ...action } : action
}

function isValidBilingualText(field) {
  return Boolean(field && typeof field.el === 'string' && field.el.trim() && typeof field.en === 'string' && field.en.trim())
}

function isValidEquipment(field) {
  return Boolean(field && Array.isArray(field.el) && Array.isArray(field.en))
}

/** Coordinates are optional, but if present must both be set and within range. */
function hasValidOptionalCoordinates(payload) {
  const { latitude, longitude } = payload
  if (latitude == null && longitude == null) return true
  if (latitude == null || longitude == null) return false
  return (
    Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
    Number.isFinite(longitude) && longitude >= -180 && longitude <= 180
  )
}

/** Validates a create/edit form payload, returning an error code or `null`. */
function validatePayload(payload) {
  if (!payload) return ORGANIZER_ACTION_ERROR.INVALID_REQUEST
  if (!isValidCategoryId(payload.categoryId)) return ORGANIZER_ACTION_ERROR.INVALID_CATEGORY
  if (!isValidBilingualText(payload.title)) return ORGANIZER_ACTION_ERROR.INVALID_REQUEST
  if (!isValidBilingualText(payload.description)) return ORGANIZER_ACTION_ERROR.INVALID_REQUEST
  if (!isValidBilingualText(payload.locationName)) return ORGANIZER_ACTION_ERROR.INVALID_REQUEST
  if (!payload.municipality || !payload.municipality.trim()) return ORGANIZER_ACTION_ERROR.INVALID_REQUEST
  if (!payload.date || isPastDate(payload.date)) return ORGANIZER_ACTION_ERROR.INVALID_DATE
  if (!TIME_PATTERN.test(payload.startTime ?? '')) return ORGANIZER_ACTION_ERROR.INVALID_REQUEST
  if (!Number.isFinite(payload.capacity) || payload.capacity <= 0) return ORGANIZER_ACTION_ERROR.INVALID_CAPACITY
  if (!isValidEquipment(payload.requiredEquipment)) return ORGANIZER_ACTION_ERROR.INVALID_REQUEST
  if (!URGENCY_LEVELS.includes(payload.urgency)) return ORGANIZER_ACTION_ERROR.INVALID_REQUEST
  if (!hasValidOptionalCoordinates(payload)) return ORGANIZER_ACTION_ERROR.INVALID_COORDINATES
  return null
}

/**
 * Enforces the organization-approval gate before any organizer mutation:
 * a suspended organization can't create, edit, or change any action's
 * status at all; a pending/rejected one can still manage drafts but
 * can't make anything publicly visible.
 *
 * @param {string} organizerId
 * @param {string} [targetStatus] - The organizer status the caller is
 *   about to set (checked only if provided).
 * @returns {string|null} An `ORGANIZER_ACTION_ERROR` code, or `null` if allowed.
 */
function checkOrganizationGate(organizerId, targetStatus) {
  const status = getOrganizationStatus(organizerId)
  if (status === ORGANIZATION_STATUS.SUSPENDED) {
    return ORGANIZER_ACTION_ERROR.ORGANIZATION_SUSPENDED
  }
  if (
    targetStatus === ORGANIZER_ACTION_STATUS.PUBLISHED &&
    (status === ORGANIZATION_STATUS.PENDING || status === ORGANIZATION_STATUS.REJECTED || status === null)
  ) {
    return ORGANIZER_ACTION_ERROR.ORGANIZATION_NOT_APPROVED
  }
  return null
}

function findOwned(actionId, organizerId) {
  const action = getMergedActions().find((candidate) => candidate.id === actionId)
  if (!action) return { error: ORGANIZER_ACTION_ERROR.ACTION_NOT_FOUND }
  if (action.organizerId !== organizerId) return { error: ORGANIZER_ACTION_ERROR.NOT_OWNER }
  return { action }
}

/**
 * All actions owned by an organizer, raw bilingual records (not
 * localized) — organizer views pick the active locale's text
 * themselves, so switching language mid-session never needs a refetch.
 *
 * @param {string} organizerId
 * @returns {Promise<Array<Object>>}
 */
export async function getOrganizerActions(organizerId) {
  if (!organizerId) {
    return mockResponse([], { shouldFail: true, errorMessage: ORGANIZER_ACTION_ERROR.INVALID_REQUEST })
  }
  const actions = getMergedActions()
    .filter((action) => action.organizerId === organizerId)
    .map(clone)
  return mockResponse(actions)
}

/**
 * @param {string} organizerId
 * @param {string} actionId
 * @returns {Promise<Object>}
 */
export async function getOrganizerActionById(organizerId, actionId) {
  if (!organizerId || !actionId) {
    return mockResponse(null, { shouldFail: true, errorMessage: ORGANIZER_ACTION_ERROR.INVALID_REQUEST })
  }
  const { action, error } = findOwned(actionId, organizerId)
  if (error) return mockResponse(null, { shouldFail: true, errorMessage: error })
  return mockResponse(clone(action))
}

/**
 * @param {string} organizerId
 * @param {Object} payload - Form payload; see `OrganizerActionForm.vue`.
 * @param {string} payload.organizationName - Display name shown publicly as the organizing body.
 * @param {'draft'|'published'} payload.organizerStatus
 * @returns {Promise<Object>}
 */
export async function createOrganizerAction(organizerId, payload) {
  if (!organizerId) {
    return mockResponse(null, { shouldFail: true, errorMessage: ORGANIZER_ACTION_ERROR.INVALID_REQUEST })
  }

  const gateError = checkOrganizationGate(organizerId, payload?.organizerStatus)
  if (gateError) {
    return mockResponse(null, { shouldFail: true, errorMessage: gateError })
  }

  const validationError = validatePayload(payload)
  if (validationError) {
    return mockResponse(null, { shouldFail: true, errorMessage: validationError })
  }

  if (![ORGANIZER_ACTION_STATUS.DRAFT, ORGANIZER_ACTION_STATUS.PUBLISHED].includes(payload.organizerStatus)) {
    return mockResponse(null, { shouldFail: true, errorMessage: ORGANIZER_ACTION_ERROR.INVALID_STATUS })
  }

  const municipalityText = payload.municipality.trim()
  const organizationText = payload.organizationName?.trim() || ''

  const action = {
    id: crypto.randomUUID(),
    organizerId,
    organizerStatus: payload.organizerStatus,
    categoryId: payload.categoryId,
    organization: { el: organizationText, en: organizationText },
    title: { el: payload.title.el.trim(), en: payload.title.en.trim() },
    description: { el: payload.description.el.trim(), en: payload.description.en.trim() },
    locationName: { el: payload.locationName.el.trim(), en: payload.locationName.en.trim() },
    municipality: { el: municipalityText, en: municipalityText },
    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null,
    date: payload.date,
    startTime: payload.startTime,
    capacity: payload.capacity,
    registeredCount: 0,
    urgency: payload.urgency,
    requiredEquipment: {
      el: payload.requiredEquipment.el.filter(Boolean),
      en: payload.requiredEquipment.en.filter(Boolean)
    }
  }

  upsertOrganizerAction(action)
  return mockResponse(clone(action))
}

/**
 * @param {string} organizerId
 * @param {string} actionId
 * @param {Object} payload - Same shape as `createOrganizerAction`, minus `organizerStatus`.
 * @returns {Promise<Object>}
 */
export async function updateOrganizerAction(organizerId, actionId, payload) {
  if (!organizerId || !actionId) {
    return mockResponse(null, { shouldFail: true, errorMessage: ORGANIZER_ACTION_ERROR.INVALID_REQUEST })
  }

  const { action: existing, error } = findOwned(actionId, organizerId)
  if (error) return mockResponse(null, { shouldFail: true, errorMessage: error })

  const gateError = checkOrganizationGate(organizerId)
  if (gateError) {
    return mockResponse(null, { shouldFail: true, errorMessage: gateError })
  }

  const validationError = validatePayload(payload)
  if (validationError) {
    return mockResponse(null, { shouldFail: true, errorMessage: validationError })
  }

  const confirmedCount = existing.registeredCount + getLocalConfirmedCount(actionId)
  if (payload.capacity < confirmedCount) {
    return mockResponse(null, { shouldFail: true, errorMessage: ORGANIZER_ACTION_ERROR.CAPACITY_BELOW_CONFIRMED })
  }

  const municipalityText = payload.municipality.trim()

  const updated = {
    ...existing,
    categoryId: payload.categoryId,
    title: { el: payload.title.el.trim(), en: payload.title.en.trim() },
    description: { el: payload.description.el.trim(), en: payload.description.en.trim() },
    locationName: { el: payload.locationName.el.trim(), en: payload.locationName.en.trim() },
    municipality: { el: municipalityText, en: municipalityText },
    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null,
    date: payload.date,
    startTime: payload.startTime,
    capacity: payload.capacity,
    urgency: payload.urgency,
    requiredEquipment: {
      el: payload.requiredEquipment.el.filter(Boolean),
      en: payload.requiredEquipment.en.filter(Boolean)
    }
  }

  upsertOrganizerAction(updated)
  return mockResponse(clone(updated))
}

/**
 * Moves an action to a new lifecycle status, enforcing the allowed
 * transition graph (`organizerActionStatus.js`) plus the one dynamic
 * rule it can't express statically: re-publishing a closed action
 * requires its date to still be in the future.
 *
 * @param {string} organizerId
 * @param {string} actionId
 * @param {string} status
 * @returns {Promise<Object>}
 */
export async function changeOrganizerActionStatus(organizerId, actionId, status) {
  if (!organizerId || !actionId) {
    return mockResponse(null, { shouldFail: true, errorMessage: ORGANIZER_ACTION_ERROR.INVALID_REQUEST })
  }
  if (!Object.values(ORGANIZER_ACTION_STATUS).includes(status)) {
    return mockResponse(null, { shouldFail: true, errorMessage: ORGANIZER_ACTION_ERROR.INVALID_STATUS })
  }

  const { action: existing, error } = findOwned(actionId, organizerId)
  if (error) return mockResponse(null, { shouldFail: true, errorMessage: error })

  const gateError = checkOrganizationGate(organizerId, status)
  if (gateError) {
    return mockResponse(null, { shouldFail: true, errorMessage: gateError })
  }

  if (!canTransition(existing.organizerStatus, status)) {
    return mockResponse(null, { shouldFail: true, errorMessage: ORGANIZER_ACTION_ERROR.INVALID_TRANSITION })
  }

  const isRepublish = existing.organizerStatus === ORGANIZER_ACTION_STATUS.CLOSED && status === ORGANIZER_ACTION_STATUS.PUBLISHED
  if (isRepublish && isPastDate(existing.date)) {
    return mockResponse(null, { shouldFail: true, errorMessage: ORGANIZER_ACTION_ERROR.ACTION_DATE_IN_PAST })
  }

  const updated = { ...existing, organizerStatus: status }
  upsertOrganizerAction(updated)
  return mockResponse(clone(updated))
}

/**
 * Read-only participant list for an organizer-owned action: each
 * participation record joined with safe, sanitized identity fields
 * (never a password). Only users with an actual participation record
 * for this action are included.
 *
 * @param {string} organizerId
 * @param {string} actionId
 * @returns {Promise<Array<Object>>}
 */
export async function getOrganizerActionParticipants(organizerId, actionId) {
  if (!organizerId || !actionId) {
    return mockResponse([], { shouldFail: true, errorMessage: ORGANIZER_ACTION_ERROR.INVALID_REQUEST })
  }

  const { error } = findOwned(actionId, organizerId)
  if (error) return mockResponse([], { shouldFail: true, errorMessage: error })

  const records = await getActionParticipants(actionId)
  const withIdentity = await Promise.all(
    records.map(async (record) => {
      const user = await getUserById(record.userId)
      return {
        id: record.id,
        userId: record.userId,
        status: record.status,
        joinedAt: record.joinedAt,
        cancelledAt: record.cancelledAt,
        firstName: user?.firstName ?? null,
        lastName: user?.lastName ?? null,
        email: user?.email ?? null,
        avatarInitials: user?.avatarInitials ?? null
      }
    })
  )

  return mockResponse(withIdentity)
}
