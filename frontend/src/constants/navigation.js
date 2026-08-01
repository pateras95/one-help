import { ROUTES } from '@/constants/routes'

/**
 * Single source of truth for top-level navigation. Each item declares
 * whether it appears in the desktop top bar, the mobile bottom
 * navigation, or both — components must never hardcode routes or keep
 * separate desktop/mobile navigation lists.
 *
 * `labelKey` is a translation key, resolved via `t()` in the consuming
 * component — this file stays locale-independent.
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
    showOnMobile: true
  }
]

export const DESKTOP_NAVIGATION_ITEMS = NAVIGATION_ITEMS.filter((item) => item.showOnDesktop)
export const MOBILE_NAVIGATION_ITEMS = NAVIGATION_ITEMS.filter((item) => item.showOnMobile)
