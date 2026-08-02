import { ROUTES } from '@/constants/routes'
import { ROLES } from '@/constants/roles'

/**
 * Attendance feature routes. The organizer QR screen follows the same
 * `requiresAuth` + `roles` guard pattern as the rest of the organizer
 * feature. `/check-in` is intentionally `requiresAuth` only (no `roles`)
 * — an authenticated organizer can still reach the page and see a clear
 * in-page restriction message, the same pattern already used by
 * `ParticipationPanel.vue` for "organizers cannot join", rather than a
 * blunt redirect to the generic Unauthorized page.
 */
export const attendanceRoutes = [
  {
    path: `${ROUTES.ORGANIZER}/actions/:actionId/check-in`,
    name: 'organizer-action-check-in',
    component: () => import('@/features/attendance/views/OrganizerCheckInView.vue'),
    meta: {
      titleKey: 'attendance.checkIn.pageTitle',
      requiresAuth: true,
      roles: [ROLES.ORGANIZER]
    }
  },
  {
    path: ROUTES.CHECK_IN,
    name: 'check-in',
    component: () => import('@/features/attendance/views/CheckInView.vue'),
    meta: {
      titleKey: 'attendance.scan.pageTitle',
      requiresAuth: true
    }
  }
]
