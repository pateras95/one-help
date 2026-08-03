import { ROUTES } from '@/constants/routes'
import { ROLES } from '@/constants/roles'

/**
 * Admin feature routes — all `requiresAuth` + restricted to the
 * `administrator` role via route `meta.roles`, same guard pattern as
 * the rest of the app (see `router/authGuard.js`). Never a raw role
 * string scattered in a view or component.
 */
export const adminRoutes = [
  {
    path: ROUTES.ADMIN,
    name: 'admin-dashboard',
    component: () => import('@/features/admin/views/AdminDashboardView.vue'),
    meta: {
      titleKey: 'admin.dashboard.pageTitle',
      requiresAuth: true,
      roles: [ROLES.ADMINISTRATOR]
    }
  },
  {
    path: ROUTES.ADMIN_USERS,
    name: 'admin-users',
    component: () => import('@/features/admin/views/AdminUsersView.vue'),
    meta: {
      titleKey: 'admin.users.pageTitle',
      requiresAuth: true,
      roles: [ROLES.ADMINISTRATOR]
    }
  },
  {
    path: ROUTES.ADMIN_ORGANIZATIONS,
    name: 'admin-organizations',
    component: () => import('@/features/admin/views/AdminOrganizationsView.vue'),
    meta: {
      titleKey: 'admin.organizations.pageTitle',
      requiresAuth: true,
      roles: [ROLES.ADMINISTRATOR]
    }
  },
  {
    path: ROUTES.ADMIN_ACTIONS,
    name: 'admin-actions',
    component: () => import('@/features/admin/views/AdminActionsView.vue'),
    meta: {
      titleKey: 'admin.actions.pageTitle',
      requiresAuth: true,
      roles: [ROLES.ADMINISTRATOR]
    }
  },
  {
    path: ROUTES.ADMIN_REPORTS,
    name: 'admin-reports',
    component: () => import('@/features/admin/views/AdminReportsView.vue'),
    meta: {
      titleKey: 'admin.reports.pageTitle',
      requiresAuth: true,
      roles: [ROLES.ADMINISTRATOR]
    }
  },
  {
    path: ROUTES.ADMIN_ACTIVITY,
    name: 'admin-activity',
    component: () => import('@/features/admin/views/AdminActivityView.vue'),
    meta: {
      titleKey: 'admin.activity.pageTitle',
      requiresAuth: true,
      roles: [ROLES.ADMINISTRATOR]
    }
  }
]
