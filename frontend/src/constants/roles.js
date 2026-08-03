/**
 * Stable lowercase role identifiers — the single source of truth so
 * components compare against `ROLES.X` instead of hardcoded strings.
 *
 * `volunteer`, `organizer` and `administrator` have working flows.
 * `moderator` remains reserved for a later feature and must not be
 * exposed in any UI yet.
 */
export const ROLES = {
  VOLUNTEER: 'volunteer',
  ORGANIZER: 'organizer',
  MODERATOR: 'moderator',
  ADMINISTRATOR: 'administrator'
}

/** Roles with a real, reachable flow today. */
export const ACTIVE_ROLES = [ROLES.VOLUNTEER, ROLES.ORGANIZER, ROLES.ADMINISTRATOR]
