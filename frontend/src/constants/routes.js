/**
 * Route path constants, shared by the router config and navigation
 * definitions so a path only ever needs to change in one place.
 */
export const ROUTES = {
  HOME: '/',
  ACTIONS: '/actions',
  ABOUT: '/about',
  CONTACT: '/contact',
  LOGIN: '/login',
  REGISTER: '/register',
  MY_ACTIONS: '/my-actions',
  ORGANIZER: '/organizer',
  ACCOUNT: '/account',
  UNAUTHORIZED: '/unauthorized'
}

/** Builds the details path for a single action, e.g. `/actions/act-001`. */
export function actionDetailsPath(actionId) {
  return `${ROUTES.ACTIONS}/${actionId}`
}
