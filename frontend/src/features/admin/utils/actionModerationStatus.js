/**
 * An action's admin-moderation standing — deliberately separate from
 * `ORGANIZER_ACTION_STATUS` (the organizer-managed lifecycle: draft/
 * published/closed/cancelled). Public visibility requires both the
 * organizer lifecycle AND this moderation status to allow it (see
 * `features/actions/utils/actionVisibility.js`).
 */
export const ACTION_MODERATION_STATUS = {
  PENDING_REVIEW: 'pendingReview',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  HIDDEN: 'hidden'
}

/**
 * Allowed manual transitions, keyed by current status. `rejected` is
 * terminal in this mocked phase.
 */
const ALLOWED_TRANSITIONS = {
  [ACTION_MODERATION_STATUS.PENDING_REVIEW]: [ACTION_MODERATION_STATUS.APPROVED, ACTION_MODERATION_STATUS.REJECTED],
  [ACTION_MODERATION_STATUS.APPROVED]: [ACTION_MODERATION_STATUS.HIDDEN],
  [ACTION_MODERATION_STATUS.HIDDEN]: [ACTION_MODERATION_STATUS.APPROVED],
  [ACTION_MODERATION_STATUS.REJECTED]: []
}

/**
 * @param {string} from
 * @param {string} to
 * @returns {boolean}
 */
export function canTransitionModeration(from, to) {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false
}
