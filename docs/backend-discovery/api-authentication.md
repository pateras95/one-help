# API Integration — Authentication

Backend implemented in `docs/reports/2026-08-06-authentication-foundation.md`; wired
up to the real frontend in `docs/reports/2026-08-06-authentication-frontend-integration.md`.
This document describes the **final, actually-implemented** frontend/backend
authentication contract — not a proposal. As of the frontend-integration phase,
`features/auth/services/auth.service.js` calls every endpoint below for real
(`VITE_DATA_SOURCE=api`); every other domain remains mocked.

---

## Implemented Endpoints

Base path `/api/v1`. All five live in `AuthController`
(`backend/src/main/java/com/onehelp/backend/auth/controller/AuthController.java`).

| Method | Path | Auth | Status (success) |
|---|---|---|---|
| POST | `/auth/register` | none | 201 |
| POST | `/auth/login` | none | 200 |
| POST | `/auth/refresh` | refresh cookie (no bearer token needed) | 200 |
| POST | `/auth/logout` | bearer access token | 204 |
| GET | `/auth/me` | bearer access token | 200 |

Swagger UI: `http://localhost:8080/swagger-ui.html` (local profile only). Raw OpenAPI
JSON: `http://localhost:8080/v3/api-docs`.

---

## Request DTOs

### `RegisterRequest` (`POST /auth/register`)

```json
{ "firstName": "Δήμητρα", "lastName": "Παπαδοπούλου", "email": "new@onehelp.local", "password": "Str0ngPass!" }
```

| Field | Validation |
|---|---|
| `firstName` | required, max 100 |
| `lastName` | required, max 100 |
| `email` | required, valid email format, max 255 |
| `password` | required, min 8 characters |

`role` is **not a field** — the backend always creates a `VOLUNTEER`, matching the
mock's own hardcoded behavior exactly.

### `LoginRequest` (`POST /auth/login`)

```json
{ "email": "volunteer@onehelp.local", "password": "Volunteer123!" }
```

`email`/`password` both required (no format validation on login — a malformed email
just fails as `auth.unknownEmail`, same as any other non-match).

### `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`

No request body. The refresh endpoint reads the `refreshToken` cookie automatically
(browser-managed); logout/me read the `Authorization: Bearer <accessToken>` header.

---

## Response DTOs

### `AuthResponse` (register / login / refresh)

```json
{
  "accessToken": "eyJhbGciOiJIUzUxMiJ9...",
  "expiresIn": 900,
  "user": {
    "id": "aca4de78-7848-47ce-9b56-a8d2975ed228",
    "firstName": "A",
    "lastName": "B",
    "email": "volunteer@onehelp.local",
    "role": "VOLUNTEER",
    "status": "ACTIVE",
    "avatarInitials": "AB",
    "localePreference": "el",
    "createdAt": "2026-08-06T12:46:29.299799Z"
  }
}
```

**There is no `refreshToken` field.** It is delivered exclusively via:

```
Set-Cookie: refreshToken=<opaque-value>; Path=/api/v1/auth; HttpOnly; SameSite=Strict[; Secure]
```

**This is a deliberate deviation from the original task brief's literal wording**,
confirmed with the product owner before implementation: the already-approved
`docs/backend-architecture/security-and-authentication.md`/`dto-catalogue.md` design
(built in the prior backend-foundation phase, with `CorsProperties.allowCredentials`
and the `refresh_tokens` schema already scaffolded specifically for this) keeps the
refresh token out of JS-reachable storage entirely.

**Cookie path corrected in the frontend-integration phase**: originally
`Path=/api/v1/auth/refresh`. A browser only ever attaches a cookie to a request whose
path starts with the cookie's own `Path` — that narrower scope meant the cookie was
never sent to `POST /api/v1/auth/logout` at all, so logout could never revoke it.
Widened to `/api/v1/auth` (covers `/refresh` and `/logout`, still excludes
`/register`/`/login`/`/me`, which never need it) — see `AuthController.REFRESH_COOKIE_PATH`.

`expiresIn` is seconds (900 = 15 minutes), not a timestamp.

