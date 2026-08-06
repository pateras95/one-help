import { mockResponse } from '@/utils/mockResponse'
import { httpClient, extractApiError } from '@/services/http'
import { normalizeApiUser } from '@/services/normalizeApiUser'
import { MOCK_USERS } from '../mocks/users.mock'
import { ROLES } from '@/constants/roles'
import { DEFAULT_LOCALE } from '@/constants/locales'
import { getUserStatus } from '@/features/admin/mocks/userStatus.storage'
import { ACCOUNT_STATUS } from '@/features/admin/utils/accountStatus'
import { getUserRoleOverride } from '../mocks/userRole.storage'
import { getUserProfileOverride } from '../mocks/userProfileOverride.storage'

/**
 * Mixed mock/API switch (docs/backend-architecture/local-development-and-integration.md
 * § Mixed mock/API strategy) — read only here. Every other feature's `*.service.js`
 * keeps calling its own mock unconditionally until that domain's own backend phase
 * ships; this is deliberately not a single global "go live" flag.
 */
const USE_API = import.meta.env.VITE_DATA_SOURCE === 'api'

/**
 * Turns a backend `ApiErrorResponse` (via an Axios error) into the same
 * `Error(code)` shape every mock service already throws, so every existing
 * `t('auth.errors.<code>')` call site keeps working unchanged. Backend codes are
 * domain-prefixed (`auth.unknownEmail`); the mock's own vocabulary never was
 * (`unknownEmail`) — stripping the `auth.` prefix is what preserves compatibility.
 * The full, unstripped code and any field errors are still attached to the thrown
 * `Error` for callers that want them (e.g. a `validation.failed` field-error map).
 *
 * @param {import('axios').AxiosError} axiosError
 * @returns {Error}
 */
function toDomainError(axiosError) {
  const apiError = extractApiError(axiosError)
  const shortCode = apiError.code.startsWith('auth.') ? apiError.code.slice('auth.'.length) : apiError.code
  const error = new Error(shortCode)
  error.code = apiError.code
  error.fieldErrors = apiError.fieldErrors
  error.status = apiError.status
  return error
}

// ---------------------------------------------------------------------------
// Real authentication/session operations (POST /auth/login, /register, /refresh,
// /logout, GET /auth/me) — used whenever VITE_DATA_SOURCE=api. See
// docs/backend-discovery/api-authentication.md for the full contract.
// ---------------------------------------------------------------------------

async function apiLogin(email, password) {
  try {
    const { data } = await httpClient.post('/auth/login', { email, password })
    return { ...data, user: normalizeApiUser(data.user) }
  } catch (err) {
    throw toDomainError(err)
  }
}

async function apiRegister(payload) {
  try {
    const { data } = await httpClient.post('/auth/register', payload)
    return { ...data, user: normalizeApiUser(data.user) }
  } catch (err) {
    throw toDomainError(err)
  }
}

async function apiLogout() {
  try {
    await httpClient.post('/auth/logout')
  } catch {
    // Logout is safe/idempotent even if the access token had already expired or
    // the refresh cookie was already gone — the caller always clears local state
    // regardless (see auth.store.js), matching the mock's own "never fails" logout.
  }
}

async function apiRefreshSession() {
  try {
    const { data } = await httpClient.post('/auth/refresh')
    return { ...data, user: normalizeApiUser(data.user) }
  } catch (err) {
    throw toDomainError(err)
  }
}

async function apiGetCurrentSession() {
  try {
    const { data } = await httpClient.get('/auth/me')
    return normalizeApiUser(data)
  } catch (err) {
    throw toDomainError(err)
  }
}

// ---------------------------------------------------------------------------
// Mock authentication (kept for VITE_DATA_SOURCE=mock / local frontend-only work).
// In-memory copy of the fixtures — registrations are added here, never to the
// imported `MOCK_USERS` array, so the source fixture stays untouched across the
// session (and a page reload starts fresh again, same as any other mock data).
// ---------------------------------------------------------------------------

let usersDb = MOCK_USERS.map((user) => ({ ...user }))

function normalizeEmail(email) {
  return (email ?? '').trim().toLowerCase()
}

/**
 * Explicit allowlist rather than "spread everything except password" — a new
 * field added to a user record later has to be deliberately added here too
 * before it's ever returned to the UI. Shared by mock-mode auth and by
 * `getUserById`/`getAllUsers` below (which stay mocked regardless of
 * `VITE_DATA_SOURCE` — see § Temporary user-directory mocks).
 */
function sanitizeUser(user) {
  const profileOverride = getUserProfileOverride(user.id)
  return {
    id: user.id,
    firstName: profileOverride?.firstName ?? user.firstName,
    lastName: profileOverride?.lastName ?? user.lastName,
    email: profileOverride?.email ?? user.email,
    role: getUserRoleOverride(user.id) ?? user.role,
    avatarInitials: user.avatarInitials,
    localePreference: user.localePreference,
    createdAt: user.createdAt,
    status: getUserStatus(user.id)
  }
}

