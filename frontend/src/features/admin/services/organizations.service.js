import { httpClient, extractApiError } from '@/services/http'
import { normalizeApiOrganization, toApiOrganizationRequest } from '@/services/normalizeApiOrganization'
import { ADMIN_ERROR } from '../utils/adminErrors'

/**
 * Real backend calls (`GET/PATCH /api/v1/admin/organizations`, `.../approve`,
 * `.../reject`, `.../suspend`, `.../restore` —
 * docs/backend-discovery/api-organizations.md). Unlike the mock this replaces,
 * none of these take an `adminUserId` parameter — the backend derives the
 * acting administrator from the bearer token itself, the same way
 * `adminUsers.service.js` already does.
 */

const CODE_MAP = {
  'organization.notFound': ADMIN_ERROR.NOT_FOUND,
  'organization.invalidTransition': ADMIN_ERROR.INVALID_TRANSITION,
  'organization.reasonRequired': ADMIN_ERROR.REASON_REQUIRED,
  'organization.duplicateName': ADMIN_ERROR.DUPLICATE_NAME,
  'validation.failed': ADMIN_ERROR.INVALID_REQUEST
}

function toDomainError(axiosError) {
  const apiError = extractApiError(axiosError)
  const error = new Error(CODE_MAP[apiError.code] ?? apiError.code)
  error.code = apiError.code
  error.fieldErrors = apiError.fieldErrors
  error.status = apiError.status
  return error
}

/**
 * @param {Object} [filters]
 * @param {number} [filters.page=0]
 * @param {number} [filters.size=20]
 * @param {string} [filters.search] - matches either name locale
 * @param {string} [filters.status] - one of `ORGANIZATION_STATUS` (lowercase — uppercased for the API call)
 * @returns {Promise<{content: Array<Object>, page: number, size: number, totalElements: number, totalPages: number}>}
 */
export async function getOrganizations({ page = 0, size = 20, search = '', status = '' } = {}) {
  try {
    const params = new URLSearchParams({ page: String(page), size: String(size) })
    if (search) params.set('search', search)
    if (status) params.set('status', status.toUpperCase())

    const { data } = await httpClient.get(`/admin/organizations?${params.toString()}`)
    return { ...data, content: data.content.map(normalizeApiOrganization) }
  } catch (err) {
    throw toDomainError(err)
  }
}

/**
 * @param {string} organizationId
 * @returns {Promise<Object>}
 */
export async function getOrganizationById(organizationId) {
  try {
    const { data } = await httpClient.get(`/admin/organizations/${organizationId}`)
    return normalizeApiOrganization(data)
  } catch (err) {
    throw toDomainError(err)
  }
}

/**
 * @param {string} organizationId
 * @returns {Promise<Object>}
 */
export async function approveOrganization(organizationId) {
  try {
    const { data } = await httpClient.post(`/admin/organizations/${organizationId}/approve`)
    return normalizeApiOrganization(data)
  } catch (err) {
    throw toDomainError(err)
  }
}

/**
 * @param {string} organizationId
 * @param {string} reason
 * @returns {Promise<Object>}
 */
export async function rejectOrganization(organizationId, reason) {
  try {
    const { data } = await httpClient.post(`/admin/organizations/${organizationId}/reject`, { reason })
    return normalizeApiOrganization(data)
  } catch (err) {
    throw toDomainError(err)
  }
}

/**
 * Idempotent — suspending an already-suspended organization succeeds and
 * returns the current state.
 *
 * @param {string} organizationId
 * @returns {Promise<Object>}
 */
export async function suspendOrganization(organizationId) {
  try {
    const { data } = await httpClient.post(`/admin/organizations/${organizationId}/suspend`)
    return normalizeApiOrganization(data)
  } catch (err) {
    throw toDomainError(err)
  }
}

/**
 * Idempotent — restoring an already-approved organization succeeds and
 * returns the current state.
 *
 * @param {string} organizationId
 * @returns {Promise<Object>}
 */
export async function restoreOrganization(organizationId) {
  try {
    const { data } = await httpClient.post(`/admin/organizations/${organizationId}/restore`)
    return normalizeApiOrganization(data)
  } catch (err) {
    throw toDomainError(err)
  }
}

/**
 * Edits an organization's own profile fields from the admin side — reuses the
 * exact same field validation as the organizer-facing forms server-side, so an
 * admin edit can never produce a record the organizer-facing forms would
 * themselves reject. Approval status is unaffected.
 *
 * @param {string} organizationId
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
export async function updateOrganizationDetails(organizationId, payload) {
  try {
    const { data } = await httpClient.patch(
      `/admin/organizations/${organizationId}`,
      toApiOrganizationRequest(payload, false)
    )
    return normalizeApiOrganization(data)
  } catch (err) {
    throw toDomainError(err)
  }
}
