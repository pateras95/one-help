import { mockResponse } from '@/utils/mockResponse'
import { ROLES } from '@/constants/roles'
import { getOrganizationByOrganizerId, markOrganizationDeleted } from '@/features/admin/mocks/organizations.storage'
import { getMergedActions, deleteActionsByIds } from '@/features/organizer/mocks/organizerActions.storage'
import { deleteParticipationsByActionIds } from '@/features/participation/mocks/participations.storage'
import { deleteAttendanceByActionIds } from '@/features/attendance/mocks/attendance.storage'
import { deleteQrSessionsByActionIds } from '@/features/attendance/mocks/qrSession.storage'
import { deleteReportsByActionIds } from '@/features/admin/mocks/reports.storage'
import { deleteModerationRecordsByActionIds } from '@/features/admin/mocks/actionModeration.storage'
import { deleteMembershipByOrganizationId } from '../mocks/organizationMembership.storage'
import { setUserRoleOverride } from '@/features/auth/mocks/userRole.storage'
import { logActivity } from '@/features/admin/mocks/activityLog.storage'
import { ACTIVITY_ACTION_TYPE, ACTIVITY_TARGET_TYPE } from '@/features/admin/utils/activityLogTypes'
import { APPLICATION_ERROR } from '../utils/applicationErrors'

/**
 * Permanently demotes an organizer back to a volunteer, deleting their
 * organization and every record that depends on it. Used identically by
 * an admin's "Remove organizer and organization" action and by an
 * organizer's own self-service "Become a volunteer again" — this is the
 * single, central place that cascade runs, so neither caller duplicates
 * the cleanup logic.
 *
 * Runs as one logical (synchronous, in-memory) mock transaction: every
 * step below is scoped strictly to the ids collected for this one
 * organizer, so data belonging to any other organization/organizer is
 * never touched. Never deletes the user account itself — only reverts
 * its role and removes the organization-owned data.
 *
 * @param {string} userId - The organizer being demoted.
 * @param {string} initiatedBy - Who triggered this: the same `userId`
 *   for self-service, or an administrator's id. An admin-initiated
 *   demotion is recorded in the activity log; a self-demotion is not.
 * @returns {Promise<{organizationName: {el: string, en: string}, actionsRemoved: number}>}
 */
export async function demoteOrganizerToVolunteer(userId, initiatedBy) {
  if (!userId || !initiatedBy) {
    return mockResponse(null, { shouldFail: true, errorMessage: APPLICATION_ERROR.INVALID_REQUEST })
  }

  const organization = getOrganizationByOrganizerId(userId)
  if (!organization) {
    return mockResponse(null, { shouldFail: true, errorMessage: APPLICATION_ERROR.NOT_ORGANIZER })
  }

  const organizationName = organization.name
  const actionIds = getMergedActions()
    .filter((action) => action.organizerId === userId)
    .map((action) => action.id)

  deleteParticipationsByActionIds(actionIds)
  deleteAttendanceByActionIds(actionIds)
  deleteQrSessionsByActionIds(actionIds)
  deleteReportsByActionIds(actionIds)
  deleteModerationRecordsByActionIds(actionIds)
  deleteActionsByIds(actionIds)

  markOrganizationDeleted(organization.id)
  deleteMembershipByOrganizationId(organization.id)
  setUserRoleOverride(userId, ROLES.VOLUNTEER, initiatedBy)

  if (initiatedBy !== userId) {
    logActivity({
      adminUserId: initiatedBy,
      actionType: ACTIVITY_ACTION_TYPE.ORGANIZER_DEMOTED,
      targetType: ACTIVITY_TARGET_TYPE.USER,
      targetId: userId,
      metadata: { name: organizationName.en, actionsRemoved: actionIds.length }
    })
  }

  return mockResponse({ organizationName, actionsRemoved: actionIds.length })
}
