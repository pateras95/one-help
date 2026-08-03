/** An action report's handling status. */
export const REPORT_STATUS = {
  OPEN: 'open',
  INVESTIGATING: 'investigating',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed'
}

/** Why a volunteer reported an action — a fixed, translatable list. */
export const REPORT_REASON = {
  INCORRECT_INFORMATION: 'incorrectInformation',
  UNSAFE_OR_INAPPROPRIATE: 'unsafeOrInappropriate',
  SUSPICIOUS_ORGANIZATION: 'suspiciousOrganization',
  ACTION_NO_LONGER_EXISTS: 'actionNoLongerExists',
  OTHER: 'other'
}

/**
 * Allowed manual transitions, keyed by current status. Both terminal
 * statuses (`resolved`/`dismissed`) can still be moved to each other or
 * back to `investigating` — unlike organizer/organization moderation,
 * report handling is expected to be revisited (e.g. dismissed by
 * mistake), so nothing here is permanently terminal.
 */
const ALLOWED_TRANSITIONS = {
  [REPORT_STATUS.OPEN]: [REPORT_STATUS.INVESTIGATING, REPORT_STATUS.RESOLVED, REPORT_STATUS.DISMISSED],
  [REPORT_STATUS.INVESTIGATING]: [REPORT_STATUS.RESOLVED, REPORT_STATUS.DISMISSED, REPORT_STATUS.OPEN],
  [REPORT_STATUS.RESOLVED]: [REPORT_STATUS.INVESTIGATING],
  [REPORT_STATUS.DISMISSED]: [REPORT_STATUS.INVESTIGATING]
}

/**
 * @param {string} from
 * @param {string} to
 * @returns {boolean}
 */
export function canTransitionReport(from, to) {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false
}