**Casing note (frontend consumers only)**: `role`/`status` are serialized as the Java
enum's `name()` — uppercase (`"VOLUNTEER"`, `"ACTIVE"`). The frontend's own
`ROLES`/`ACCOUNT_STATUS` vocabulary has always been lowercase
(`constants/roles.js`/`admin/utils/accountStatus.js`) — a real, browser-discovered bug
during integration (every role check silently failed post-login) fixed by normalizing
to lowercase in `frontend/src/services/normalizeApiUser.js`, applied at every point a
backend user object enters the app. The wire format documented here is the backend's
actual, unchanged response — normalization is a frontend-only concern.

### `CurrentUserResponse` (`GET /auth/me`)

Same shape as `AuthResponse.user` above, returned as the top-level body (no wrapper).

### Error responses (all non-2xx)

```json
{
  "timestamp": "2026-08-06T12:47:03.878Z",
  "status": 409,
  "code": "auth.duplicateEmail",
  "message": "An account with this email already exists.",
  "fieldErrors": null,
  "traceId": "ab4211b2-99af-44a5-8884-c854d776931b"
}
```

`fieldErrors` is populated (422 only) as `{"password": "size must be between 8 and 2147483647"}`-style
entries, one per invalid field.

---

## Validation Rules

| Rule | Enforced where | Response |
|---|---|---|
| `firstName`/`lastName` blank or > 100 chars | `@Valid` on `RegisterRequest` | 422 `validation.failed` |
| `email` malformed or > 255 chars | `@Valid` | 422 `validation.failed` |
| `password` < 8 chars | `@Valid` | 422 `validation.failed` |
| Duplicate email (case-insensitive) | `AuthenticationServiceImpl.register` | 409 `auth.duplicateEmail` |
| Unknown email at login | `AuthenticationServiceImpl.login` | 401 `auth.unknownEmail` |
| Wrong password | `AuthenticationServiceImpl.login` | 401 `auth.invalidPassword` |
| Suspended account (login, refresh, or `/me`) | `AuthenticationServiceImpl` | 403 `auth.accountSuspended` |
| Missing/unknown/expired/reused refresh token | `AuthenticationServiceImpl.refresh` | 401 `auth.invalidSession` |
| Missing/invalid/expired access token on `/me` or `/logout` | `JwtAuthenticationFilter` + `RestAuthenticationEntryPoint` | 401 `common.unauthenticated` |

**No `username` field or duplicate-username check exists anywhere** — the domain has
never had a username concept (confirmed against `domain-models.md`'s `User` table,
the frontend's `MOCK_USERS` fixture, and `database-schema.md`'s `users` table: only
`email` is unique). The task brief's Part 2 "duplicate username" requirement does not
apply to this domain; flagged here rather than inventing a field no design document
calls for.

---

## JWT Structure

Access token only (the refresh token is opaque, not a JWT — see below).

- **Algorithm**: HS256, signing key = `JWT_SECRET` env var (≥32 chars, validated at
  startup).
- **TTL**: 15 minutes (`onehelp.jwt.access-token-ttl-minutes`, `application.yml`).
- **Claims**: `sub` (user id, UUID string), `role` (`VOLUNTEER`/`ORGANIZER`/`ADMINISTRATOR`),
  `status` (`ACTIVE`/`SUSPENDED`), `jti` (random UUID, unused for revocation — access
  tokens are not individually revocable, per ADR-1/ADR-3), `iat`, `exp` (standard JWT
  claims).
- **Never contains**: email, name, or any other PII beyond the user id.
- **Trust model**: `JwtAuthenticationFilter` verifies the signature and trusts the
  claims for the request's duration — no DB round-trip per authenticated request. This
  means a role/status change (suspension, promotion) takes up to 15 minutes to be
  reflected in an already-issued access token, **except** `GET /auth/me`, which always
  re-reads the live `users` row.

---

## Refresh Token Lifecycle

Opaque, not a JWT — a random 256-bit value (`SecureRandom`, base64url-encoded, ~43
chars). Only its SHA-256 hash is ever persisted (`refresh_tokens.token_hash`); the raw
value exists only in the cookie.

1. **Issued** on register/login: TTL 30 days (`onehelp.jwt.refresh-token-ttl-days`).
2. **Rotated** on every `POST /auth/refresh`: the presented token is marked
   `revoked_at = now()` and linked (`replaced_by_token_id`) to a freshly-issued
   replacement; the response sets a new cookie.
3. **Reuse detected**: presenting an already-revoked token (i.e. a token that was
   already rotated once — a signal of theft/replay) revokes **every** currently-active
   refresh token for that user in one statement, logs a `WARN`, and returns
   `auth.invalidSession` (401). The caller must log in again from scratch.
