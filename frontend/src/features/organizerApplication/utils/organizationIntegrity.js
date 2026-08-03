import { readMemberships, writeMemberships } from '../mocks/organizationMembership.storage'
import { getMergedOrganizations } from '@/features/admin/mocks/organizations.storage'
import { getAllUsers } from '@/features/auth/services/auth.service'
import { ORGANIZATION_STATUS } from '@/features/admin/utils/organizationStatus'
import { ROLES } from '@/constants/roles'

/**
 * Keeps only the earliest-created record per key, dropping the rest.
 * @param {Array<Object>} records
 * @param {(record: Object) => string} keyOf
 */
function keepEarliestByKey(records, keyOf) {
  const earliestByKey = new Map()
  for (const record of records) {
    const key = keyOf(record)
    const existing = earliestByKey.get(key)
    if (!existing || new Date(record.createdAt) < new Date(existing.createdAt)) {
      earliestByKey.set(key, record)
    }
  }
  return [...earliestByKey.values()]
}

/**
 * A one-time, development-only repair pass enforcing the permanent
 * 1:1 organizer-organization rule against whatever this browser's
 * localStorage already contains (e.g. left over from testing before
 * this rule was enforced at write time). Never auto-assigns or
 * auto-deletes an organization/organizer pairing it can't resolve —
 * unrecoverable issues are only reported (via `console.warn`), never
 * silently "fixed" by guessing.
 *
 * Reserved `manager` memberships are already dropped for free by
 * `organizationMembership.storage.js`'s own repair-on-read validation
 * (its `MEMBERSHIP_ROLE` no longer includes `manager` at all), so this
 * pass only needs to handle duplicate ownership records and reporting.
 */
export async function repairOrganizationIntegrity() {
  const memberships = readMemberships()

  const oneRowPerOrganization = keepEarliestByKey(memberships, (record) => record.organizationId)
  const oneRowPerUser = keepEarliestByKey(oneRowPerOrganization, (record) => record.userId)

  if (oneRowPerUser.length !== memberships.length) {
    writeMemberships(oneRowPerUser)
  }

  const [users, organizations] = await Promise.all([getAllUsers(), getMergedOrganizations()])

  const organizerUsersWithNoOrganization = users.filter(
    (user) => user.role === ROLES.ORGANIZER && !organizations.some((org) => org.organizerUserId === user.id)
  )
  const approvedOrganizationsWithNoOrganizer = organizations.filter(
    (org) => org.status === ORGANIZATION_STATUS.APPROVED && !users.some((user) => user.id === org.organizerUserId)
  )

  if (organizerUsersWithNoOrganization.length) {
    console.warn(
      '[organizationIntegrity] organizer-role user(s) with no resolvable organization:',
      organizerUsersWithNoOrganization.map((user) => user.id)
    )
  }
  if (approvedOrganizationsWithNoOrganizer.length) {
    console.warn(
      '[organizationIntegrity] approved organization(s) with no resolvable organizer:',
      approvedOrganizationsWithNoOrganizer.map((org) => org.id)
    )
  }
}
