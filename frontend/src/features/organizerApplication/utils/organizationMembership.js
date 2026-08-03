import { ORGANIZATION_STATUS } from '@/features/admin/utils/organizationStatus'

/**
 * A membership's role within an organization. `OWNER` is the only role
 * that will ever exist — one organizer owns exactly one organization,
 * and one organization has exactly one organizer, permanently. This
 * project will never support additional managers, invitations, or
 * organization teams (see CLAUDE.md's "Permanent organization ownership
 * rule").
 */
export const MEMBERSHIP_ROLE = {
  OWNER: 'owner'
}

/**
 * A membership's own standing — deliberately reuses `ORGANIZATION_STATUS`
 * rather than introducing a second, incompatible approval-status
 * vocabulary. A membership's status always mirrors its organization's
 * status (approved ↔ suspended).
 */
export const MEMBERSHIP_STATUS = ORGANIZATION_STATUS
