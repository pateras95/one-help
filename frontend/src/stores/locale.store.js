import { ref } from 'vue'
import { defineStore } from 'pinia'
import { i18n } from '@/plugins/i18n'
import { router } from '@/router'
import { applyDocumentTitle } from '@/router/documentTitle'
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY
} from '@/constants/locales'

function readStoredLocale() {
  try {
    return window.localStorage.getItem(LOCALE_STORAGE_KEY)
  } catch {
    // localStorage may be unavailable (e.g. disabled, private mode) — fall
    // back to the default locale rather than throwing.
    return null
  }
}

function writeStoredLocale(locale) {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // Ignore write failures — persistence is a nice-to-have, not required
    // for the app to function.
  }
}

function isSupportedLocale(locale) {
  return SUPPORTED_LOCALES.includes(locale)
}

/**
 * Owns the active locale: reads/validates the stored preference, keeps
 * Vue I18n and `document.documentElement.lang` in sync, and persists valid
 * changes. Presentation components must go through this store instead of
 * reading `localStorage` themselves.
 */
export const useLocaleStore = defineStore('locale', () => {
  const locale = ref(DEFAULT_LOCALE)
  const supportedLocales = ref(SUPPORTED_LOCALES)

  function applyLocale(nextLocale) {
    locale.value = nextLocale
    i18n.global.locale.value = nextLocale
    document.documentElement.lang = nextLocale
  }

  /** Reads the stored preference (if valid) and applies it, defaulting to Greek. */
  function init() {
    const stored = readStoredLocale()
    const initialLocale = isSupportedLocale(stored) ? stored : DEFAULT_LOCALE
    applyLocale(initialLocale)
    applyDocumentTitle(router.currentRoute.value.meta?.titleKey)
  }

  /** Switches the active locale and persists it, ignoring unsupported codes. */
  function setLocale(nextLocale) {
    if (!isSupportedLocale(nextLocale) || nextLocale === locale.value) return
    applyLocale(nextLocale)
    writeStoredLocale(nextLocale)
    applyDocumentTitle(router.currentRoute.value.meta?.titleKey)
  }

  return { locale, supportedLocales, init, setLocale }
})
