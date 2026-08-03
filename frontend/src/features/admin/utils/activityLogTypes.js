/**
 * Stable identifiers for what an activity log entry recorded. Kept
 * separate from the various status enums since an entry describes an
 * *event* ("user was suspended"), not a status value.
 */
export const ACTIVITY_ACTION_TYPE = {
  USER_SUSPENDED: 'userSuspended',
  USER_REACTIVATED: 'userReactivated',
  ORGANIZATION_APPROVED: 'organizationApproved',
  ORGANIZATION_REJECTED: 'organizationRejected',
  ORGANIZATION_SUSPENDED: 'organizationSuspended',
  ORGANIZATION_RESTORED: 'organizationRestored',
  ACTION_APPROVED: 'actionApproved',
  ACTION_REJECTED: 'actionRejected',
  ACTION_HIDDEN: 'actionHidden',
  ACTION_RESTORED: 'actionRestored',
  REPORT_STATUS_CHANGED: 'reportStatusChanged'
}

/** What kind of record `targetId` refers to. */
export const ACTIVITY_TARGET_TYPE = {
  USER: 'user',
  ORGANIZATION: 'organization',
  ACTION: 'action',
  REPORT: 'report'
}
