import { ROUTES } from '@/constants/routes'
import { ROLES } from '@/constants/roles'

/**
 * Auth feature routes. `guestOnly` routes redirect an already-authenticated
 * user away; `requiresAuth` (+ optional `roles`) routes redirect a guest
 * to Login, or a mismatched role to Unauthorized. See `router/authGuard.js`.
 */
export const authRoutes = [
  {
    path: ROUTES.LOGIN,
    name: 'login',
    component: () => import('@/features/auth/views/LoginView.vue'),
    meta: {
      titleKey: 'navigation.login',
      guestOnly: true
    }
  },
  {
    path: ROUTES.REGISTER,
    name: 'register',
    component: () => import('@/features/auth/views/RegisterView.vue'),
    meta: {
      titleKey: 'navigation.register',
      guestOnly: true
    }
  },
  {
    path: ROUTES.MY_ACTIONS,
    name: 'my-actions',
    component: () => import('@/features/participation/views/MyActionsView.vue'),
    meta: {
      titleKey: 'navigation.myActions',
      requiresAuth: true,
      roles: [ROLES.VOLUNTEER]
    }
  },
  {
    path: ROUTES.ACCOUNT,
    name: 'account',
    component: () => import('@/features/auth/views/AccountView.vue'),
    meta: {
      titleKey: 'navigation.account',
      requiresAuth: true
    }
  }
]