function buildInitials(firstName, lastName) {
  const first = firstName?.trim()?.[0] ?? ''
  const last = lastName?.trim()?.[0] ?? ''
  return `${first}${last}`.toUpperCase()
}

/**
 * Resolves the same `{accessToken, expiresIn, user}` shape the real API returns
 * (`accessToken`/`expiresIn` are always `null` — mock mode has no token concept at
 * all) so the store's `hydrateSession` can stay mode-agnostic.
 */
function mockSession(user) {
  return { accessToken: null, expiresIn: null, user: sanitizeUser(user) }
}

async function mockLogin(email, password) {
  const normalizedEmail = normalizeEmail(email)
  const user = usersDb.find((candidate) => candidate.email.toLowerCase() === normalizedEmail)

  if (!user) {
    return mockResponse(null, { shouldFail: true, errorMessage: 'unknownEmail' })
  }
  if (user.password !== password) {
    return mockResponse(null, { shouldFail: true, errorMessage: 'invalidPassword' })
  }
  if (getUserStatus(user.id) === ACCOUNT_STATUS.SUSPENDED) {
    return mockResponse(null, { shouldFail: true, errorMessage: 'accountSuspended' })
  }

  return mockResponse(mockSession(user))
}

async function mockRegister(payload) {
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
  return mockResponse(mockSession(newUser))
}

/** No mock server state to invalidate — kept for interface parity with the API. */
async function mockLogout() {
  return mockResponse(true, { delay: 150 })
}

/**
 * Mock mode has no refresh-token/cookie concept at all — there is nothing to
 * restore a session from after a page reload in mock mode (a real, honest
 * limitation now that the old `onehelp.auth.session` localStorage key is gone,
 * not a bug: mock mode simply logs out on every reload).
 */
async function mockRefreshSession() {
  return mockResponse(null, { shouldFail: true, errorMessage: 'invalidSession', delay: 150 })
}

async function mockGetCurrentSession() {
  return mockResponse(null, { shouldFail: true, errorMessage: 'invalidSession', delay: 150 })
}

// ---------------------------------------------------------------------------
// Public API — same exported names as before, each branching on VITE_DATA_SOURCE.
// ---------------------------------------------------------------------------

/**
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>} `{accessToken, expiresIn, user}` — `accessToken`/
 *   `expiresIn` are always `null` in mock mode (no token concept exists there).
 */
export async function login(email, password) {
  return USE_API ? apiLogin(email, password) : mockLogin(email, password)
}

/**
 * Registers a new volunteer account (organizer registration isn't offered in this
 * phase, in either mode).
 *
 * @param {Object} payload
 * @param {string} payload.firstName
 * @param {string} payload.lastName
 * @param {string} payload.email
 * @param {string} payload.password
 * @returns {Promise<Object>} Same shape as {@link login}'s resolved value.
 */
export async function register(payload) {
  return USE_API ? apiRegister(payload) : mockRegister(payload)
}

export async function logout() {
  return USE_API ? apiLogout() : mockLogout()
}

/**
 * API mode only, meaningfully — attempts one silent refresh using the browser's
 * HttpOnly refresh cookie. Never called directly by the store's own boot-time
 * restoration in API mode; that flow goes through `httpClient`'s own interceptor.
 * Exposed here mainly so `auth.store.js` can trigger a refresh explicitly (its own
 * boot-time restoration attempt) with the same error-code contract as every other
 * function in this file.
 *
 * @returns {Promise<Object>} `{accessToken, expiresIn, user}`.
 */
export async function refreshSession() {
  return USE_API ? apiRefreshSession() : mockRefreshSession()
}

/**
 * Re-validates the current session. In API mode this is `GET /auth/me`, resolved
 * from the request's bearer token — it takes **no `userId` parameter**, unlike the
 * old mock signature, since the backend never accepts a client-asserted identity.
 *
 * @returns {Promise<Object>} Sanitized user (API: `CurrentUserResponse`).
 */
export async function getCurrentSession() {
  return USE_API ? apiGetCurrentSession() : mockGetCurrentSession()
}

// ---------------------------------------------------------------------------
// Temporary user-directory mocks — intentionally NOT switched by VITE_DATA_SOURCE.
//
// `GET /api/v1/admin/users` and admin-user profile editing are real now (the Users &
// Roles phase), and organization/organizer-application data is real too (the
// Organizations phase) — but these two functions still have real remaining
// consumers in domains that are still fully mocked: `organizerActions.service.js`,
// `AdminActionsView.vue`, `AdminReportsView.vue` (Actions/Reports backend not built
// yet). They will be switched to the real API once that phase ships, alongside
// those endpoints actually existing — not before, since pretending a nonexistent
// endpoint exists would break every one of those callers.
// ---------------------------------------------------------------------------

/**
 * @param {string} userId
 * @returns {Promise<Object|null>} Sanitized user, or `null`.
 */
export async function getUserById(userId) {
  const user = usersDb.find((candidate) => candidate.id === userId)
  return mockResponse(user ? sanitizeUser(user) : null)
}

/**
 * @returns {Promise<Array<Object>>}
 */
export async function getAllUsers() {
  return mockResponse(usersDb.map(sanitizeUser))
}
