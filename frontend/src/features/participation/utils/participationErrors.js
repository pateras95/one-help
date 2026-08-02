/**
 * Stable error codes returned by the participation service. Codes are
 * locale-agnostic strings — components translate them via
 * `t(\`participation.errors.${code}\`)` rather than the service ever
 * producing user-facing text itself.
 */
export const PARTICIPATION_ERROR = {
  INVALID_REQUEST: 'invalidRequest',
  ACTION_NOT_FOUND: 'actionNotFound',
  ACTION_CLOSED: 'actionClosed',
  ACTION_FULL: 'actionFull',
  ALREADY_JOINED: 'alreadyJoined',
  PARTICIPATION_NOT_FOUND: 'participationNotFound'
}

const KNOWN_CODES = new Set(Object.values(PARTICIPATION_ERROR))

/**
 * Maps a (possibly unknown) error code to its i18n key, falling back to a
 * generic key so an unrecognized code never renders a raw error string.
 *
 * @param {string} code
 * @returns {string}
 */
export function participationErrorKey(code) {
  return `participation.errors.${KNOWN_CODES.has(code) ? code : 'generic'}`
}
