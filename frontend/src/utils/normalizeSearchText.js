/**
 * Normalizes text for case/diacritic-insensitive search matching - one
 * function shared by every admin search box. Lowercases, then strips
 * combining diacritics via Unicode NFD decomposition (covers Greek
 * tonos accents and Latin accents alike, e.g. an accented character
 * and its unaccented form become identical after normalizing).
 *
 * @param {*} value
 * @returns {string}
 */
export function normalizeSearchText(value) {
  if (value === null || value === undefined) return ''
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/**
 * Whether any field in `haystacks` (any type, stringified) contains
 * `query` once both are normalized. Returns `true` (matches) when
 * `query` is empty, so an empty search box shows everything.
 *
 * @param {string} query
 * @param {Array<*>} haystacks
 * @returns {boolean}
 */
export function matchesSearchQuery(query, haystacks) {
  const normalizedQuery = normalizeSearchText(query).trim()
  if (!normalizedQuery) return true
  return haystacks.some((value) => normalizeSearchText(value).includes(normalizedQuery))
}
