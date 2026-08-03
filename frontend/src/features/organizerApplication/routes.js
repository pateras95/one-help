import { ROUTES } from '@/constants/routes'

/**
 * Organizer-application feature route — a single screen whose content
 * (form vs. pending/approved/rejected/suspended panel) depends entirely
 * on the current user's own application state, not on route params.
 * `requiresAuth` only (no `roles`): a logged-out visitor is bounced to
 * Login with a safe redirect by the existing guard, and any
 * authenticated role may land here (an already-approved organizer just
 * sees a confirmation panel with a link back to their dashboard,
 * instead of the route being blocked outright).
 */
export const organizerApplicationRoutes = [
  {
    path: ROUTES.BECOME_ORGANIZER,
    name: 'become-organizer',
    component: () => import('@/features/organizerApplication/views/BecomeOrganizerView.vue'),
    meta: {
      titleKey: 'becomeOrganizer.pageTitle',
      requiresAuth: true
    }
  }
]
