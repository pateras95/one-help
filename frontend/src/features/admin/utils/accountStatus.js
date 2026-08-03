/**
 * A user account's standing, independent of their role. Suspension is an
 * admin moderation action — distinct from participation/organizer
 * lifecycle statuses, which describe a specific action, not the account
 * itself.
 */
export const ACCOUNT_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended'
}
