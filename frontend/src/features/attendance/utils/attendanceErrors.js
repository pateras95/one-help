/**
 * Stable error codes returned by the attendance service. Codes are
 * locale-agnostic strings — components translate them via
 * `t(\`attendance.errors.${code}\`)` rather than the service ever
 * producing user-facing text itself.
 */
export const ATTENDANCE_ERROR = {
  INVALID_REQUEST: 'invalidRequest',
  NOT_OWNER: 'notOwner',
  PARTICIPATION_NOT_FOUND: 'participationNotFound',
  NOT_CONFIRMED: 'notConfirmed',
  ACTION_NOT_JOINABLE: 'actionNotJoinable',
  ALREADY_CHECKED_IN: 'alreadyCheckedIn',
  NOT_CHECKED_IN: 'notCheckedIn',
  INVALID_TOKEN: 'invalidToken',
  EXPIRED_TOKEN: 'expiredToken'
}

const KNOWN_CODES = new Set(Object.values(ATTENDANCE_ERROR))

/**
 * Maps a (possibly unknown) error code to its i18n key, falling back to a
 * generic key so an unrecognized code never renders a raw error string.
 *
 * @param {string} code
 * @returns {string}
 */
export function attendanceErrorKey(code) {
  return `attendance.errors.${KNOWN_CODES.has(code) ? code : 'generic'}`
}
