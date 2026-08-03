/**
 * Stable error codes shared by the admin feature's mock services. Codes
 * are locale-agnostic strings — components translate them via
 * `t(\`admin.errors.${code}\`)` rather than a service ever producing
 * user-facing text itself.
 */
export const ADMIN_ERROR = {
  INVALID_REQUEST: 'invalidRequest',
  NOT_FOUND: 'notFound',
  CANNOT_SUSPEND_SELF: 'cannotSuspendSelf',
  INVALID_TRANSITION: 'invalidTransition',
  REASON_REQUIRED: 'reasonRequired',
  DUPLICATE_OPEN_REPORT: 'duplicateOpenReport',
  CANNOT_REPORT_OWN_ACTION: 'cannotReportOwnAction'
}

const KNOWN_CODES = new Set(Object.values(ADMIN_ERROR))

/**
 * Maps a (possibly unknown) error code to its i18n key, falling back to
 * a generic key so an unrecognized code never renders a raw error string.
 *
 * @param {string} code
 * @returns {string}
 */
export function adminErrorKey(code) {
  return `admin.errors.${KNOWN_CODES.has(code) ? code : 'generic'}`
}
