const EARTH_RADIUS_KM = 6371

function toRadians(degrees) {
  return (degrees * Math.PI) / 180
}

/**
 * Approximate straight-line ("as the crow flies") distance in
 * kilometers between two coordinates, via the Haversine formula. This
 * is NOT road/driving distance — UI copy must describe it as
 * approximate.
 *
 * @param {{lat: number, lng: number}} from
 * @param {{lat: number, lng: number}} to
 * @returns {number} Distance in kilometers.
 */
export function haversineDistanceKm(from, to) {
  const dLat = toRadians(to.lat - from.lat)
  const dLng = toRadians(to.lng - from.lng)
  const lat1 = toRadians(from.lat)
  const lat2 = toRadians(to.lat)

  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_KM * c
}

/**
 * Formats a distance for display without baking in a locale — callers
 * translate `{ value, unit }` themselves (e.g. `t('map.distance.km', {
 * value })`) so the number/unit split stays locale-agnostic here.
 *
 * @param {number} distanceKm
 * @returns {{value: number, unit: 'm'|'km'}}
 */
export function formatDistance(distanceKm) {
  if (distanceKm < 1) {
    return { value: Math.round(distanceKm * 1000), unit: 'm' }
  }
  return { value: Math.round(distanceKm * 10) / 10, unit: 'km' }
}
