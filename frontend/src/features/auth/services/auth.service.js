import { mockResponse } from '@/utils/mockResponse'
import { MOCK_USERS } from '../mocks/users.mock'
import { ROLES } from '@/constants/roles'
import { DEFAULT_LOCALE } from '@/constants/locales'

/**
 * In-memory copy of the fixtures — registrations are added here, never to
 * the imported `MOCK_USERS` array, so the source fixture stays untouched
 * across the session (and a page reload starts fresh again, same as any
 * other mock data in this app).
 *
 * NOTE for a future real backend: everything below this line is the part
 * that would be replaced by real HTTP calls — the exported function
 * signatures are designed to stay the same.
 */
let usersDb = MOCK_USERS.map((user) => ({ ...user }))

function normalizeEmail(email) {
  return (email ?? '').trim().toLowerCase()
}

/**
 * Explicit allowlist rather than "spread everything except password" —
 * a new field added to a user record later has to be deliberately added
 * here too before it's ever returned to the UI.
 */
function sanitizeUser(user) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    avatarInitials: user.avatarInitials,
    localePreference: user.localePreference,
    createdAt: user.createdAt
  }
}

function buildInitials(firstName, lastName) {
  const first = firstName?.trim()?.[0] ?? ''
  const last = lastName?.trim()?.[0] ?? ''
  return `${first}${last}`.toUpperCase()
}

/**
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>} Sanitized user (never includes `password`).
 */
export async function login(email, password) {
  const normalizedEmail = normalizeEmail(email)
  const user = usersDb.find((candidate) => candidate.email.toLowerCase() === normalizedEmail)

  if (!user) {
    return mockResponse(null, { shouldFail: true, errorMessage: 'unknownEmail' })
  }
  if (user.password !== password) {
    return mockResponse(null, { shouldFail: true, errorMessage: 'invalidPassword' })
  }

  return mockResponse(sanitizeUser(user))
}

/**
 * Registers a new volunteer account (organizer registration isn't offered
 * in this phase).
 *
 * @param {Object} payload
 * @param {string} payload.firstName
 * @param {string} payload.lastName
 * @param {string} payload.email
 * @param {string} payload.password
 * @returns {Promise<Object>} Sanitized user.
 */
export async function register(payload) {
  const normalizedEmail = normalizeEmail(payload.email)
  const exists = usersDb.some((candidate) => candidate.email.toLowerCase() === normalizedEmail)

  if (exists) {
    return mockResponse(null, { shouldFail: true, errorMessage: 'duplicateEmail' })
  }

  const newUser = {
    id: `user-${crypto.randomUUID()}`,
    firstName: payload.firstName.trim(),
    lastName: payload.lastName.trim(),
    email: normalizedEmail,
    password: payload.password,
    role: ROLES.VOLUNTEER,
    avatarInitials: buildInitials(payload.firstName, payload.lastName),
    localePreference: DEFAULT_LOCALE,
    createdAt: new Date().toISOString()
  }

  usersDb = [...usersDb, newUser]
  return mockResponse(sanitizeUser(newUser))
}

/** No mock server state to invalidate — kept for interface parity with a real backend. */
export async function logout() {
  return mockResponse(true, { delay: 150 })
}

/**
 * Read-only identity lookup for another feature that needs to resolve a
 * userId to safe, displayable fields (e.g. the organizer participant
 * list) — never a password. Resolves `null` (not a rejection) when the
 * id doesn't exist, mirroring `getActionById`'s "not found isn't an
 * error" convention.
 *
 * @param {string} userId
 * @returns {Promise<Object|null>} Sanitized user, or `null`.
 */
export async function getUserById(userId) {
  const user = usersDb.find((candidate) => candidate.id === userId)
  return mockResponse(user ? sanitizeUser(user) : null)
}

/**
 * Re-validates a persisted session by looking up the user id — mirrors
 * what a real app would do with a session cookie/token on boot.
 *
 * @param {string} userId
 * @returns {Promise<Object>} Sanitized user.
 */
export async function getCurrentSession(userId) {
  const user = usersDb.find((candidate) => candidate.id === userId)

  if (!user) {
    return mockResponse(null, { shouldFail: true, errorMessage: 'invalidSession', delay: 150 })
  }

  return mockResponse(sanitizeUser(user), { delay: 150 })
}
