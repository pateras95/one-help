import { mockResponse } from '@/utils/mockResponse'
import { getMergedOrganizations, upsertOrganization } from '../mocks/organizations.storage'
import { logActivity } from '../mocks/activityLog.storage'
import { ORGANIZATION_STATUS, canTransitionOrganization } from '../utils/organizationStatus'
import { ACTIVITY_ACTION_TYPE, ACTIVITY_TARGET_TYPE } from '../utils/activityLogTypes'
import { ADMIN_ERROR } from '../utils/adminErrors'
import { ROLES } from '@/constants/roles'
import { setUserRoleOverride } from '@/features/auth/mocks/userRole.storage'
import { createOwnerMembership, setMembershipStatusForOrganization } from '@/features/organizerApplication/mocks/organizationMembership.storage'

function clone(org) {
  return org ? { ...org } : org
}

function findOrganization(organizationId) {
  return getMergedOrganizations().find((org) => org.id === organizationId) ?? null
}

/**
 * All organizations, pending first (so the admin sees what needs
 * attention first), then by submission date.
 *
 * @returns {Promise<Array<Object>>}
 */
export async function getOrganizations() {
  const orgs = getMergedOrganizations().map(clone)
  const statusOrder = { [ORGANIZATION_STATUS.PENDING]: 0, [ORGANIZATION_STATUS.APPROVED]: 1, [ORGANIZATION_STATUS.SUSPENDED]: 2, [ORGANIZATION_STATUS.REJECTED]: 3 }
  orgs.sort((a, b) => {
    const orderDiff = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9)
    if (orderDiff !== 0) return orderDiff
    return new Date(b.submittedAt) - new Date(a.submittedAt)
  })
  return mockResponse(orgs)
}

/**
 * @param {string} organizationId
 * @returns {Promise<Object|null>}
 */
export async function getOrganizationById(organizationId) {
  if (!organizationId) {
    return mockResponse(null, { shouldFail: true, errorMessage: ADMIN_ERROR.INVALID_REQUEST })
  }
  return mockResponse(clone(findOrganization(organizationId)))
}

function applyTransition(organization, nextStatus, { adminUserId, reason = null } = {}) {
  if (!canTransitionOrganization(organization.status, nextStatus)) {
    return { error: ADMIN_ERROR.INVALID_TRANSITION }
  }
  const updated = {
    ...organization,
    status: nextStatus,
    reviewedAt: new Date().toISOString(),
    reviewedBy: adminUserId,
    ...(nextStatus === ORGANIZATION_STATUS.REJECTED ? { rejectionReason: reason } : {})
  }
  upsertOrganization(updated)
  return { organization: updated }
}

/**
 * @param {string} adminUserId
 * @param {string} organizationId
 * @returns {Promise<Object>}
 */
export async function approveOrganization(adminUserId, organizationId) {
  if (!adminUserId || !organizationId) {
    return mockResponse(null, { shouldFail: true, errorMessage: ADMIN_ERROR.INVALID_REQUEST })
  }
  const organization = findOrganization(organizationId)
  if (!organization) {
    return mockResponse(null, { shouldFail: true, errorMessage: ADMIN_ERROR.NOT_FOUND })
  }

  const { organization: updated, error } = applyTransition(organization, ORGANIZATION_STATUS.APPROVED, { adminUserId })
  if (error) return mockResponse(null, { shouldFail: true, errorMessage: error })

  // Approval's two real-world effects, atomically from the caller's
  // point of view: the applicant becomes the organization's owner
  // (membership record — the authoritative organization relationship
  // going forward), and gains organizer navigation/capability today via
  // the mock role override (see `userRole.storage.js` for why this is a
  // documented frontend simplification: a real backend would derive
  // organizer capability from the membership record alone, with no
  // separate role field to keep in sync).
  createOwnerMembership(updated.id, updated.organizerUserId)
  setUserRoleOverride(updated.organizerUserId, ROLES.ORGANIZER, adminUserId)

  logActivity({
    adminUserId,
    actionType: ACTIVITY_ACTION_TYPE.ORGANIZATION_APPROVED,
    targetType: ACTIVITY_TARGET_TYPE.ORGANIZATION,
    targetId: organizationId,
    metadata: { name: updated.name.en }
  })
  return mockResponse(clone(updated))
}

