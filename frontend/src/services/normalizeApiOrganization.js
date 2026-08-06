/**
 * Backend organization enums are UPPER_SNAKE_CASE (`OrganizationStatus`,
 * `OrganizationType`, `OrganizationCategory` — see
 * docs/backend-discovery/api-organizations.md); the frontend's own constants
 * (`organizationStatus.js`, `constants/organizationTypes.js`,
 * `constants/actionCategories.js`) use lowercase/camelCase ids. These two
 * converters are the single place that mapping happens, in both directions —
 * mirroring `normalizeApiUser.js`'s role/status casing fix for the Users & Roles
 * phase.
 */
function upperSnakeToCamel(value) {
  if (!value) return value
  return value.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

function camelToUpperSnake(value) {
  if (!value) return value
  return value.replace(/([A-Z])/g, '_$1').toUpperCase()
}

function normalizeUserSummary(user) {
  if (!user) return null
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    avatarInitials: user.avatarInitials
  }
}

/**
 * Maps a backend `OrganizationResponse` onto the shape every existing
 * organization-reading component already expects (the mock's own record shape,
 * ADR-8) — `status`/`organizationType`/`categories` lowercased/camelCased,
 * `organizer` resolved (never a raw id — `organizerUserId` is kept too, for
 * template call sites that only need the id).
 *
 * @param {Object|null} data
 * @returns {Object|null}
 */
export function normalizeApiOrganization(data) {
  if (!data) return null
  const organizer = normalizeUserSummary(data.organizer)
  const reviewedBy = normalizeUserSummary(data.reviewedBy)
  return {
    id: data.id,
    organizerUserId: organizer?.id ?? null,
    organizer,
    name: data.name,
    description: data.description,
    organizationType: upperSnakeToCamel(data.organizationType),
    contactEmail: data.contactEmail,
    phone: data.phone,
    website: data.website,
    address: data.address,
    municipality: data.municipality,
    categories: (data.categories ?? []).map(upperSnakeToCamel),
    supportingMessage: data.supportingMessage,
    status: upperSnakeToCamel(data.status),
    submittedAt: data.submittedAt,
    reviewedAt: data.reviewedAt,
    reviewedBy: reviewedBy?.id ?? null,
    reviewedByUser: reviewedBy,
    rejectionReason: data.rejectionReason,
    previousRejectionReason: data.previousRejectionReason,
    version: data.version
  }
}

/**
 * Builds the backend request body from `OrganizationApplicationForm`'s emitted
 * payload (a single-language `name`/`description` string — ADR-9's documented,
 * accepted frontend simplification: duplicated into both `{el, en}` slots,
 * exactly as the mock's own `buildOrganizationFieldsFromPayload` already did).
 *
 * @param {Object} payload
 * @param {boolean} [includeAcceptedTerms] - `false` for `PATCH /organizations/me`,
 *   whose `UpdateOrganizationRequest` DTO has no such field.
 */
export function toApiOrganizationRequest(payload, includeAcceptedTerms = true) {
  const nameText = payload.name.trim()
  const descriptionText = payload.description.trim()
  const request = {
    name: { el: nameText, en: nameText },
    organizationType: camelToUpperSnake(payload.organizationType),
    description: { el: descriptionText, en: descriptionText },
    contactEmail: payload.contactEmail.trim(),
    phone: payload.phone?.trim() || null,
    website: payload.website?.trim() || null,
    address: payload.address.trim(),
    municipality: payload.municipality.trim(),
    categories: payload.categories.map(camelToUpperSnake),
    supportingMessage: payload.supportingMessage.trim()
  }
  if (includeAcceptedTerms) {
    request.acceptedTerms = Boolean(payload.acceptedTerms)
  }
  return request
}
