import { readParticipations } from '../mocks/participations.storage'
import { PARTICIPATION_STATUS } from './participationStatus'

/**
 * Local confirmed-participation count for an action, across all stored
 * records (any user) — capacity is a property of the action, consumed by
 * whoever joins, not scoped to a single user, so this intentionally
 * isn't filtered to "the current user's" participations.
 *
 * @param {string} actionId
 * @returns {number}
 */
export function getLocalConfirmedCount(actionId) {
  return readParticipations().filter(
    (record) => record.actionId === actionId && record.status === PARTICIPATION_STATUS.CONFIRMED
  ).length
}

/**
 * The action's own `registeredCount` plus the local confirmed overlay,
 * never exceeding `capacity`. Never mutates the original action object —
 * returns a new one. This is the one place both the Actions list and
 * Action Details should read the "current" count from, so they can
 * never disagree with each other.
 *
 * @param {Object} action
 * @returns {Object}
 */
export function withOverlaidCount(action) {
  const overlay = getLocalConfirmedCount(action.id)
  return {
    ...action,
    registeredCount: Math.min(action.registeredCount + overlay, action.capacity)
  }
}
