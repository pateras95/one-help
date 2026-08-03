import { mockResponse } from '@/utils/mockResponse'
import { getMergedOrganizations, getOrganizationByOrganizerId, upsertOrganization } from '@/features/admin/mocks/organizations.storage'
import { ORGANIZATION_STATUS } from '@/features/admin/utils/organizationStatus'
import { getMembershipByUserId } from '../mocks/organizationMembership.storage'
import { APPLICATION_ERROR } from '../utils/applicationErrors'
import { validateOrganizationPayload, buildOrganizationFieldsFromPayload } from '../utils/organizationValidation'

function clone(record) {
  return record ? { ...record } : record
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

  const validationError = validateOrganizationPayload(payload)
  if (validationError) {
    return mockResponse(null, { shouldFail: true, errorMessage: validationError })
  }

  const organization = {
    id: crypto.randomUUID(),
    organizerUserId: userId,
    ...buildOrganizationFieldsFromPayload(payload),
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

  const validationError = validateOrganizationPayload(payload, { excludeOrganizationId: applicationId })
  if (validationError) {
    return mockResponse(null, { shouldFail: true, errorMessage: validationError })
  }

  const updated = { ...existing, ...buildOrganizationFieldsFromPayload(payload) }
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

  const validationError = validateOrganizationPayload(payload, { excludeOrganizationId: applicationId })
  if (validationError) {
    return mockResponse(null, { shouldFail: true, errorMessage: validationError })
  }

  const updated = {
    ...existing,
    ...buildOrganizationFieldsFromPayload(payload),
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

/**
 * Edits an already-approved (or currently suspended) organization's own
 * profile fields. Suspended organizers may still keep their contact/
 * profile information up to date — only publishing actions is blocked
 * while suspended (enforced separately by `checkOrganizationGate` in
 * the organizer-actions service). Pending/rejected applications use
 * `updatePendingApplication`/`resubmitRejectedApplication` instead.
 *
 * @param {string} userId
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
export async function updateOrganizationProfile(userId, payload) {
  if (!userId) {
    return mockResponse(null, { shouldFail: true, errorMessage: APPLICATION_ERROR.INVALID_REQUEST })
  }
  const existing = getOrganizationByOrganizerId(userId)
  if (!existing) {
    return mockResponse(null, { shouldFail: true, errorMessage: APPLICATION_ERROR.NOT_ORGANIZER })
  }
  if (existing.status !== ORGANIZATION_STATUS.APPROVED && existing.status !== ORGANIZATION_STATUS.SUSPENDED) {
    return mockResponse(null, { shouldFail: true, errorMessage: APPLICATION_ERROR.INVALID_REQUEST })
  }

  const validationError = validateOrganizationPayload(payload, { excludeOrganizationId: existing.id, requireAcceptedTerms: false })
  if (validationError) {
    return mockResponse(null, { shouldFail: true, errorMessage: validationError })
  }

  const updated = { ...existing, ...buildOrganizationFieldsFromPayload(payload) }
  upsertOrganization(updated)
  return mockResponse(clone(updated))
}
