/**
 * Stable attendance statuses — the single source of truth so code compares
 * against `ATTENDANCE_STATUS.X` instead of hardcoded strings. Distinct from
 * `PARTICIPATION_STATUS` (confirmed/cancelled), which describes a
 * volunteer's registration, not their physical presence at the action.
 *
 * `NOT_CHECKED_IN` is never persisted as its own record — it's the implied
 * state when no attendance record exists yet for a participation. Once a
 * record exists it only ever moves `checkedIn` -> `checkedOut` (terminal);
 * this mock does not support re-entry after a check-out.
 */
export const ATTENDANCE_STATUS = {
  NOT_CHECKED_IN: 'notCheckedIn',
  CHECKED_IN: 'checkedIn',
  CHECKED_OUT: 'checkedOut'
}

/** How an attendance record was created. */
export const CHECK_IN_METHOD = {
  QR: 'qr',
  MANUAL: 'manual'
}

/**
 * Derives the display status for a participation from its (possibly
 * missing) attendance record.
 *
 * @param {Object|null|undefined} attendanceRecord
 * @returns {string} One of `ATTENDANCE_STATUS`.
 */
export function getAttendanceStatus(attendanceRecord) {
  return attendanceRecord?.status ?? ATTENDANCE_STATUS.NOT_CHECKED_IN
}
