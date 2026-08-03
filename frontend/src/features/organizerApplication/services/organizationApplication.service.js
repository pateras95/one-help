import { mockResponse } from '@/utils/mockResponse'
import { getMergedOrganizations, getOrganizationByOrganizerId, upsertOrganization } from '@/features/admin/mocks/organizations.storage'
import { ORGANIZATION_STATUS } from '@/features/admin/utils/organizationStatus'
import { isValidOrganizationTypeId } from '@/constants/organizationTypes'
import { isValidCategoryId } from '@/constants/actionCategories'
import { getMembershipByUserId } from '../mocks/organizationMembership.storage'
import { APPLICATION_ERROR } from '../utils/applicationErrors'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const WEBSITE_PATTERN = /^https?:\/\/.+\..+/i
const TEXT_MIN_LENGTH = 20
const TEXT_MAX_LENGTH = 2000

function clone(record) {
  return record ? { ...record } : record
}

/**
 * Validates a submit/update/resubmit payload, returning an error code
 * or `null`. Deliberately mirrors `organizerActions.service.js`'s
 * `validatePayload` shape/style for consistency.
 */
function validatePayload(payload) {
  if (!payload) return APPLICATION_ERROR.INVALID_REQUEST

  const name = payload.name?.trim() ?? ''
  if (!name || name.length < 2 || name.length > 120) return APPLICATION_ERROR.INVALID_REQUEST

  if (!isValidOrganizationTypeId(payload.organizationType)) return APPLICATION_ERROR.INVALID_ORGANIZATION_TYPE

  const description = payload.description?.trim() ?? ''
  if (description.length < TEXT_MIN_LENGTH || description.length > TEXT_MAX_LENGTH) return APPLICATION_ERROR.INVALID_REQUEST

  const contactEmail = payload.contactEmail?.trim() ?? ''
  if (!contactEmail || !EMAIL_PATTERN.test(contactEmail)) return APPLICATION_ERROR.INVALID_EMAIL

  const website = payload.website?.trim() ?? ''
  if (website && !WEBSITE_PATTERN.test(website)) return APPLICATION_ERROR.INVALID_WEBSITE

  if (!payload.address?.trim()) return APPLICATION_ERROR.INVALID_REQUEST
  if (!payload.municipality?.trim()) return APPLICATION_ERROR.INVALID_REQUEST

  if (!Array.isArray(payload.categories) || payload.categories.length === 0 || !payload.categories.every(isValidCategoryId)) {
    return APPLICATION_ERROR.INVALID_CATEGORIES
  }

  const supportingMessage = payload.supportingMessage?.trim() ?? ''
  if (supportingMessage.length < TEXT_MIN_LENGTH || supportingMessage.length > TEXT_MAX_LENGTH) return APPLICATION_ERROR.INVALID_REQUEST

  if (!payload.acceptedTerms) return APPLICATION_ERROR.TERMS_NOT_ACCEPTED

  return null
}

/**
 * Maps a validated payload onto the organization record's own fields.
 * Name/description are duplicated into both `{ el, en }` slots — a real
 * applicant only ever types one language in this form, and every other
 * organization-reading view in the app (admin list, action visibility
 * lookups) expects the existing bilingual shape. Documented mock
 * simplification, not a translation.
 */
function buildFieldsFromPayload(payload) {
  const nameText = payload.name.trim()
  const descriptionText = payload.description.trim()
  return {
    name: { el: nameText, en: nameText },
    description: { el: descriptionText, en: descriptionText },
    organizationType: payload.organizationType,
    contactEmail: payload.contactEmail.trim(),
    phone: payload.phone?.trim() || null,
    website: payload.website?.trim() || null,
    address: payload.address.trim(),
    municipality: payload.municipality.trim(),
    categories: [...payload.categories],
    supportingMessage: payload.supportingMessage.trim()
  }
}

function findOwnedApplication(applicationId, userId) {
  const organization = getMergedOrganizations().find((org) => org.id === applicationId)
  if (!organization || organization.organizerUserId !== userId) return null
  return organization
}

