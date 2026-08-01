/**
 * Supported application locales. Kept independent of the active locale and
 * of Vue I18n itself so the locale store and i18n plugin can both import
 * from a single source of truth.
 */
export const SUPPORTED_LOCALES = ['el', 'en']

export const DEFAULT_LOCALE = 'el'

export const LOCALE_STORAGE_KEY = 'onehelp.locale'

/**
 * Each locale's own native name (autonym) and short code, for the language
 * switcher. These are intentionally NOT translated — a language's own name
 * is conventionally shown in that language regardless of the active UI
 * locale (e.g. "English" stays "English" even when the UI is in Greek).
 */
export const LOCALE_OPTIONS = [
  { code: 'el', shortLabel: 'ΕΛ', nativeName: 'Ελληνικά' },
  { code: 'en', shortLabel: 'EN', nativeName: 'English' }
]
