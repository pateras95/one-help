/**
 * Shared volunteering category definitions — used by the Home page
 * showcase and the Actions discovery feature so both read from one
 * source of truth. Stable/structural data only: translation keys, an
 * icon, and a theme-safe accent color. No translated strings and no
 * filtering state live here.
 */
export const ACTION_CATEGORIES = [
  {
    id: 'emergency',
    labelKey: 'categories.emergency.label',
    descriptionKey: 'categories.emergency.description',
    icon: 'mdi-alert-decagram-outline',
    accent: 'categoryEmergency'
  },
  {
    id: 'health',
    labelKey: 'categories.health.label',
    descriptionKey: 'categories.health.description',
    icon: 'mdi-heart-pulse',
    accent: 'categoryHealth'
  },
  {
    id: 'environment',
    labelKey: 'categories.environment.label',
    descriptionKey: 'categories.environment.description',
    icon: 'mdi-leaf',
    accent: 'categoryEnvironment'
  },
  {
    id: 'social',
    labelKey: 'categories.social.label',
    descriptionKey: 'categories.social.description',
    icon: 'mdi-hand-heart',
    accent: 'categorySocial'
  },
  {
    id: 'animals',
    labelKey: 'categories.animals.label',
    descriptionKey: 'categories.animals.description',
    icon: 'mdi-paw',
    accent: 'categoryAnimals'
  }
]

export function getActionCategory(categoryId) {
  return ACTION_CATEGORIES.find((category) => category.id === categoryId)
}

export function isValidCategoryId(categoryId) {
  return ACTION_CATEGORIES.some((category) => category.id === categoryId)
}
