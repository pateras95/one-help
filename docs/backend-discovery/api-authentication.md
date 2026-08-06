# API Integration — Authentication

Implemented in `docs/reports/2026-08-06-authentication-foundation.md`. This document
is the frontend-integration reference for that work: exact contracts, DB shape, and
the concrete migration steps for replacing the mocked authentication feature.

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
Set-Cookie: refreshToken=<opaque-value>; Path=/api/v1/auth/refresh; HttpOnly; SameSite=Strict[; Secure]
```

**This is a deliberate deviation from the task brief's literal wording**, confirmed
with the product owner before implementation: the already-approved
`docs/backend-architecture/security-and-authentication.md`/`dto-catalogue.md` design
(built in the prior backend-foundation phase, with `CorsProperties.allowCredentials`
and the `refresh_tokens` schema already scaffolded specifically for this) keeps the
refresh token out of JS-reachable storage entirely. Frontend implication below.

`expiresIn` is seconds (900 = 15 minutes), not a timestamp.

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
   authenticated caller.
5. **Cookie attributes**: `HttpOnly`, `SameSite=Strict`, `Path=/api/v1/auth/refresh`
   (never sent to any other endpoint), `Secure` (true except in local/test config,
   where plain HTTP is used).

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

## Frontend Files That Currently Use Mocks

| File | Role |
|---|---|
| `frontend/src/features/auth/services/auth.service.js` | The entire mock implementation — `login`, `register`, `logout`, `getCurrentSession`, `getUserById`, `getAllUsers`. **This file is what gets replaced.** |
| `frontend/src/features/auth/mocks/users.mock.js` | The 3 fixture accounts + `DEMO_CREDENTIALS` (shown on the login screen). Stays as a dev convenience or is removed — the backend has no equivalent seed data yet. |
| `frontend/src/features/auth/mocks/userRole.storage.js`, `userProfileOverride.storage.js` | localStorage overlays simulating role/profile mutation. No longer needed once `role`/profile fields live directly on the real `users` row. |
| `frontend/src/features/auth/stores/auth.store.js` | Calls `auth.service.js`'s functions and persists `{userId, issuedAt}` to `localStorage`. **Function signatures should stay the same** (per `frontend-backend-replacement-map.md`'s explicit goal), but the persisted-session shape must change (see below). |
| `frontend/src/features/admin/mocks/userStatus.storage.js` | Separate mock overlay for account status — the real `users.status` column already merges this into `CurrentUserResponse.status`, so this overlay disappears entirely, not just its auth-facing read path. |

## Frontend Files That Must Later Call the Real Backend

These don't call `auth.service.js` for login/session directly, but consume its
**read** functions (`getUserById`, `getAllUsers`) and must be repointed once those
functions call the real `GET /api/v1/users/{id}` / `GET /api/v1/admin/users`
equivalents (not built in this phase — only auth's own five endpoints exist so far):

- `frontend/src/features/organizer/services/organizerActions.service.js` (`getUserById`)
- `frontend/src/features/admin/views/AdminReportsView.vue` (`getUserById`, direct import)
- `frontend/src/features/admin/services/adminUsers.service.js` (`getAllUsers`, `getUserById`)
- `frontend/src/features/admin/views/AdminActionsView.vue`,
  `AdminOrganizationsView.vue` (`getAllUsers`, direct import)
- `frontend/src/features/organizerApplication/utils/organizationIntegrity.js` (`getAllUsers`)

Every other file that reads the current user goes through `useAuthStore()`
(`currentUser`, `isAuthenticated`, `hasRole`) — none of those call sites need to
change; only `auth.store.js`'s internals do. Consumers, per `service-contracts.md`:
`components/layout/AppNavigation.vue`, `AppBottomNavigation.vue`,
`features/actions/components/{ActionCard,ReportActionCard}.vue`, every `admin*.store.js`,
`features/auth/{components/AccountMenu.vue,views/AccountView.vue,views/LoginView.vue,views/RegisterView.vue}`,
`features/attendance/{stores/attendance.store.js,views/CheckInView.vue}`,
`features/organizerApplication/{stores/organizationApplication.store.js,views/BecomeOrganizerView.vue}`,
`features/organizer/{stores/organizer.store.js,views/OrganizerOrganizationView.vue}`,
`features/participation/{components/ParticipationPanel.vue,stores/participation.store.js}`,
`main.js`, `router/authGuard.js`.

---

## Migration Steps for Replacing the Authentication Mocks

1. **Set `VITE_API_BASE_URL`** in `frontend/.env` to `http://localhost:8080/api/v1`
   (already the documented default).
