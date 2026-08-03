/**
 * Stable error codes returned by the organizer application service.
 * Codes are locale-agnostic strings — components translate them via
 * `t(\`becomeOrganizer.errors.${code}\`)` rather than the service ever
 * producing user-facing text itself.
 */
export const APPLICATION_ERROR = {
  INVALID_REQUEST: 'invalidRequest',
  NOT_FOUND: 'notFound',
  ALREADY_HAS_ORGANIZATION: 'alreadyHasOrganization',
  NOT_PENDING: 'notPending',
  NOT_REJECTED: 'notRejected',
  INVALID_ORGANIZATION_TYPE: 'invalidOrganizationType',
  INVALID_EMAIL: 'invalidEmail',
  INVALID_WEBSITE: 'invalidWebsite',
  INVALID_CATEGORIES: 'invalidCategories',
  TERMS_NOT_ACCEPTED: 'termsNotAccepted',
  SUSPENDED: 'suspended',
  DUPLICATE_NAME: 'duplicateName',
  NOT_ORGANIZER: 'notOrganizer'
}

const KNOWN_CODES = new Set(Object.values(APPLICATION_ERROR))

/**
 * Maps a (possibly unknown) error code to its i18n key, falling back to
 * a generic key so an unrecognized code never renders a raw error string.
 *
 * @param {string} code
 * @returns {string}
 */
export function applicationErrorKey(code) {
  return `becomeOrganizer.errors.${KNOWN_CODES.has(code) ? code : 'generic'}`
}
