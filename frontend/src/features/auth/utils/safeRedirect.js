/**
 * Validates that a `?redirect=` value is a safe, same-app internal path
 * before it's used for navigation — never trust it blindly. Rejects
 * anything that isn't a plain internal path: absolute URLs, protocol
 * handlers (`javascript:`, `data:`, ...), and protocol-relative URLs
 * (`//evil.example`) all fail the leading-single-slash check below.
 *
 * @param {unknown} path
 * @returns {boolean}
 */
export function isSafeInternalRedirect(path) {
  if (typeof path !== 'string' || path.length === 0) return false
  if (!path.startsWith('/')) return false
  if (path.startsWith('//')) return false
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(path)) return false
  return true
}
