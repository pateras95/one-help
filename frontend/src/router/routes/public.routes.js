import { ROUTES } from '@/constants/routes'

/**
 * Public routes, accessible without authentication.
 */
export const publicRoutes = [
  {
    path: ROUTES.HOME,
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: {
      title: 'Αρχική',
      requiresAuth: false
    }
  },
  {
    path: ROUTES.ACTIONS,
    name: 'actions',
    component: () => import('@/views/ActionsView.vue'),
    meta: {
      title: 'Δράσεις',
      requiresAuth: false
    }
  },
  {
    path: ROUTES.ABOUT,
    name: 'about',
    component: () => import('@/views/AboutView.vue'),
    meta: {
      title: 'Σχετικά',
      requiresAuth: false
    }
  },
  {
    path: ROUTES.CONTACT,
    name: 'contact',
    component: () => import('@/views/ContactView.vue'),
    meta: {
      title: 'Επικοινωνία',
      requiresAuth: false
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: {
      title: 'Η σελίδα δεν βρέθηκε',
      requiresAuth: false
    }
  }
]
