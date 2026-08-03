/**
 * Builds a Google Maps "get directions" URL for a destination coordinate
 * pair — the single place this URL shape is constructed, so every
 * "Directions" button/link in the app stays consistent. Intentionally
 * does not request the user's own location or compute a route itself:
 * this only opens Google Maps in a new tab and lets it handle routing.
 * No API key required — this is the public, key-less web URL scheme.
 *
 * @param {number} latitude
 * @param {number} longitude
 * @returns {string}
 */
export function buildDirectionsUrl(latitude, longitude) {
  const destination = `${latitude},${longitude}`
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
}
