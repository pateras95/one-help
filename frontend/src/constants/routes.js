/**
 * Route path constants, shared by the router config and navigation
 * definitions so a path only ever needs to change in one place.
 */
export const ROUTES = {
  HOME: '/',
  ACTIONS: '/actions',
  MAP: '/map',
  ABOUT: '/about',
  CONTACT: '/contact',
  LOGIN: '/login',
  REGISTER: '/register',
  MY_ACTIONS: '/my-actions',
  ORGANIZER: '/organizer',
  ORGANIZER_NEW_ACTION: '/organizer/actions/new',
  ORGANIZER_ORGANIZATION: '/organizer/organization',
  ACCOUNT: '/account',
  CHECK_IN: '/check-in',
  UNAUTHORIZED: '/unauthorized',
  BECOME_ORGANIZER: '/become-organizer',
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_ORGANIZATIONS: '/admin/organizations',
  ADMIN_ACTIONS: '/admin/actions',
  ADMIN_REPORTS: '/admin/reports',
  ADMIN_ACTIVITY: '/admin/activity'
}

/** Builds the details path for a single action, e.g. `/actions/act-001`. */
export function actionDetailsPath(actionId) {
  return `${ROUTES.ACTIONS}/${actionId}`
}

/** Builds the organizer-facing details path for an owned action. */
export function organizerActionDetailsPath(actionId) {
  return `${ROUTES.ORGANIZER}/actions/${actionId}`
}

/** Builds the edit path for an organizer-owned action. */
export function organizerActionEditPath(actionId) {
  return `${organizerActionDetailsPath(actionId)}/edit`
}

/** Builds the read-only participant list path for an organizer-owned action. */
export function organizerActionParticipantsPath(actionId) {
  return `${organizerActionDetailsPath(actionId)}/participants`
}

/** Builds the organizer's QR check-in screen path for an owned action. */
export function organizerActionCheckInPath(actionId) {
  return `${organizerActionDetailsPath(actionId)}/check-in`
}
