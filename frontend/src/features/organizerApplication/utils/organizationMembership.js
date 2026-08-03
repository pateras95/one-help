import { ORGANIZATION_STATUS } from '@/features/admin/utils/organizationStatus'

/**
 * A membership's role within an organization. Only `OWNER` has a real
 * flow in this MVP (one owner per organization, granted automatically
 * on admin approval) — `MANAGER` is reserved for a future multi-manager
 * feature and must not be exposed in any UI yet, same convention as
 * `ROLES.MODERATOR` being reserved-but-unexposed.
 */
export const MEMBERSHIP_ROLE = {
  OWNER: 'owner',
  MANAGER: 'manager'
}

/**
 * A membership's own standing — deliberately reuses `ORGANIZATION_STATUS`
 * rather than introducing a second, incompatible approval-status
 * vocabulary. In this MVP a membership's status always mirrors its
 * organization's status (approved ↔ suspended), which is exactly what
 * lets a future multi-manager feature give one member a different
 * standing than another without changing this shared vocabulary.
 */
export const MEMBERSHIP_STATUS = ORGANIZATION_STATUS
