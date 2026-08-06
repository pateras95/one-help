import { httpClient, extractApiError } from '@/services/http'
import { normalizeApiUser } from '@/services/normalizeApiUser'
import { ADMIN_ERROR } from '../utils/adminErrors'

/**
 * Real backend calls (`GET/PATCH /api/v1/admin/users`, `.../suspend`,
 * `.../reactivate` — docs/backend-discovery/api-users-and-roles.md). Unlike the mock
 * this replaces, `suspendUser`/`reactivateUser`/`updateUserProfile` no longer take an
 * `adminUserId` parameter — the backend derives the acting administrator from the
 * bearer token itself (`CurrentUserProvider`), the same way every other real endpoint
 * in this app already does; passing it explicitly would be dead, ignored input.
 */

/**
 * Maps a backend `ApiErrorResponse.code` to this feature's own pre-existing,
 * unprefixed error vocabulary (`ADMIN_ERROR`) so every existing
 * `t(adminErrorKey(err.message))` call site keeps working unchanged. Unlike auth's
 * simple `auth.` prefix strip, these codes come from two different backend domains
 * (`users.*`, `admin.*`) with names that don't always match the mock's own vocabulary
 * 1:1, so this is an explicit table rather than a mechanical strip.
 */
const CODE_MAP = {
  'users.notFound': ADMIN_ERROR.NOT_FOUND,
  'users.selfSuspensionNotAllowed': ADMIN_ERROR.CANNOT_SUSPEND_SELF,
  'admin.duplicateEmail': ADMIN_ERROR.DUPLICATE_EMAIL
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
 * @param {string} [filters.search] - matches first name, last name, or email
 * @param {string} [filters.role] - one of `ROLES` (lowercase — uppercased for the API call)
 * @param {string} [filters.status] - one of `ACCOUNT_STATUS` (lowercase — uppercased for the API call)
 * @returns {Promise<{content: Array<Object>, page: number, size: number, totalElements: number, totalPages: number}>}
 */
export async function getUsers({ page = 0, size = 20, search = '', role = '', status = '' } = {}) {
  try {
    const params = new URLSearchParams({ page: String(page), size: String(size) })
    if (search) params.set('search', search)
    if (role) params.set('role', role.toUpperCase())
    if (status) params.set('status', status.toUpperCase())

    const { data } = await httpClient.get(`/admin/users?${params.toString()}`)
    return { ...data, content: data.content.map(normalizeApiUser) }
  } catch (err) {
    throw toDomainError(err)
  }
}

/**
 * @param {string} userId
 * @returns {Promise<Object>}
 */
export async function getUserDetails(userId) {
  try {
    const { data } = await httpClient.get(`/admin/users/${userId}`)
    return normalizeApiUser(data)
  } catch (err) {
    throw toDomainError(err)
  }
}

/**
 * Edits a user's safe profile fields — first/last name and email (role is never
 * editable here: a volunteer only ever becomes an organizer through an approved
 * application — not built yet — and an organizer only ever reverts to a volunteer
 * through the future dedicated demotion cascade, also not built yet).
 *
 * @param {string} targetUserId
 * @param {{firstName: string, lastName: string, email: string}} payload
 * @returns {Promise<Object>}
 */
export async function updateUserProfile(targetUserId, payload) {
  try {
    const { data } = await httpClient.patch(`/admin/users/${targetUserId}`, payload)
    return normalizeApiUser(data)
  } catch (err) {
    throw toDomainError(err)
  }
}

/**
 * @param {string} targetUserId
 * @returns {Promise<Object>} `{id, status, updatedAt}`
 */
export async function suspendUser(targetUserId) {
  try {
    const { data } = await httpClient.post(`/admin/users/${targetUserId}/suspend`)
    return { ...data, status: data.status?.toLowerCase() }
  } catch (err) {
    throw toDomainError(err)
  }
}

/**
 * @param {string} targetUserId
 * @returns {Promise<Object>} `{id, status, updatedAt}`
 */
export async function reactivateUser(targetUserId) {
  try {
    const { data } = await httpClient.post(`/admin/users/${targetUserId}/reactivate`)
    return { ...data, status: data.status?.toLowerCase() }
  } catch (err) {
    throw toDomainError(err)
  }
}