4. **Revoked on logout**: only the presented token, only if it belongs to the
   authenticated caller — the browser sends it automatically since the cookie's
   `Path=/api/v1/auth` covers `/auth/logout` (see the correction note above).
5. **Cookie attributes**: `HttpOnly`, `SameSite=Strict`, `Path=/api/v1/auth` (covers
   `/refresh` and `/logout` only), `Secure` (true except in local/test config, where
   plain HTTP is used — `onehelp.security.refresh-cookie-secure` in
   `application-local.yml`/`application-test.yml`). Logout's clearing `Set-Cookie`
   mirrors every one of these attributes exactly (name, path, `HttpOnly`,
   `SameSite=Strict`) plus `Max-Age=0` — browsers only overwrite/delete a cookie when
   name+path match exactly, so a mismatched clearing cookie would leave the original
   lingering.

---

## Database Tables

**No new migration — `users` and `refresh_tokens` already existed** (from the prior
backend-foundation phase) and needed zero schema changes for authentication.

### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | `CHAR(36)` | UUID, PK |
| `first_name`, `last_name` | `VARCHAR(100)` | |
| `email` | `VARCHAR(255)` | `UNIQUE`, case-insensitive via table collation |
| `password_hash` | `VARCHAR(255)` | BCrypt, never selected into any DTO |
| `role` | `VARCHAR(20)` | `CHECK IN ('VOLUNTEER','ORGANIZER','ADMINISTRATOR')`, default `VOLUNTEER` |
| `status` | `VARCHAR(20)` | `CHECK IN ('ACTIVE','SUSPENDED')`, default `ACTIVE` |
| `avatar_initials` | `VARCHAR(4)` | |
| `locale_preference` | `VARCHAR(5)` | default `el` |
| `created_at`, `updated_at` | `DATETIME(6)` | UTC |
| `version` | `BIGINT` | optimistic lock |

### `refresh_tokens`

| Column | Type | Notes |
|---|---|---|
| `id` | `CHAR(36)` | UUID, PK |
| `user_id` | `CHAR(36)` | FK → `users.id`, `ON DELETE CASCADE` |
| `token_hash` | `VARCHAR(255)` | SHA-256 hex, `UNIQUE` |
| `issued_at`, `expires_at` | `DATETIME(6)` | UTC |
| `revoked_at` | `DATETIME(6)` \| `NULL` | set on rotation, logout, or reuse detection |
| `replaced_by_token_id` | `CHAR(36)` \| `NULL` | FK → `refresh_tokens.id`, self-referential |
| `user_agent` | `VARCHAR(255)` \| `NULL` | |

**Relationships**: one user has many refresh tokens (rotation history, never
deleted — an append-only audit trail of the session chain). A refresh token
optionally points to the token that replaced it.

---

## HTTP Status Codes — Full Reference

| Status | When |
|---|---|
| 201 | Successful registration |
| 200 | Successful login / refresh / `/me` |
| 204 | Successful logout |
| 401 | `auth.unknownEmail`, `auth.invalidPassword`, `auth.invalidSession`, `common.unauthenticated` (no/invalid access token) |
| 403 | `auth.accountSuspended`, `common.forbidden` |
| 409 | `auth.duplicateEmail` |
| 422 | `validation.failed` (with `fieldErrors`) |
| 500 | `common.unexpectedError` (never leaks internal detail) |

---

## Final Frontend Implementation

### Files created

| File | Role |
|---|---|
| `frontend/src/services/authSession.js` | In-memory-only access-token holder + a small handler-registration seam, so `http.js` never imports the Pinia store directly (avoids a `http.js` → `auth.store.js` → `auth.service.js` → `http.js` circular import). |
| `frontend/src/services/normalizeApiUser.js` | Lowercases `role`/`status` on any backend user object — see the casing note under § Response DTOs. Shared by `auth.service.js` and `http.js`'s own refresh call. |

### Files modified

