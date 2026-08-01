import { ROUTES } from '@/constants/routes'
import { actionsRoutes } from '@/features/actions/routes'

/**
 * Public routes, accessible without authentication. `titleKey` points at a
 * translation key resolved at navigation time (and again on locale change)
 * — never a literal string, so titles stay correct in both languages.
 */
export const publicRoutes = [
  {
    path: ROUTES.HOME,
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: {
      titleKey: 'navigation.home',
      requiresAuth: false
    }
  },
  ...actionsRoutes,
  {
    path: ROUTES.ABOUT,
    name: 'about',
    component: () => import('@/views/AboutView.vue'),
    meta: {
      titleKey: 'navigation.about',
      requiresAuth: false
    }
  },
  {
    path: ROUTES.CONTACT,
    name: 'contact',
    component: () => import('@/views/ContactView.vue'),
    meta: {
      titleKey: 'navigation.contact',
      requiresAuth: false
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: {
      titleKey: 'errors.notFound.title',
      requiresAuth: false
    }
  }
]
