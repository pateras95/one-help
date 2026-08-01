/**
 * Supported application locales. Kept independent of the active locale and
 * of Vue I18n itself so the locale store and i18n plugin can both import
 * from a single source of truth.
 */
export const SUPPORTED_LOCALES = ['el', 'en']

export const DEFAULT_LOCALE = 'el'

export const LOCALE_STORAGE_KEY = 'onehelp.locale'

/**
 * Structural per-locale data for the language switcher: short code, flag
 * asset (local, no remote images), and the key to resolve its display name
 * through — resolved via `t()` in the component, not here, since the
 * display name is locale-reactive (e.g. the Greek option reads "Ελληνικά"
 * while the UI is in Greek, but "Greek" while the UI is in English).
 */
export const LOCALE_OPTIONS = [
  { code: 'el', shortLabel: 'ΕΛ', flag: '/branding/locales/el.svg', nameKey: 'common.languageNames.el' },
  { code: 'en', shortLabel: 'EN', flag: '/branding/locales/en.svg', nameKey: 'common.languageNames.en' }
]
