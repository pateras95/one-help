import { i18n } from '@/plugins/i18n'
import { branding } from '@/config/branding'

/**
 * Sets `document.title` from a route's translated title key. Shared by the
 * router's navigation guard and the locale store (so switching languages
 * updates the title of the page you're already on) to avoid two copies of
 * the same formatting logic.
 */
export function applyDocumentTitle(titleKey) {
  const pageTitle = titleKey ? i18n.global.t(titleKey) : ''
  document.title = pageTitle ? `${pageTitle} · ${branding.appName}` : branding.appName
}
