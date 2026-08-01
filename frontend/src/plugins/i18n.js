import { createI18n } from 'vue-i18n'
import { messages } from '@/locales'
import { DEFAULT_LOCALE } from '@/constants/locales'

export const i18n = createI18n({
  legacy: false,
  locale: DEFAULT_LOCALE,
  fallbackLocale: DEFAULT_LOCALE,
  messages
})