2. **Enable credentialed requests**: `frontend/src/services/http.js`'s `httpClient`
   currently has no `withCredentials`. It must be set to `true` — the refresh cookie
   will not be sent or accepted cross-origin otherwise (frontend and backend are
   different origins in local dev: `:8080`-or-`:5173` vs `:8080`; see the port
   conflict already flagged in `backend/README_LOCAL.md`).
3. **Rewrite `auth.service.js`** to call the real endpoints instead of the in-memory
   `usersDb`, **keeping the same exported function names** so `auth.store.js` and
   every other consumer needs no change to *how* they call it:
   - `login(email, password)` → `POST /auth/login`, unwrap `.user` from `AuthResponse`.
   - `register(payload)` → `POST /auth/register`, unwrap `.user`.
   - `logout()` → `POST /auth/logout`.
   - `getCurrentSession()` → `GET /auth/me` (note: the real endpoint takes no `userId`
     parameter — it's implicit from the bearer token — so this call's signature
     necessarily changes; `auth.store.js` must be updated to stop passing `userId`).
   - `getUserById`/`getAllUsers` have **no real backend equivalent yet** — leave mocked
     until the Users & Roles phase ships.
4. **Add an Axios request interceptor** attaching `Authorization: Bearer <accessToken>`
   from the store's in-memory access token (never `localStorage` — ADR-1 keeps it
   memory-only specifically to limit XSS exposure).
5. **Add an Axios response interceptor** that, on a 401 from any endpoint other than
   `/auth/login`/`/auth/register`, attempts one silent `POST /auth/refresh` (the
   browser sends the cookie automatically) and retries the original request once; on a
   second 401, treat as a real session expiry (log out, redirect to `/login`).
6. **Rewrite `auth.store.js`**'s persisted-session shape: replace
   `localStorage.setItem('onehelp.auth.session', {userId, issuedAt})` with holding the
   access token **only in memory** (a `ref`, never persisted) — session restoration on
   page reload becomes "try `GET /auth/me`; if it 401s, try one silent refresh; if that
   also fails, the user is logged out," rather than reading a stored `userId`.
7. **Map backend error codes to the existing i18n keys**: the backend's `code` field
   (`auth.unknownEmail`, `auth.invalidPassword`, `auth.duplicateEmail`,
   `auth.accountSuspended`, `auth.invalidSession`) already matches the mock's own
   error-string vocabulary field-for-field (per `error-contract.md`'s design intent) —
   an Axios response interceptor that extracts `error.response.data.code` and throws
   `new Error(code)` makes every existing `t(authErrorKey(err.message))`-style call
   site work unchanged.
8. **Remove** `userRole.storage.js`, `userProfileOverride.storage.js`,
   `admin/mocks/userStatus.storage.js` once nothing reads them anymore (role/status/
   profile all live directly on the real `CurrentUserResponse` now).
9. Ship this one domain, confirm the frontend's login/register/logout/session-restore
   flows work end-to-end against the real backend, **before** starting Users & Roles —
   per `frontend-backend-replacement-map.md`'s explicit incremental-order guidance
   ("Authentication and current user... must be first").

## Known Limitations

- **No seed/demo data.** The mock's 3 demo accounts (`volunteer@onehelp.local`, etc.)
  don't exist in the real database — `LoginView.vue`'s demo-credentials helper will
  show credentials that don't work until either a Flyway seed migration or a manual
  `POST /auth/register` creates equivalent accounts. Not addressed in this phase.
- **`getUserById`/`getAllUsers` have no real backend endpoint yet** — only the five
  auth endpoints exist. Anything depending on those two mock functions must stay
  mocked until a future Users & Roles phase.
- **No rate limiting.** Login/register accept unlimited attempts — explicitly deferred
  per `security-and-authentication.md`'s own "later hardening" list, not an oversight
  of this phase.
- **Access-token staleness window.** A role change or suspension takes up to 15
  minutes to reflect in an *already-issued* access token for any endpoint except
  `/auth/me` (which always re-reads live state) — an accepted, documented trade-off
  (ADR-3), not a bug.
- **The frontend/backend port conflict** (`vite.config.js` and `application.yml` both
  default to `8080`) documented in `backend/README_LOCAL.md` still applies — pick a
  non-conflicting port pair before wiring up `httpClient` for real.
