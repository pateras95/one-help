import { ACTIVITY_ACTION_TYPE } from './activityLogTypes'

/**
 * Resolves a log entry's stored metadata into translation-ready
 * interpolation params. Most entries just pass their metadata straight
 * through, but `reportStatusChanged` stores raw status values
 * (`open`/`investigating`/...) that must be translated at render time
 * (not baked in at log time) so a language switch re-translates every
 * past entry too, not just new ones.
 *
 * @param {Object} entry
 * @param {Function} t - The active `useI18n()` translate function.
 * @returns {Object}
 */
export function activityMetadataForTranslation(entry, t) {
  if (entry.actionType === ACTIVITY_ACTION_TYPE.REPORT_STATUS_CHANGED) {
    return {
      ...entry.metadata,
      fromStatus: t(`admin.reportStatus.${entry.metadata.fromStatus}`),
      toStatus: t(`admin.reportStatus.${entry.metadata.toStatus}`)
    }
  }
  if (entry.actionType === ACTIVITY_ACTION_TYPE.ACTION_LIFECYCLE_CHANGED) {
    return {
      ...entry.metadata,
      status: t(`organizer.status.${entry.metadata.status}`)
    }
  }
  return entry.metadata ?? {}
}
