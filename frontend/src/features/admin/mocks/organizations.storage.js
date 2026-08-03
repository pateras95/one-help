import { MOCK_ORGANIZATIONS } from './organizations.mock'
import { ORGANIZATION_STATUS } from '../utils/organizationStatus'

const STORAGE_KEY = 'onehelp.admin.organizations'

function isValidRecord(record) {
  return Boolean(
    record &&
    typeof record.id === 'string' && record.id &&
    typeof record.organizerUserId === 'string' && record.organizerUserId &&
    Object.values(ORGANIZATION_STATUS).includes(record.status) &&
    typeof record.name === 'object' && record.name &&
    typeof record.name.el === 'string' && typeof record.name.en === 'string' &&
    // Both optional, but if present must be the right shape — covers
    // records submitted through the organizer application form.
    (record.categories === undefined || Array.isArray(record.categories)) &&
    (record.organizationType === undefined || typeof record.organizationType === 'string')
  )
}

/**
 * Reads and validates persisted organization edits (admin approve/
 * reject/suspend/restore decisions). Malformed storage is repaired
 * rather than just ignored in memory — same "repair on read" approach
 * used by every other mock store in this app.
 *
 * @returns {Array<Object>}
 */
export function readOrganizations() {
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
    writeOrganizations([])
    return []
  }

  if (!Array.isArray(parsed)) {
    writeOrganizations([])
    return []
  }

  const valid = parsed.filter(isValidRecord)
  if (valid.length !== parsed.length) {
    writeOrganizations(valid)
  }
  return valid
}

/** @param {Array<Object>} records */
export function writeOrganizations(records) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    // Ignore write failures — persistence is a nice-to-have, not required
    // for the app to function (same approach as the other mock stores).
  }
}

/**
 * Upserts a single organization record by id — an existing id replaces
 * its record, a new one is appended.
 *
 * @param {Object} record
 */
export function upsertOrganization(record) {
  const records = readOrganizations()
  const index = records.findIndex((existing) => existing.id === record.id)
  if (index === -1) {
    records.push(record)
  } else {
    records[index] = record
  }
  writeOrganizations(records)
  return record
}

/**
 * The canonical "all organizations" list: the immutable base fixture
 * with any persisted admin decision applied on top (by id), plus any
 * wholly new organizations (real user applications submitted through
 * "Become an organizer") appended. Mirrors `organizerActions.storage.js`'s
 * `getMergedActions()` pattern exactly.
 *
 * @returns {Array<Object>}
 */
export function getMergedOrganizations() {
  const stored = readOrganizations()
  const overrides = new Map(stored.map((record) => [record.id, record]))
  const baseIds = new Set(MOCK_ORGANIZATIONS.map((org) => org.id))

  const merged = MOCK_ORGANIZATIONS.map((org) => {
    const override = overrides.get(org.id)
    return override ? { ...org, ...override } : org
  })

  const created = stored.filter((record) => !baseIds.has(record.id))

  return [...merged, ...created]
}

/**
 * @param {string} organizerUserId
 * @returns {Object|null}
 */
export function getOrganizationByOrganizerId(organizerUserId) {
  return getMergedOrganizations().find((org) => org.organizerUserId === organizerUserId) ?? null
}

/**
 * An organizer's organization status, or `null` if they have no
 * organization record at all (fails closed for visibility checks — see
 * `actionVisibility.js`).
 *
 * @param {string} organizerUserId
 * @returns {string|null}
 */
export function getOrganizationStatus(organizerUserId) {
  return getOrganizationByOrganizerId(organizerUserId)?.status ?? null
}
