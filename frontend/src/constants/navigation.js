import { ROUTES } from '@/constants/routes'

/**
 * Temporary top-level navigation. Generated from constants so navigation
 * items are never hardcoded inside components.
 */
export const NAVIGATION_ITEMS = [
  { title: 'Αρχική', to: ROUTES.HOME },
  { title: 'Δράσεις', to: ROUTES.ACTIONS },
  { title: 'Σχετικά', to: ROUTES.ABOUT },
  { title: 'Επικοινωνία', to: ROUTES.CONTACT }
]
