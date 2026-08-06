import { httpClient, extractApiError } from '@/services/http'
import { normalizeApiOrganization, toApiOrganizationRequest } from '@/services/normalizeApiOrganization'
import { APPLICATION_ERROR } from '../utils/applicationErrors'

/**
 * Real backend calls (`GET/PATCH /api/v1/organizer-applications`,
 * `.../resubmit`, `GET/PATCH /api/v1/organizations/me` —
 * docs/backend-discovery/api-organizations.md). Unlike the mock this replaces,
 * none of these take a `userId` parameter — the backend always derives the
 * caller from the bearer token (`CurrentUserProvider`), never a client-supplied id.
 *
 * The mock's separate membership concept is gone entirely (ADR-4) — this file,
 * and the store built on top of it, no longer have a `membership` notion at all.
 */

/**
 * Maps a backend `ApiErrorResponse.code` to this feature's own pre-existing,
 * unprefixed error vocabulary (`APPLICATION_ERROR`) so every existing
 * `t(applicationErrorKey(err.message))` call site keeps working unchanged.
 */
const CODE_MAP = {
  'organization.alreadyHasOrganization': APPLICATION_ERROR.ALREADY_HAS_ORGANIZATION,
  'organization.notPending': APPLICATION_ERROR.NOT_PENDING,
  'organization.notRejected': APPLICATION_ERROR.NOT_REJECTED,
  'organization.termsNotAccepted': APPLICATION_ERROR.TERMS_NOT_ACCEPTED,
  'organization.duplicateName': APPLICATION_ERROR.DUPLICATE_NAME,
  'organization.notFound': APPLICATION_ERROR.NOT_FOUND,
  'organization.invalidTransition': APPLICATION_ERROR.INVALID_REQUEST,
  'organizer.organizationMissing': APPLICATION_ERROR.NOT_ORGANIZER,
  'validation.failed': APPLICATION_ERROR.INVALID_REQUEST
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
 * The current user's own organization/application record, regardless of
 * status — `null` if they have never submitted one.
 *
 * @returns {Promise<Object|null>}
 */
export async function getApplicationForUser() {
  try {
    const { data } = await httpClient.get('/organizer-applications/me')
    return normalizeApiOrganization(data)
  } catch (err) {
    const apiError = extractApiError(err)
    if (apiError.code === 'organization.notFound') return null
    throw toDomainError(err)
  }
}

/**
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
export async function submitOrganizationApplication(payload) {
  try {
    const { data } = await httpClient.post('/organizer-applications', toApiOrganizationRequest(payload, true))
    return normalizeApiOrganization(data)
  } catch (err) {
    throw toDomainError(err)
  }
}

/**
 * @param {string} applicationId
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
export async function updatePendingApplication(applicationId, payload) {
  try {
    const { data } = await httpClient.patch(
      `/organizer-applications/${applicationId}`,
      toApiOrganizationRequest(payload, true)
    )
    return normalizeApiOrganization(data)
  } catch (err) {
    throw toDomainError(err)
  }
}

/**
 * @param {string} applicationId
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
export async function resubmitRejectedApplication(applicationId, payload) {
  try {
    const { data } = await httpClient.post(
      `/organizer-applications/${applicationId}/resubmit`,
      toApiOrganizationRequest(payload, true)
    )
    return normalizeApiOrganization(data)
  } catch (err) {
    throw toDomainError(err)
  }
}

/**
 * Edits an already-approved (or currently suspended) organization's own
 * profile fields (`PATCH /organizations/me`) — allowed only while
 * `APPROVED`/`SUSPENDED`, enforced server-side.
 *
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
export async function updateOrganizationProfile(payload) {
  try {
    const { data } = await httpClient.patch('/organizations/me', toApiOrganizationRequest(payload, false))
    return normalizeApiOrganization(data)
  } catch (err) {
    throw toDomainError(err)
  }
}
