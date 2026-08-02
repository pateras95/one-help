/**
 * Mocked check-in eligibility window, kept in one shared place instead of
 * scattered date-math across views.
 *
 * Policy: check-in is considered "within the normal window" starting
 * `OPENS_MINUTES_BEFORE_START` minutes before an action's scheduled start
 * and ending `CLOSES_MINUTES_AFTER_START` minutes after it.
 *
 * This window is informational only — it drives a notice shown on the
 * organizer's QR screen, not a hard block in the attendance service. Every
 * mock action's date is generated relative to "today" (see
 * `actions.mock.js`), always some days in the future, so a real backend's
 * strict window would make check-in permanently untestable against this
 * fixture data. The service's actual gate is simpler and always
 * enforceable: only a `published` action accepts new check-ins at all
 * (see `attendance.service.js`). An organizer opening the check-in screen
 * is treated as the real-world "I am here, checking people in now" signal
 * — the moment that would justify overriding a strict window in a real
 * deployment — so both QR and manual check-ins are accepted regardless of
 * the window's outcome; the window's role here is purely to surface an
 * honest heads-up when the action's scheduled time doesn't line up with
 * "now".
 */
export const CHECK_IN_WINDOW = {
  OPENS_MINUTES_BEFORE_START: 30,
  CLOSES_MINUTES_AFTER_START: 180
}

/** Combines an action's `date` + `startTime` into a real Date instance. */
export function getActionStartDateTime(action) {
  return new Date(`${action.date}T${action.startTime}`)
}

/**
 * @param {Object} action
 * @param {Date} [now]
 * @returns {boolean} Whether `now` falls inside the normal check-in window.
 */
export function isWithinCheckInWindow(action, now = new Date()) {
  const start = getActionStartDateTime(action)
  const opensAt = new Date(start.getTime() - CHECK_IN_WINDOW.OPENS_MINUTES_BEFORE_START * 60000)
  const closesAt = new Date(start.getTime() + CHECK_IN_WINDOW.CLOSES_MINUTES_AFTER_START * 60000)
  return now >= opensAt && now <= closesAt
}
