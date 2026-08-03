import { useAuthStore } from '@/features/auth/stores/auth.store'
import { ROLES } from '@/constants/roles'
import { ROUTES } from '@/constants/routes'
import { isSafeInternalRedirect } from '@/features/auth/utils/safeRedirect'

/**
 * This guard is a UX convenience — it hides pages the current mock
 * session shouldn't see and points people at the right screen. It is
 * NOT real security: everything it checks lives in browser-side state
 * and localStorage, which any client can inspect or forge. A real
 * backend must independently enforce the same rules.
 */

function defaultAuthenticatedPath(role) {
  if (role === ROLES.ORGANIZER) return ROUTES.ORGANIZER
  if (role === ROLES.ADMINISTRATOR) return ROUTES.ADMIN
  return ROUTES.MY_ACTIONS
}

/**
 * @param {import('vue-router').RouteLocationNormalized} to
 * @returns {Promise<true|import('vue-router').RouteLocationRaw>} `true` to
 *   proceed, or a redirect target.
 */
export async function authGuard(to) {
  const authStore = useAuthStore()
  await authStore.initializeSession()

  const { requiresAuth, guestOnly, roles } = to.meta

  if (guestOnly && authStore.isAuthenticated) {
    return { path: defaultAuthenticatedPath(authStore.currentUser.role) }
  }

  if (requiresAuth && !authStore.isAuthenticated) {
    const query = isSafeInternalRedirect(to.fullPath) ? { redirect: to.fullPath } : undefined
    return { path: ROUTES.LOGIN, query }
  }

  if (requiresAuth && Array.isArray(roles) && !authStore.hasRole(...roles)) {
    return { path: ROUTES.UNAUTHORIZED }
  }

  return true
}
