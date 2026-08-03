import { mockResponse } from '@/utils/mockResponse'
import { getAllUsers, getUserById } from '@/features/auth/services/auth.service'
import { setUserStatus } from '../mocks/userStatus.storage'
import { logActivity } from '../mocks/activityLog.storage'
import { ACCOUNT_STATUS } from '../utils/accountStatus'
import { ACTIVITY_ACTION_TYPE, ACTIVITY_TARGET_TYPE } from '../utils/activityLogTypes'
import { ADMIN_ERROR } from '../utils/adminErrors'

/**
 * All user accounts, newest first — the admin user-management list.
 * Never includes passwords (relies on `auth.service.js`'s own sanitizing).
 *
 * @returns {Promise<Array<Object>>}
 */
export async function getUsers() {
  const users = await getAllUsers()
  return mockResponse([...users].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
}

/**
 * @param {string} adminUserId - The admin performing the action (for the self-suspend guard and activity log).
 * @param {string} targetUserId
 * @returns {Promise<Object>}
 */
export async function suspendUser(adminUserId, targetUserId) {
  if (!adminUserId || !targetUserId) {
    return mockResponse(null, { shouldFail: true, errorMessage: ADMIN_ERROR.INVALID_REQUEST })
  }
  if (adminUserId === targetUserId) {
    return mockResponse(null, { shouldFail: true, errorMessage: ADMIN_ERROR.CANNOT_SUSPEND_SELF })
  }

  const target = await getUserById(targetUserId)
  if (!target) {
    return mockResponse(null, { shouldFail: true, errorMessage: ADMIN_ERROR.NOT_FOUND })
  }

  setUserStatus(targetUserId, ACCOUNT_STATUS.SUSPENDED, adminUserId)
  logActivity({
    adminUserId,
    actionType: ACTIVITY_ACTION_TYPE.USER_SUSPENDED,
    targetType: ACTIVITY_TARGET_TYPE.USER,
    targetId: targetUserId,
    metadata: { email: target.email }
  })

  const updated = await getUserById(targetUserId)
  return mockResponse(updated)
}

/**
 * @param {string} adminUserId
 * @param {string} targetUserId
 * @returns {Promise<Object>}
 */
export async function reactivateUser(adminUserId, targetUserId) {
  if (!adminUserId || !targetUserId) {
    return mockResponse(null, { shouldFail: true, errorMessage: ADMIN_ERROR.INVALID_REQUEST })
  }

  const target = await getUserById(targetUserId)
  if (!target) {
    return mockResponse(null, { shouldFail: true, errorMessage: ADMIN_ERROR.NOT_FOUND })
  }

  setUserStatus(targetUserId, ACCOUNT_STATUS.ACTIVE, adminUserId)
  logActivity({
    adminUserId,
    actionType: ACTIVITY_ACTION_TYPE.USER_REACTIVATED,
    targetType: ACTIVITY_TARGET_TYPE.USER,
    targetId: targetUserId,
    metadata: { email: target.email }
  })

  const updated = await getUserById(targetUserId)
  return mockResponse(updated)
}