/**
 * @param {string} adminUserId
 * @param {string} organizationId
 * @param {string} reason
 * @returns {Promise<Object>}
 */
export async function rejectOrganization(adminUserId, organizationId, reason) {
  if (!adminUserId || !organizationId) {
    return mockResponse(null, { shouldFail: true, errorMessage: ADMIN_ERROR.INVALID_REQUEST })
  }
  if (!reason || !reason.trim()) {
    return mockResponse(null, { shouldFail: true, errorMessage: ADMIN_ERROR.REASON_REQUIRED })
  }
  const organization = findOrganization(organizationId)
  if (!organization) {
    return mockResponse(null, { shouldFail: true, errorMessage: ADMIN_ERROR.NOT_FOUND })
  }

  const { organization: updated, error } = applyTransition(organization, ORGANIZATION_STATUS.REJECTED, { adminUserId, reason: reason.trim() })
  if (error) return mockResponse(null, { shouldFail: true, errorMessage: error })

  logActivity({
    adminUserId,
    actionType: ACTIVITY_ACTION_TYPE.ORGANIZATION_REJECTED,
    targetType: ACTIVITY_TARGET_TYPE.ORGANIZATION,
    targetId: organizationId,
    metadata: { name: updated.name.en, reason: reason.trim() }
  })
  return mockResponse(clone(updated))
}

/**
 * @param {string} adminUserId
 * @param {string} organizationId
 * @returns {Promise<Object>}
 */
export async function suspendOrganization(adminUserId, organizationId) {
  if (!adminUserId || !organizationId) {
    return mockResponse(null, { shouldFail: true, errorMessage: ADMIN_ERROR.INVALID_REQUEST })
  }
  const organization = findOrganization(organizationId)
  if (!organization) {
    return mockResponse(null, { shouldFail: true, errorMessage: ADMIN_ERROR.NOT_FOUND })
  }

  const { organization: updated, error } = applyTransition(organization, ORGANIZATION_STATUS.SUSPENDED, { adminUserId })
  if (error) return mockResponse(null, { shouldFail: true, errorMessage: error })

  // The membership itself is preserved (never removed), only its status
  // mirrors the organization's — the owner's actual navigation/role is
  // deliberately left untouched here; suspension is enforced through
  // the existing organization gate on organizer actions, not by hiding
  // the account's own organizer standing from them (they must still be
  // able to see their own suspended state).
  setMembershipStatusForOrganization(updated.id, ORGANIZATION_STATUS.SUSPENDED)

  logActivity({
    adminUserId,
    actionType: ACTIVITY_ACTION_TYPE.ORGANIZATION_SUSPENDED,
    targetType: ACTIVITY_TARGET_TYPE.ORGANIZATION,
    targetId: organizationId,
    metadata: { name: updated.name.en }
  })
  return mockResponse(clone(updated))
}

/**
 * Restores a suspended organization back to `approved`.
 *
 * @param {string} adminUserId
 * @param {string} organizationId
 * @returns {Promise<Object>}
 */
export async function restoreOrganization(adminUserId, organizationId) {
  if (!adminUserId || !organizationId) {
    return mockResponse(null, { shouldFail: true, errorMessage: ADMIN_ERROR.INVALID_REQUEST })
  }
  const organization = findOrganization(organizationId)
  if (!organization) {
    return mockResponse(null, { shouldFail: true, errorMessage: ADMIN_ERROR.NOT_FOUND })
  }

  const { organization: updated, error } = applyTransition(organization, ORGANIZATION_STATUS.APPROVED, { adminUserId })
  if (error) return mockResponse(null, { shouldFail: true, errorMessage: error })

  setMembershipStatusForOrganization(updated.id, ORGANIZATION_STATUS.APPROVED)

  logActivity({
    adminUserId,
    actionType: ACTIVITY_ACTION_TYPE.ORGANIZATION_RESTORED,
    targetType: ACTIVITY_TARGET_TYPE.ORGANIZATION,
    targetId: organizationId,
    metadata: { name: updated.name.en }
  })
  return mockResponse(clone(updated))
}
