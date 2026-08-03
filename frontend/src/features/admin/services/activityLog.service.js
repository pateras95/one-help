import { mockResponse } from '@/utils/mockResponse'
import { readActivityLog } from '../mocks/activityLog.storage'

/**
 * The mocked admin activity history, newest first — read-only in the
 * UI. This is not a legally compliant audit log, only a mocked
 * administrative history for this demo.
 *
 * @param {Object} [options]
 * @param {number} [options.limit] - Only the most recent N entries (e.g. for a dashboard widget).
 * @returns {Promise<Array<Object>>}
 */
export async function getActivityLog({ limit } = {}) {
  const entries = [...readActivityLog()].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  return mockResponse(typeof limit === 'number' ? entries.slice(0, limit) : entries)
}
