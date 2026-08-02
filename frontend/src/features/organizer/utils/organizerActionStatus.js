/**
 * Stable organizer lifecycle statuses — the single source of truth so
 * code compares against `ORGANIZER_ACTION_STATUS.X` instead of
 * hardcoded strings. Distinct from `PARTICIPATION_STATUS` (confirmed/
 * cancelled), which describes a volunteer's relationship to an action,
 * not the action's own lifecycle.
 *
 * Mapping to the public-facing action status (`actions.service.js`'s
 * open/full/completed/closed):
 * - draft: never shown publicly.
 * - published: shown publicly as open/full/completed depending on date
 *   and capacity, same as before this feature existed.
 * - closed: shown publicly as `closed` — visible, but not joinable,
 *   regardless of date/capacity.
 * - cancelled: never shown publicly.
 */
export const ORGANIZER_ACTION_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  CLOSED: 'closed',
  CANCELLED: 'cancelled'
}

/**
 * Statuses visible in the public Actions feature (list/details). Draft
 * and cancelled actions only ever exist in the organizer's own view.
 */
export const PUBLIC_VISIBLE_STATUSES = [
  ORGANIZER_ACTION_STATUS.PUBLISHED,
  ORGANIZER_ACTION_STATUS.CLOSED
]

/**
 * Allowed manual transitions, keyed by current status. `closed` →
 * `published` is additionally conditional on the action's date still
 * being in the future — checked dynamically by the service, not here.
 */
const ALLOWED_TRANSITIONS = {
  [ORGANIZER_ACTION_STATUS.DRAFT]: [ORGANIZER_ACTION_STATUS.PUBLISHED, ORGANIZER_ACTION_STATUS.CANCELLED],
  [ORGANIZER_ACTION_STATUS.PUBLISHED]: [ORGANIZER_ACTION_STATUS.CLOSED, ORGANIZER_ACTION_STATUS.CANCELLED],
  [ORGANIZER_ACTION_STATUS.CLOSED]: [ORGANIZER_ACTION_STATUS.PUBLISHED],
  [ORGANIZER_ACTION_STATUS.CANCELLED]: []
}

/**
 * @param {string} from
 * @param {string} to
 * @returns {boolean}
 */
export function canTransition(from, to) {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false
}

/**
 * @param {string} status
 * @returns {Array<string>} Statuses `status` can move to (static rules only).
 */
export function allowedNextStatuses(status) {
  return ALLOWED_TRANSITIONS[status] ?? []
}
