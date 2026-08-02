/**
 * Centralized date helpers — comparisons always go through these instead
 * of comparing translated/formatted date strings, which would be both
 * locale-fragile and wrong (string comparison isn't chronological order
 * for most date formats).
 */

/** Midnight (local time) of the given date-like value. */
export function startOfDay(dateLike) {
  const date = new Date(dateLike)
  date.setHours(0, 0, 0, 0)
  return date
}

/** True if `dateLike` is strictly before today (start of day). */
export function isPastDate(dateLike) {
  return startOfDay(dateLike) < startOfDay(new Date())
}

/**
 * Returns a `YYYY-MM-DD` string `days` days from today (local). Used to
 * keep mock fixture dates from ever going stale — the mock data always
 * reads as "this many days out" relative to whenever the app actually
 * runs, instead of a hardcoded date that eventually becomes historical.
 *
 * @param {number} days - May be negative for a past date.
 */
export function relativeDateString(days) {
  const date = startOfDay(new Date())
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}
