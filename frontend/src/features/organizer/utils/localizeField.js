/**
 * Picks the active locale's text out of a bilingual `{ el, en }` field.
 * Organizer views keep the raw bilingual records from the service and
 * pick text here at render time, so a language switch never needs a
 * refetch — unlike the public Actions feature, which pre-localizes in
 * the service and re-fetches on locale change.
 *
 * @param {{el: string, en: string}} field
 * @param {string} locale
 * @returns {string}
 */
export function localizeField(field, locale) {
  return field?.[locale === 'en' ? 'en' : 'el'] ?? field?.el ?? ''
}
