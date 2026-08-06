import { httpClient, extractApiError } from '@/services/http'
import { APPLICATION_ERROR } from '../utils/applicationErrors'
import { ADMIN_ERROR } from '@/features/admin/utils/adminErrors'

/**
 * Real backend calls (`POST /api/v1/organizations/me/demote`,
 * `POST /api/v1/admin/organizations/{organizationId}/demote` —
 * docs/backend-discovery/api-organizations.md). Unlike the mock's single
 * `demoteOrganizerToVolunteer(userId, initiatedBy)`, these are two distinct real
 * endpoints (self-service never accepts a client-supplied id at all; the
 * administrator path is keyed by the *organization's* id, not the organizer's
 * user id, since that's what the admin's own organization list already has on
 * hand) — so this file now exports two functions instead of one shared one.
 * Both delete the organization and reset the owner's role transactionally on
 * the backend; `actionsRemoved` in the response is always `0` in this phase
 * (no Actions backend exists yet).
 */

function toDomainError(axiosError, codeMap) {
  const apiError = extractApiError(axiosError)
  const error = new Error(codeMap[apiError.code] ?? apiError.code)
  error.code = apiError.code
  error.fieldErrors = apiError.fieldErrors
  error.status = apiError.status
  return error
}

const SELF_CODE_MAP = {
  'organizer.organizationMissing': APPLICATION_ERROR.NOT_ORGANIZER
}

const ADMIN_CODE_MAP = {
  'organization.notFound': ADMIN_ERROR.NOT_FOUND,
  'organizer.notOrganizer': ADMIN_ERROR.NOT_ORGANIZER,
  'organizer.demotionNotAllowed': ADMIN_ERROR.DEMOTION_NOT_ALLOWED
}

/**
 * Organizer self-demotion — always acts on the authenticated caller, never a
 * client-supplied id.
 *
 * @returns {Promise<{organizationName: {el: string, en: string}, actionsRemoved: number}>}
 */
export async function demoteSelf() {
  try {
    const { data } = await httpClient.post('/organizations/me/demote')
    return data
  } catch (err) {
    throw toDomainError(err, SELF_CODE_MAP)
  }
}

/**
 * Administrator-triggered demotion of the given organization's current owner.
 *
 * @param {string} organizationId
 * @returns {Promise<{organizationName: {el: string, en: string}, actionsRemoved: number}>}
 */
export async function demoteOrganizerByOrganizationId(organizationId) {
  try {
    const { data } = await httpClient.post(`/admin/organizations/${organizationId}/demote`)
    return data
  } catch (err) {
    throw toDomainError(err, ADMIN_CODE_MAP)
  }
}
