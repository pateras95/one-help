import { mockResponse } from '@/utils/mockResponse'
import { getMergedActions } from '@/features/organizer/mocks/organizerActions.storage'
import { readReports, addReport, upsertReport } from '../mocks/reports.storage'
import { logActivity } from '../mocks/activityLog.storage'
import { REPORT_STATUS, REPORT_REASON, canTransitionReport } from '../utils/reportStatus'
import { ACTIVITY_ACTION_TYPE, ACTIVITY_TARGET_TYPE } from '../utils/activityLogTypes'
import { ADMIN_ERROR } from '../utils/adminErrors'

function clone(record) {
  return record ? { ...record } : record
}

/**
 * Submits a new action report — used from Action Details by an
 * authenticated volunteer. Never exposes reporter identity beyond this
 * service/the admin workspace.
 *
 * @param {string} reporterUserId
 * @param {string} actionId
 * @param {string} reason - One of `REPORT_REASON`.
 * @param {string} [description]
 * @returns {Promise<Object>}
 */
export async function createReport(reporterUserId, actionId, reason, description = '') {
  if (!reporterUserId || !actionId) {
    return mockResponse(null, { shouldFail: true, errorMessage: ADMIN_ERROR.INVALID_REQUEST })
  }
  if (!Object.values(REPORT_REASON).includes(reason)) {
    return mockResponse(null, { shouldFail: true, errorMessage: ADMIN_ERROR.INVALID_REQUEST })
  }

  const action = getMergedActions().find((candidate) => candidate.id === actionId)
  if (!action) {
    return mockResponse(null, { shouldFail: true, errorMessage: ADMIN_ERROR.NOT_FOUND })
  }
  if (action.organizerId === reporterUserId) {
    return mockResponse(null, { shouldFail: true, errorMessage: ADMIN_ERROR.CANNOT_REPORT_OWN_ACTION })
  }

  const hasDuplicateOpenReport = readReports().some(
    (record) =>
      record.reporterUserId === reporterUserId &&
      record.actionId === actionId &&
      record.status === REPORT_STATUS.OPEN
  )
  if (hasDuplicateOpenReport) {
    return mockResponse(null, { shouldFail: true, errorMessage: ADMIN_ERROR.DUPLICATE_OPEN_REPORT })
  }

  const record = {
    id: crypto.randomUUID(),
    actionId,
    reporterUserId,
    reason,
    description: description?.trim() || null,
    status: REPORT_STATUS.OPEN,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    resolvedBy: null,
    resolutionNote: null
  }
  addReport(record)
  return mockResponse(clone(record))
}

/**
 * All reports, newest first — the admin reports workspace. Reporter
 * identity is included here (admin-only view) but never in anything
 * shown publicly.
 *
 * @returns {Promise<Array<Object>>}
 */
export async function getReports() {
  const records = readReports()
    .map(clone)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  return mockResponse(records)
}

/**
 * @param {string} reportId
 * @returns {Promise<Object|null>}
 */
export async function getReportById(reportId) {
  if (!reportId) {
    return mockResponse(null, { shouldFail: true, errorMessage: ADMIN_ERROR.INVALID_REQUEST })
  }
  const record = readReports().find((candidate) => candidate.id === reportId) ?? null
  return mockResponse(clone(record))
}

/**
 * @param {string} adminUserId
 * @param {string} reportId
 * @param {string} nextStatus - One of `REPORT_STATUS`.
 * @param {string} [note] - Optional resolution note, kept only for `resolved`/`dismissed`.
 * @returns {Promise<Object>}
 */
export async function updateReportStatus(adminUserId, reportId, nextStatus, note = '') {
  if (!adminUserId || !reportId) {
    return mockResponse(null, { shouldFail: true, errorMessage: ADMIN_ERROR.INVALID_REQUEST })
  }
  const existing = readReports().find((candidate) => candidate.id === reportId)
  if (!existing) {
    return mockResponse(null, { shouldFail: true, errorMessage: ADMIN_ERROR.NOT_FOUND })
  }
  if (!canTransitionReport(existing.status, nextStatus)) {
    return mockResponse(null, { shouldFail: true, errorMessage: ADMIN_ERROR.INVALID_TRANSITION })
  }

  const isResolution = nextStatus === REPORT_STATUS.RESOLVED || nextStatus === REPORT_STATUS.DISMISSED
  const updated = {
    ...existing,
    status: nextStatus,
    ...(isResolution
      ? { resolvedAt: new Date().toISOString(), resolvedBy: adminUserId, resolutionNote: note?.trim() || null }
      : {})
  }
  upsertReport(updated)

  logActivity({
    adminUserId,
    actionType: ACTIVITY_ACTION_TYPE.REPORT_STATUS_CHANGED,
    targetType: ACTIVITY_TARGET_TYPE.REPORT,
    targetId: reportId,
    metadata: { fromStatus: existing.status, toStatus: nextStatus }
  })

  return mockResponse(clone(updated))
}
