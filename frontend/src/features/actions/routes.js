import { ROUTES } from '@/constants/routes'

/**
 * Actions feature routes — public (no auth), aggregated into the app's
 * router alongside the other public route groups.
 */
export const actionsRoutes = [
  {
    path: ROUTES.ACTIONS,
    name: 'actions',
    component: () => import('@/features/actions/views/ActionsListView.vue'),
    meta: {
      titleKey: 'navigation.actions',
      requiresAuth: false
    }
  },
  {
    path: `${ROUTES.ACTIONS}/:actionId`,
    name: 'action-details',
    component: () => import('@/features/actions/views/ActionDetailsView.vue'),
    meta: {
      titleKey: 'actions.details.genericTitle',
      requiresAuth: false
    }
  }
]