| File | What changed |
|---|---|
| `frontend/src/services/http.js` | `withCredentials: true`; a request interceptor attaching `Authorization: Bearer <token>`; a single-flight response interceptor that silently refreshes on an eligible 401 and retries once (see § Interceptor Behavior). `extractApiError()` added for stable error-code extraction. |
| `frontend/src/features/auth/services/auth.service.js` | Real `apiLogin`/`apiRegister`/`apiLogout`/`apiRefreshSession`/`apiGetCurrentSession` added, each used when `VITE_DATA_SOURCE=api` (the default). `getUserById`/`getAllUsers` **intentionally left on the mock** — see § Mock Functions Retained. |
| `frontend/src/features/auth/stores/auth.store.js` | Rewritten session model — see § Session Model below. |
| `frontend/vite.config.js` | Dev server pinned to port `5173` (was `8080`, colliding with the backend). |
| `frontend/.env.example` | Documents `VITE_DATA_SOURCE`. |
| `frontend/src/features/auth/views/LoginView.vue`, `RegisterView.vue` | Duplicate-submission guard; `LoginView.vue`'s demo-credentials panel replaced with a translated note in API mode (§ Demo Credentials); `RegisterView.vue` re-runs client validation on a `validation.failed` response rather than ever showing raw backend text. |
| `frontend/src/locales/{en,el}/auth.js` | Added `login.apiModeNote`, `login.sessionNoteApi`. |
| `claude.md` | Corrected the now-stale "frontend-only, no real API endpoints" framing — targeted, not a rewrite (see the phase report). |

### Files intentionally NOT removed

`frontend/src/features/auth/mocks/userRole.storage.js`,
`userProfileOverride.storage.js`, and `frontend/src/features/admin/mocks/userStatus.storage.js`
are **still load-bearing** — confirmed by grepping actual imports before touching
anything: `adminUsers.service.js`, `organizations.service.js`, and
`organizerDemotion.service.js` (all still-mocked domains) read/write them directly,
independent of `auth.service.js`. Only `auth.service.js`'s own internal mock-mode
`sanitizeUser()` reads them now (previously also its real-mode path) — the storage
modules themselves stay until Organizations/Users&Roles have their own backend
phases.

### Mock Functions Retained

`getUserById`/`getAllUsers` remain on the mock `usersDb`/`sanitizeUser` path
**regardless of `VITE_DATA_SOURCE`** — the backend has no
`GET /api/v1/users/{id}`/`GET /api/v1/admin/users` equivalent yet. Real callers
(`organizerActions.service.js`, `adminUsers.service.js`, `AdminReportsView.vue`,
`AdminActionsView.vue`, `AdminOrganizationsView.vue`, `organizationIntegrity.js`) keep
working unmodified. **Known consequence**: a volunteer registered through the real API
does not appear in these two mock functions' results (they only see the 3 fixture
users) until the future Users & Roles backend phase implements the real endpoints and
switches these two functions over.

### Session Model (`auth.store.js`)

State: `currentUser`, `accessToken`, `expiresIn`, `isInitialized`, `loading`, `error`.
The access token exists only in this store's reactive state, mirrored into
`authSession.js` for the HTTP layer — never `localStorage`/`sessionStorage`/IndexedDB/
a frontend-created cookie. The old `onehelp.auth.session` localStorage key is gone
entirely (not just unused — no code path writes or reads it anymore).

`login()`/`register()`/the interceptor's own refresh all funnel through one
`hydrateSession({accessToken, expiresIn, user})` / `clearSession()` pair, so there is
exactly one place "the session changed" happens — no risk of a stale field from a
previous user surviving a switch.

### Session Restoration Strategy

`initializeSession()` (called once from `main.js` at boot, memoized, also awaited by
the router guard) calls `POST /auth/refresh` **directly** — not `GET /auth/me` first.
Rationale: there is no in-memory access token yet on a fresh page load, so calling
`/auth/me` first would be a guaranteed, pointless 401 before the refresh cookie ever
gets a chance; going straight to `/refresh` is strictly fewer requests and was
confirmed via the browser's own network panel during manual verification (exactly one
`/auth/refresh` call per load, `200 OK`, no wasted round trip). A missing/expired/
invalid cookie resolves to `auth.invalidSession`/`common.unauthenticated`, caught
silently (`clearSession()`, no error snackbar) — the expected state for most page
loads, not a failure to report.

### Interceptor Behavior (`http.js`)

