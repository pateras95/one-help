import { ROUTES } from '@/constants/routes'

/**
 * Map feature routes — public, no authentication required (same as
 * Actions Discovery).
 */
export const mapRoutes = [
  {
    path: ROUTES.MAP,
    name: 'map',
    component: () => import('@/features/map/views/MapView.vue'),
    meta: {
      titleKey: 'map.page.title',
      requiresAuth: false
    }
  }
]
