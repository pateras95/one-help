import { isOrganizationNameTaken } from '@/features/admin/mocks/organizations.storage'
import { isValidOrganizationTypeId } from '@/constants/organizationTypes'
import { isValidCategoryId } from '@/constants/actionCategories'
import { APPLICATION_ERROR } from './applicationErrors'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const WEBSITE_PATTERN = /^https?:\/\/.+\..+/i
const TEXT_MIN_LENGTH = 20
const TEXT_MAX_LENGTH = 2000
const NAME_MIN_LENGTH = 2
const NAME_MAX_LENGTH = 120

/**
 * Validates an organization application/profile payload, returning an
 * error code or `null`. Shared by the organizer application flow
 * (submit/edit-pending/resubmit), the organizer's own organization
 * profile edit, and the admin organization edit dialog — one set of
 * field rules for every place an organization record can be written.
 *
 * @param {Object} payload
 * @param {Object} [options]
 * @param {string} [options.excludeOrganizationId] - Skip this
 *   organization's own name when checking for a name clash (editing an
 *   existing record shouldn't collide with itself).
 * @param {boolean} [options.requireAcceptedTerms] - Set to `false` for
 *   admin/organizer profile edits, where there is no terms checkbox.
 */
export function validateOrganizationPayload(payload, { excludeOrganizationId, requireAcceptedTerms = true } = {}) {
  if (!payload) return APPLICATION_ERROR.INVALID_REQUEST

  const name = payload.name?.trim() ?? ''
  if (!name || name.length < NAME_MIN_LENGTH || name.length > NAME_MAX_LENGTH) return APPLICATION_ERROR.INVALID_REQUEST
  if (isOrganizationNameTaken({ el: name, en: name }, excludeOrganizationId)) return APPLICATION_ERROR.DUPLICATE_NAME

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

  if (requireAcceptedTerms && !payload.acceptedTerms) return APPLICATION_ERROR.TERMS_NOT_ACCEPTED

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
export function buildOrganizationFieldsFromPayload(payload) {
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