/**
 * The current user's own organization/application record, regardless of
 * status — `null` if they have never submitted one.
 *
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
export async function getApplicationForUser(userId) {
  if (!userId) {
    return mockResponse(null, { shouldFail: true, errorMessage: APPLICATION_ERROR.INVALID_REQUEST })
  }
  return mockResponse(clone(getOrganizationByOrganizerId(userId)))
}

/**
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
export async function getUserOrganizationMembership(userId) {
  if (!userId) {
    return mockResponse(null, { shouldFail: true, errorMessage: APPLICATION_ERROR.INVALID_REQUEST })
  }
  return mockResponse(clone(getMembershipByUserId(userId)))
}

/**
 * The full organization record for a user with an existing membership
 * (i.e. currently or previously approved) — used by account-summary
 * displays that only care about "their" organization, not the raw
 * application state.
 *
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
export async function getOrganizationForUser(userId) {
  if (!userId) {
    return mockResponse(null, { shouldFail: true, errorMessage: APPLICATION_ERROR.INVALID_REQUEST })
  }
  const membership = getMembershipByUserId(userId)
  if (!membership) return mockResponse(null)
  const organization = getMergedOrganizations().find((org) => org.id === membership.organizationId)
  return mockResponse(organization ? clone(organization) : null)
}

/**
 * Submits a brand-new organization application. Blocked entirely if the
 * user already has an organization record of any status — including
 * `suspended` (so a suspended organizer can't bypass their suspension
 * by starting over) and `rejected` (they must use
 * `resubmitRejectedApplication` instead, which preserves history).
 *
 * @param {string} userId
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
export async function submitOrganizationApplication(userId, payload) {
  if (!userId) {
    return mockResponse(null, { shouldFail: true, errorMessage: APPLICATION_ERROR.INVALID_REQUEST })
  }

  const existing = getOrganizationByOrganizerId(userId)
  if (existing) {
    const code = existing.status === ORGANIZATION_STATUS.SUSPENDED
      ? APPLICATION_ERROR.SUSPENDED
      : APPLICATION_ERROR.ALREADY_HAS_ORGANIZATION
    return mockResponse(null, { shouldFail: true, errorMessage: code })
  }

  const validationError = validatePayload(payload)
  if (validationError) {
    return mockResponse(null, { shouldFail: true, errorMessage: validationError })
  }

  const organization = {
    id: crypto.randomUUID(),
    organizerUserId: userId,
    ...buildFieldsFromPayload(payload),
    status: ORGANIZATION_STATUS.PENDING,
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null,
    previousRejectionReason: null
  }

  upsertOrganization(organization)
  return mockResponse(clone(organization))
}

/**
 * Edits a still-pending application in place — role/status never
 * change here (only an admin decision can do that).
 *
 * @param {string} userId
 * @param {string} applicationId
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
export async function updatePendingApplication(userId, applicationId, payload) {
  if (!userId || !applicationId) {
    return mockResponse(null, { shouldFail: true, errorMessage: APPLICATION_ERROR.INVALID_REQUEST })
  }
  const existing = findOwnedApplication(applicationId, userId)
  if (!existing) {
    return mockResponse(null, { shouldFail: true, errorMessage: APPLICATION_ERROR.NOT_FOUND })
  }
  if (existing.status !== ORGANIZATION_STATUS.PENDING) {
    return mockResponse(null, { shouldFail: true, errorMessage: APPLICATION_ERROR.NOT_PENDING })
  }

  const validationError = validatePayload(payload)
  if (validationError) {
    return mockResponse(null, { shouldFail: true, errorMessage: validationError })
  }

  const updated = { ...existing, ...buildFieldsFromPayload(payload) }
  upsertOrganization(updated)
  return mockResponse(clone(updated))
}

/**
 * Resubmits a rejected application with corrected details — moves it
 * back to `pending` and keeps the previous rejection reason around
 * (`previousRejectionReason`) as context for the next review, while
 * clearing the active `rejectionReason` since it no longer applies.
 *
 * @param {string} userId
 * @param {string} applicationId
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
export async function resubmitRejectedApplication(userId, applicationId, payload) {
  if (!userId || !applicationId) {
    return mockResponse(null, { shouldFail: true, errorMessage: APPLICATION_ERROR.INVALID_REQUEST })
  }
  const existing = findOwnedApplication(applicationId, userId)
  if (!existing) {
    return mockResponse(null, { shouldFail: true, errorMessage: APPLICATION_ERROR.NOT_FOUND })
  }
  if (existing.status !== ORGANIZATION_STATUS.REJECTED) {
    return mockResponse(null, { shouldFail: true, errorMessage: APPLICATION_ERROR.NOT_REJECTED })
  }

  const validationError = validatePayload(payload)
  if (validationError) {
    return mockResponse(null, { shouldFail: true, errorMessage: validationError })
  }

  const updated = {
    ...existing,
    ...buildFieldsFromPayload(payload),
    status: ORGANIZATION_STATUS.PENDING,
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
    reviewedBy: null,
    previousRejectionReason: existing.rejectionReason,
    rejectionReason: null
  }
  upsertOrganization(updated)
  return mockResponse(clone(updated))
}
