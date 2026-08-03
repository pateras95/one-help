import { ROUTES } from '@/constants/routes'
import { ROLES } from '@/constants/roles'

/**
 * Single source of truth for top-level navigation. Each item declares
 * whether it appears in the desktop top bar, the mobile bottom
 * navigation, or both — components must never hardcode routes or keep
 * separate desktop/mobile navigation lists.
 *
 * `labelKey` is a translation key, resolved via `t()` in the consuming
 * component — this file stays locale-independent. An item may also
 * declare `mobileLabelKey` for a shorter label used only by the bottom
 * navigation (which has little horizontal room); every other consumer
 * (desktop nav, account menu, page titles) always uses `labelKey`.
 *
 * Contact is intentionally desktop-only (`showOnMobile: false`) — Map
 * took its place in every four-item mobile set below, and Contact
 * stays reachable from the desktop nav and the site footer.
 */
export const NAVIGATION_ITEMS = [
  {
    to: ROUTES.HOME,
    routeName: 'home',
    labelKey: 'navigation.home',
    icon: 'mdi-home',
    showOnDesktop: true,
    showOnMobile: true
  },
  {
    to: ROUTES.ACTIONS,
    routeName: 'actions',
    labelKey: 'navigation.actions',
    icon: 'mdi-hand-heart',
    showOnDesktop: true,
    showOnMobile: true
  },
  {
    to: ROUTES.MAP,
    routeName: 'map',
    labelKey: 'navigation.map',
    icon: 'mdi-map-marker-radius-outline',
    showOnDesktop: true,
    showOnMobile: true
  },
  {
    to: ROUTES.ABOUT,
    routeName: 'about',
    labelKey: 'navigation.about',
    icon: 'mdi-information-outline',
    showOnDesktop: true,
    showOnMobile: true
  },
  {
    to: ROUTES.CONTACT,
    routeName: 'contact',
    labelKey: 'navigation.contact',
    icon: 'mdi-email-outline',
    showOnDesktop: true,
    showOnMobile: false
  }
]

export const DESKTOP_NAVIGATION_ITEMS = NAVIGATION_ITEMS.filter((item) => item.showOnDesktop)
export const MOBILE_NAVIGATION_ITEMS = NAVIGATION_ITEMS.filter((item) => item.showOnMobile)

/**
 * Mobile bottom-navigation sets by role, once authenticated — swaps the
 * logged-out set's last item (About) for one role-specific destination.
 * Never exceeds four items. Keyed by `ROLES.*` so the consuming
 * component only needs the current user's role to pick a set.
 *
 * Account is deliberately NOT in either authenticated set — with Home,
 * Actions, Map and one role destination already filling all four slots,
 * Account stays reachable from the top app bar/account control instead
 * (`AppNavigation.vue` shows it there regardless of viewport width).
 */
export const AUTHENTICATED_MOBILE_NAVIGATION = {
  [ROLES.VOLUNTEER]: [
    NAVIGATION_ITEMS[0],
    NAVIGATION_ITEMS[1],
    NAVIGATION_ITEMS[2],
    {
      to: ROUTES.MY_ACTIONS,
      routeName: 'my-actions',
      labelKey: 'navigation.myActions',
      // Bottom-nav space is tight — a shorter label avoids wrapping at
      // 320px. Only `AppBottomNavigation` reads this; the page title and
      // account menu keep the full `labelKey` text.
      mobileLabelKey: 'navigation.myActionsMobile',
      icon: 'mdi-hand-heart-outline'
    }
  ],
  [ROLES.ORGANIZER]: [
    NAVIGATION_ITEMS[0],
    NAVIGATION_ITEMS[1],
    NAVIGATION_ITEMS[2],
    {
      to: ROUTES.ORGANIZER,
      routeName: 'organizer',
      labelKey: 'navigation.organizerArea',
      icon: 'mdi-briefcase-outline'
    }
  ],
  // Administrator swaps Map for the Admin workspace and includes Account
  // directly (unlike the other roles, which reach Account only via the
  // top app bar) — administrators have no volunteer/organizer
  // destination to put in that fourth slot instead.
  [ROLES.ADMINISTRATOR]: [
    NAVIGATION_ITEMS[0],
    NAVIGATION_ITEMS[1],
    {
      to: ROUTES.ADMIN,
      routeName: 'admin-dashboard',
      labelKey: 'navigation.admin',
      icon: 'mdi-shield-account-outline'
    },
    {
      to: ROUTES.ACCOUNT,
      routeName: 'account',
      labelKey: 'navigation.account',
      icon: 'mdi-account-outline'
    }
  ]
}
