/**
 * Stable error codes returned by the organizer actions service. Codes
 * are locale-agnostic strings — components translate them via
 * `t(\`organizer.errors.${code}\`)` rather than the service ever
 * producing user-facing text itself.
 */
export const ORGANIZER_ACTION_ERROR = {
  INVALID_REQUEST: 'invalidRequest',
  ACTION_NOT_FOUND: 'actionNotFound',
  NOT_OWNER: 'notOwner',
  INVALID_CATEGORY: 'invalidCategory',
  INVALID_DATE: 'invalidDate',
  INVALID_CAPACITY: 'invalidCapacity',
  CAPACITY_BELOW_CONFIRMED: 'capacityBelowConfirmed',
  INVALID_STATUS: 'invalidStatus',
  INVALID_TRANSITION: 'invalidTransition',
  ACTION_DATE_IN_PAST: 'actionDateInPast',
  INVALID_COORDINATES: 'invalidCoordinates'
}

const KNOWN_CODES = new Set(Object.values(ORGANIZER_ACTION_ERROR))

/**
 * Maps a (possibly unknown) error code to its i18n key, falling back to
 * a generic key so an unrecognized code never renders a raw error string.
 *
 * @param {string} code
 * @returns {string}
 */
export function organizerActionErrorKey(code) {
  return `organizer.errors.${KNOWN_CODES.has(code) ? code : 'generic'}`
}
