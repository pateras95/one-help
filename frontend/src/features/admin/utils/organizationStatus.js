/**
 * An organization's admin-approval standing. Distinct from
 * `ORGANIZER_ACTION_STATUS` (an individual action's organizer-managed
 * lifecycle) — this describes the organizer/organization itself.
 */
export const ORGANIZATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended'
}

/**
 * Allowed manual transitions, keyed by current status. `rejected` is
 * terminal in this mocked phase — same design choice as a cancelled
 * organizer action never being reopened.
 */
const ALLOWED_TRANSITIONS = {
  [ORGANIZATION_STATUS.PENDING]: [ORGANIZATION_STATUS.APPROVED, ORGANIZATION_STATUS.REJECTED],
  [ORGANIZATION_STATUS.APPROVED]: [ORGANIZATION_STATUS.SUSPENDED],
  [ORGANIZATION_STATUS.SUSPENDED]: [ORGANIZATION_STATUS.APPROVED],
  [ORGANIZATION_STATUS.REJECTED]: []
}

/**
 * @param {string} from
 * @param {string} to
 * @returns {boolean}
 */
export function canTransitionOrganization(from, to) {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false
}
