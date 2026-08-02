import { ROUTES } from '@/constants/routes'
import { ROLES } from '@/constants/roles'

/**
 * Organizer feature routes — all `requiresAuth` + restricted to the
 * `organizer` role, same guard pattern as the rest of the app (see
 * `router/authGuard.js`).
 */
export const organizerRoutes = [
  {
    path: ROUTES.ORGANIZER,
    name: 'organizer-dashboard',
    component: () => import('@/features/organizer/views/OrganizerDashboardView.vue'),
    meta: {
      titleKey: 'navigation.organizerArea',
      requiresAuth: true,
      roles: [ROLES.ORGANIZER]
    }
  },
  {
    path: ROUTES.ORGANIZER_NEW_ACTION,
    name: 'organizer-action-create',
    component: () => import('@/features/organizer/views/OrganizerActionFormView.vue'),
    meta: {
      titleKey: 'organizer.form.createTitle',
      requiresAuth: true,
      roles: [ROLES.ORGANIZER]
    }
  },
  {
    path: `${ROUTES.ORGANIZER}/actions/:actionId/edit`,
    name: 'organizer-action-edit',
    component: () => import('@/features/organizer/views/OrganizerActionFormView.vue'),
    meta: {
      titleKey: 'organizer.form.editTitle',
      requiresAuth: true,
      roles: [ROLES.ORGANIZER]
    }
  },
  {
    path: `${ROUTES.ORGANIZER}/actions/:actionId/participants`,
    name: 'organizer-action-participants',
    component: () => import('@/features/organizer/views/OrganizerParticipantsView.vue'),
    meta: {
      titleKey: 'organizer.participants.title',
      requiresAuth: true,
      roles: [ROLES.ORGANIZER]
    }
  },
  {
    path: `${ROUTES.ORGANIZER}/actions/:actionId`,
    name: 'organizer-action-details',
    component: () => import('@/features/organizer/views/OrganizerActionDetailsView.vue'),
    meta: {
      titleKey: 'organizer.details.pageTitle',
      requiresAuth: true,
      roles: [ROLES.ORGANIZER]
    }
  }
]
