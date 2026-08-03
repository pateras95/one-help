import { MEMBERSHIP_ROLE, MEMBERSHIP_STATUS } from '../utils/organizationMembership'

const STORAGE_KEY = 'onehelp.organizerApplication.memberships'

function isValidRecord(record) {
  return Boolean(
    record &&
    typeof record.id === 'string' && record.id &&
    typeof record.organizationId === 'string' && record.organizationId &&
    typeof record.userId === 'string' && record.userId &&
    Object.values(MEMBERSHIP_ROLE).includes(record.membershipRole) &&
    Object.values(MEMBERSHIP_STATUS).includes(record.status) &&
    typeof record.createdAt === 'string' && record.createdAt
  )
}

/**
 * Reads and validates persisted organization memberships. Malformed
 * storage is repaired rather than just ignored in memory — same
 * "repair on read" approach used by every other mock store in this app.
 *
 * Deliberately does NOT embed full user or organization objects — only
 * ids — so this stays a thin relationship record, not a duplicate
 * source of truth for identity/organization data.
 *
 * @returns {Array<Object>}
 */
export function readMemberships() {
  let raw
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return []
  }

  if (!raw) return []

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    writeMemberships([])
    return []
  }

  if (!Array.isArray(parsed)) {
    writeMemberships([])
    return []
  }

  const valid = parsed.filter(isValidRecord)
  if (valid.length !== parsed.length) {
    writeMemberships(valid)
  }
  return valid
}

/** @param {Array<Object>} records */
export function writeMemberships(records) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    // Ignore write failures — persistence is a nice-to-have, not required
    // for the app to function (same approach as the other mock stores).
  }
}

/**
 * @param {string} organizationId
 * @returns {Object|null}
 */
export function getMembershipByOrganizationId(organizationId) {
  return readMemberships().find((record) => record.organizationId === organizationId) ?? null
}

/**
 * @param {string} userId
 * @returns {Object|null}
 */
export function getMembershipByUserId(userId) {
  return readMemberships().find((record) => record.userId === userId) ?? null
}

/**
 * Creates the owner membership for a newly approved organization. A
 * no-op safeguard if one somehow already exists for this organization
 * (upserts rather than duplicating).
 *
 * @param {string} organizationId
 * @param {string} userId
 * @returns {Object}
 */
export function createOwnerMembership(organizationId, userId) {
  const records = readMemberships()
  const index = records.findIndex((record) => record.organizationId === organizationId)
  const now = new Date().toISOString()
  const entry = index === -1
    ? {
        id: crypto.randomUUID(),
        organizationId,
        userId,
        membershipRole: MEMBERSHIP_ROLE.OWNER,
        status: MEMBERSHIP_STATUS.APPROVED,
        createdAt: now,
        approvedAt: now
      }
    : { ...records[index], status: MEMBERSHIP_STATUS.APPROVED, approvedAt: now }

  if (index === -1) records.push(entry)
  else records[index] = entry

  writeMemberships(records)
  return entry
}

/**
 * Mirrors an organization's status onto its membership record(s) — used
 * when an organization is suspended/restored, so a future multi-manager
 * feature can already tell "this specific membership is suspended"
 * without re-deriving it from the organization every time.
 *
 * @param {string} organizationId
 * @param {string} status - One of `MEMBERSHIP_STATUS`.
 */
export function setMembershipStatusForOrganization(organizationId, status) {
  const records = readMemberships()
  const index = records.findIndex((record) => record.organizationId === organizationId)
  if (index === -1) return null
  records[index] = { ...records[index], status }
  writeMemberships(records)
  return records[index]
}
