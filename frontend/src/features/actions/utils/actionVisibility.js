import { PUBLIC_VISIBLE_STATUSES } from '@/features/organizer/utils/organizerActionStatus'
import { ACTION_MODERATION_STATUS } from '@/features/admin/utils/actionModerationStatus'
import { ORGANIZATION_STATUS } from '@/features/admin/utils/organizationStatus'
import { getModerationRecord } from '@/features/admin/mocks/actionModeration.storage'
import { getOrganizationStatus } from '@/features/admin/mocks/organizations.storage'

/**
 * The single, reusable public-visibility policy for an action — every
 * screen that can show an action to the public (Actions list/details,
 * the Map, participation, QR check-in) must go through this instead of
 * re-deriving its own rule, so the three moderation layers (organizer
 * lifecycle, admin action-moderation, organization approval) can never
 * drift out of sync between views.
 *
 * An action is publicly visible only when ALL of the following hold:
 * - its organizer lifecycle status permits public visibility
 *   (`published`/`closed` — same as before this feature existed)
 * - its admin moderation status is `approved`
 * - its owning organization's status is `approved`
 *
 * Fails closed: a missing organization record (shouldn't happen given
 * the seeded fixtures, but defensive anyway) counts as not visible,
 * same as a missing/rejected/suspended one.
 *
 * @param {Object} action - A merged action record (organizer lifecycle
 *   fields present) — does not need moderation/organization fields
 *   pre-merged onto it; this function looks those up itself.
 * @returns {boolean}
 */
export function isActionPubliclyVisible(action) {
  if (!action) return false
  if (!PUBLIC_VISIBLE_STATUSES.includes(action.organizerStatus)) return false

  const moderation = getModerationRecord(action.id)
  if (moderation.status !== ACTION_MODERATION_STATUS.APPROVED) return false

  const organizationStatus = getOrganizationStatus(action.organizerId)
  if (organizationStatus !== ORGANIZATION_STATUS.APPROVED) return false

  return true
}
