/**
 * Stable lowercase role identifiers — the single source of truth so
 * components compare against `ROLES.X` instead of hardcoded strings.
 *
 * Only `volunteer` and `organizer` have working flows in this phase.
 * `moderator`/`administrator` are reserved for later features and must
 * not be exposed in any UI yet.
 */
export const ROLES = {
  VOLUNTEER: 'volunteer',
  ORGANIZER: 'organizer',
  MODERATOR: 'moderator',
  ADMINISTRATOR: 'administrator'
}

/** Roles with a real, reachable flow today. */
export const ACTIVE_ROLES = [ROLES.VOLUNTEER, ROLES.ORGANIZER]
