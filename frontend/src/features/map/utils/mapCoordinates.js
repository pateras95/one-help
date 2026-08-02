/**
 * Whether an action carries coordinates precise enough to place a
 * marker. Missing/invalid coordinates are common by design (organizer
 * coordinates are optional) — callers must treat `false` as a normal,
 * safe-to-skip case, never a crash.
 *
 * @param {Object} action
 * @returns {boolean}
 */
export function hasValidCoordinates(action) {
  return (
    Number.isFinite(action?.latitude) &&
    Number.isFinite(action?.longitude) &&
    action.latitude >= -90 &&
    action.latitude <= 90 &&
    action.longitude >= -180 &&
    action.longitude <= 180
  )
}

/**
 * Filters a list of actions down to the ones with valid coordinates,
 * warning in development for any dropped so a bad fixture/organizer
 * entry doesn't silently disappear without a trace.
 *
 * @param {Array<Object>} actions
 * @returns {Array<Object>}
 */
export function withValidCoordinates(actions) {
  const valid = []
  for (const action of actions) {
    if (hasValidCoordinates(action)) {
      valid.push(action)
    } else if (import.meta.env.DEV) {
      console.warn(`[map] Skipping action "${action.id}" — missing or invalid coordinates.`)
    }
  }
  return valid
}