Single-flight: concurrent 401s across multiple requests share one in-flight
`refreshPromise` rather than each starting their own. `/auth/login`, `/auth/register`,
and `/auth/refresh` itself are exempt (never trigger a refresh-and-retry on their own
401/403). Each original request is retried at most once (`config._retriedAfterRefresh`
flag). 403 never triggers this path at all (checked before the exemption list). On
refresh success: new token stored, `onSessionRefreshed(user, expiresIn)` fires once,
queued requests retry with the new token. On refresh failure: `onSessionExpired()`
fires once (not once per queued request — only the promise's own `.catch` runs it),
clearing the session; the refresh's own error (not the original request's stale-token
401) is what every queued caller receives, since it's the more actionable of the two.

### Demo Credentials

`LoginView.vue` shows the fixture demo-account buttons only when
`VITE_DATA_SOURCE !== 'api'`. In API mode it shows a translated note
(`auth.login.apiModeNote`) directing the visitor to register instead — no hardcoded
backend seed users were created to keep the old helper working (explicitly out of
scope; see Constraints).

### Manual Browser Testing — What Was Verified

Performed via real Chrome browser automation (not curl) against the running
`npm run dev` (port 5173) + `./mvnw spring-boot:run -Dspring-boot.run.profiles=local`
(port 8080) + local MySQL:

- Register a real volunteer through the actual form → 201, `AuthResponse` correct,
  `Set-Cookie` present with `Path=/api/v1/auth`, `HttpOnly`, `SameSite=Strict`.
- **Found and fixed live**: the role/status casing bug (§ Response DTOs) — without the
  fix, every `hasRole()` check silently failed post-login/register, redirecting a
  freshly-registered volunteer to `/unauthorized` instead of `/my-actions`.
- Confirmed in MySQL directly: the registered user row, and refresh-token rows storing
  only a SHA-256 hash (never the raw value).
- Hard navigation (fresh JS context, no in-memory token) to a `VOLUNTEER`-only route
  restored the session via the refresh cookie alone — exactly one `/auth/refresh`
  network call, `200`, no console errors.
- Logout → 204, `Set-Cookie` clearing cookie present, confirmed in MySQL that the
  active refresh-token row's `revoked_at` was set, confirmed `document.cookie` never
  exposed `refreshToken` (HttpOnly working), confirmed no `onehelp.auth.session` or
  access token in `localStorage`/`sessionStorage`.
- Hard navigation after logout → correctly redirected to `/login?redirect=/my-actions`
  (guest state, redirect query preserved), demo-credentials panel correctly replaced
  by the API-mode note.

### Manual Browser Testing — Not Completed, Needs User Verification

A Chrome extension in this testing environment intermittently intercepted input
focus after clicking a password field (`"Cannot access a chrome-extension:// URL of
different extension"`), blocking further automated interaction mid-session. This is
an environment/extension issue, not an application bug — the wrong-password and
duplicate-email flows were verified another way (direct backend HTTP calls in the
prior phase confirming `auth.invalidPassword`/`auth.duplicateEmail` are returned
correctly, plus a code-level trace of `LoginView.vue`/`RegisterView.vue`'s existing
`KNOWN_ERROR_CODES` translation logic), but **not visually confirmed rendering
correctly in a live browser**. Recommend the user manually confirm:

- Logging in with a wrong password shows the translated "Incorrect password" message.
- Registering a duplicate email shows the translated "account already exists" message.
- `document.cookie` truly never exposes `refreshToken` on a machine/profile without
  the interfering extension (already confirmed once in this session, but worth a
  second look given the tooling hiccup).

## Known Limitations

- **No seed/demo data.** No backend-side fixture accounts exist — every login must go
  through a real, self-registered volunteer.
- **`getUserById`/`getAllUsers` have no real backend endpoint yet** — see § Mock
  Functions Retained.
- **No rate limiting.** Login/register accept unlimited attempts — explicitly deferred
  per `security-and-authentication.md`'s own "later hardening" list.
- **Access-token staleness window.** A role change or suspension takes up to 15
  minutes to reflect in an *already-issued* access token for any endpoint except
  `/auth/me` (which always re-reads live state) — an accepted, documented trade-off
  (ADR-3), not a bug.
- **Mock-mode session no longer survives a reload.** Removing the
  `onehelp.auth.session` localStorage key (required — the backend is now the source of
  truth) means `VITE_DATA_SOURCE=mock` has no cookie to restore a session from either;
  mock-mode auth now honestly behaves like "logged in until the next reload," not a
  regression so much as mock mode no longer pretending to have a persistence mechanism
  it was never going to keep.
