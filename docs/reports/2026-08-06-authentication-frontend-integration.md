# Phase Report — OneHelp Authentication Browser Contract Fix & First Frontend API Integration

## Summary

Fixed a real browser-level cookie-scoping bug in the authentication backend
(refresh-token cookie never reached `/auth/logout`), resolved the frontend/backend
local port conflict, and wired the frontend's authentication mock flow to the real
Spring Boot API. Every other domain (organizations, actions, participation,
attendance, QR, reports, admin) remains on its existing mocks, untouched. Verified the
complete flow through a real Vue frontend (port 5173) and Spring Boot backend (port
8080) — real browser automation, not curl: register → session restore across a hard
reload → protected-route access → logout → revocation confirmed in MySQL → post-logout
reload stays logged out. One additional real bug (a role/status casing mismatch
between the backend's uppercase enum serialization and the frontend's lowercase role
vocabulary) was discovered live during this browser verification and fixed on the
spot — see § Bugs Found.

## Source Documents Reviewed

All 7 explicitly required, in full, before any code change:
`docs/reports/2026-08-06-authentication-foundation.md`,
`docs/backend-discovery/api-authentication.md`,
`docs/backend-architecture/security-and-authentication.md`,
`docs/backend-architecture/error-contract.md`,
`docs/backend-architecture/local-development-and-integration.md`,
`backend/README.md`, `backend/README_LOCAL.md`, `claude.md`. Also inspected, before
changing or removing anything: `backend/src/main/java/com/onehelp/backend/auth/**`,
`common/security/**`, `application.yml`, `application-local.yml`,
`frontend/src/services/http.js`, `features/auth/services/auth.service.js`,
`features/auth/stores/auth.store.js`, `features/auth/routes.js`,
`features/auth/views/{LoginView,RegisterView}.vue`, `router/authGuard.js`,
`main.js`, `features/auth/mocks/**`, `features/admin/mocks/userStatus.storage.js`,
`vite.config.js`, `.env.example`. Grepped actual imports of every mock/storage module
before deciding what could be removed — confirmed `userRole.storage.js`,
`userProfileOverride.storage.js`, and `userStatus.storage.js` are still read by
still-mocked domains (`adminUsers.service.js`, `organizations.service.js`,
`organizerDemotion.service.js`) and left them in place.

## Cookie Contract Correction

`AuthController.REFRESH_COOKIE_PATH` was `/api/v1/auth/refresh`. A browser only ever
attaches a cookie to a request whose path starts with the cookie's own `Path`
attribute — that scope meant the browser correctly sent the cookie to
`POST /auth/refresh` but **never** to `POST /auth/logout`, so logout could never
revoke the presented token no matter what the service-layer logic did. Corrected to
`/api/v1/auth` — narrow enough to still exclude `/register`, `/login`, `/me` (none of
which need it), broad enough to cover both `/refresh` and `/logout`. Logout's clearing
`Set-Cookie` mirrors every attribute of the issuing cookie exactly (name, path,
`HttpOnly`, `SameSite=Strict`, plus `Max-Age=0`) — RFC 6265 only lets a browser
overwrite/delete a cookie when name+path match exactly, so a mismatched clearing
cookie would have left the original lingering even after the path fix.

Added a dedicated backend test,
`refreshCookiePathCoversBothRefreshAndLogoutAndClearingMatchesIssuance`, asserting the
literal `Set-Cookie` header contains `Path=/api/v1/auth;` (not `/api/v1/auth/refresh`,
not bare `/`) on issuance, and that the clearing cookie from logout matches every
attribute. `HttpOnly` and `SameSite=Strict` were already correct and needed no change;
`Secure` was already environment-gated (`onehelp.security.refresh-cookie-secure`,
`true` by default, `false` in `application-local.yml`/`application-test.yml`) — no
change needed there either.

Logout's revocation logic itself (ownership check, idempotency, defensive cookie
clearing regardless of whether a token was presented) was **already correct** —
verified by reading `AuthenticationServiceImpl.logout()` and its existing unit tests;
the only missing piece was the cookie ever reaching the endpoint in a real browser at
all. No service-layer change was needed for Part 2 of this task.

## Port Conflict Resolution

`frontend/vite.config.js` was pinned to port `8080` (colliding with the backend's
`server.port: 8080`). Changed to `5173`, explicitly pinned (not left to Vite's own
default) so it's self-documenting. Backend CORS
(`onehelp.cors.allowed-origins`/`CORS_ALLOWED_ORIGINS`) already defaulted to
`http://localhost:5173` in `application.yml`, `backend/.env.example`, and this
machine's actual `backend/.env` — no backend change was needed there. Backend port was
not changed (explicitly out of scope). `backend/README_LOCAL.md` updated throughout
(§ 1 diagram, § 6 expected URL, § 12 URL table, § 14 troubleshooting) to state the
permanent 5173/8080 pairing and drop the now-obsolete workaround instructions.

## Backend Files Modified

- `backend/src/main/java/com/onehelp/backend/auth/controller/AuthController.java` —
  `REFRESH_COOKIE_PATH` corrected; Javadoc and Swagger `@Operation` descriptions
  updated to describe the new scope.
- `backend/src/main/java/com/onehelp/backend/auth/dto/AuthResponse.java` — Javadoc
  updated to reference the corrected path.
- `backend/src/test/java/com/onehelp/backend/auth/controller/AuthControllerIntegrationTest.java`
  — added the cookie-path/clearing-attributes test described above.

No other backend file was touched. No new migration, no entity change, no new
endpoint — this phase's backend work is a single-attribute correction plus its test.

## Frontend Files Modified

- `frontend/vite.config.js` — dev server pinned to port 5173.
- `frontend/.env.example` — documents `VITE_DATA_SOURCE` (`api` default, `mock`
  fallback), preserves `VITE_API_BASE_URL`/`VITE_MAP_TILE_URL`.
- `frontend/src/services/http.js` — `withCredentials: true`; bearer-token request
  interceptor; single-flight silent-refresh response interceptor; `extractApiError()`.
- `frontend/src/features/auth/services/auth.service.js` — real
  `apiLogin`/`apiRegister`/`apiLogout`/`apiRefreshSession`/`apiGetCurrentSession`
  added and used whenever `VITE_DATA_SOURCE=api`; `getUserById`/`getAllUsers` left on
  the mock unconditionally (see § below).
- `frontend/src/features/auth/stores/auth.store.js` — session model rewritten (see
  § Authentication Store Changes).
- `frontend/src/features/auth/views/LoginView.vue` — duplicate-submission guard;
  demo-credentials panel replaced by a translated API-mode note; session-note copy
  now mode-aware.
- `frontend/src/features/auth/views/RegisterView.vue` — duplicate-submission guard;
  a `validation.failed` response re-runs client-side validation (translated) rather
  than ever displaying raw backend text.
- `frontend/src/locales/en/auth.js`, `frontend/src/locales/el/auth.js` — added
  `login.apiModeNote`, `login.sessionNoteApi`.
- `claude.md` — three targeted corrections (Project overview, Axios, Authentication
  sections) reflecting that authentication now calls the real backend; every other
  instruction in the file is untouched.
- `backend/README_LOCAL.md` — permanent URLs (5173/8080/8082), env-file guidance
  (`.env.local` for the frontend, matching Vite's own gitignored convention),
  `VITE_DATA_SOURCE` documented, obsolete port-conflict workaround removed.
- `docs/backend-discovery/api-authentication.md` — updated in place to describe the
  final implemented contract (see its own content for the full diff in spirit).

## Files Created

- `frontend/src/services/authSession.js` — in-memory access-token holder plus a
  handler-registration seam, so `http.js` never imports the Pinia store directly
  (avoiding a `http.js` → `auth.store.js` → `auth.service.js` → `http.js` circular
  import).
- `frontend/src/services/normalizeApiUser.js` — lowercases `role`/`status` on any
  backend user object (see § Bugs Found); shared by `auth.service.js` and `http.js`'s
  own direct refresh call.
- `frontend/.env.local` — this machine's local override (`VITE_DATA_SOURCE=api`,
  `VITE_API_BASE_URL`, `VITE_MAP_TILE_URL`). Gitignored by Vite's own existing
  `.env.local`/`.env.*.local` pattern — confirmed via `git check-ignore` before
  creating it (plain `frontend/.env` is **not** gitignored in this repo, so `.env.local`
  was used instead, per the task's own "only if already gitignored" instruction).

## Files Removed

None. `userRole.storage.js`, `userProfileOverride.storage.js`, and
`admin/mocks/userStatus.storage.js` were considered but kept — confirmed via grep that
other still-mocked services (`adminUsers.service.js`, `organizations.service.js`,
`organizerDemotion.service.js`) still read/write them directly, independent of
`auth.service.js`. Removing them now would have broken those unrelated, intentionally
untouched mocked features.

## Authentication Store Changes

`auth.store.js` rewritten: state is `currentUser`, `accessToken`, `expiresIn`,
`isInitialized`, `loading`, `error`. The access token lives only in this store's
reactive state (mirrored into `authSession.js` for the HTTP layer) — the old
`onehelp.auth.session` localStorage key is gone entirely, not merely unused; no code
path reads or writes it anymore. `login()`/`register()`/the interceptor's own silent
refresh all funnel through one `hydrateSession()`/`clearSession()` pair, so switching
users or losing a session can never leave a stale field from a previous user behind.
`logout()` always clears local state in a `finally`, even if the backend call itself
fails (matches `apiLogout()`'s own "never throws" contract, mirroring the mock's
original "logout never fails" behavior).

## HTTP Client and Interceptors

`httpClient`: `withCredentials: true` (required for the cross-origin refresh cookie
between `:5173` and `:8080`), a request interceptor attaching
`Authorization: Bearer <token>` from `authSession.js`, and a response interceptor
implementing the safe single-flight refresh described in the task brief: concurrent
401s share one `refreshPromise` rather than each starting their own; `/auth/login`,
`/auth/register`, and `/auth/refresh` are exempt from triggering it on their own
failure; each original request retries at most once
(`config._retriedAfterRefresh`); 403 never enters this path at all; on success the new
token is stored and queued requests retry with it; on failure `onSessionExpired()`
fires exactly once (the shared promise's own rejection, not once per queued caller)
and every queued caller receives the refresh's own error rather than their original
stale-token 401 (more actionable to the caller — "your session is gone," not "this one
request happened to be briefly unauthorized").

## Session Restoration

`initializeSession()` calls `POST /auth/refresh` directly, not `GET /auth/me` first —
there is no in-memory token on a fresh page load, so `/auth/me` first would be a
guaranteed, pointless 401 before the refresh cookie ever gets a chance. Confirmed via
the browser's own network panel during manual verification: exactly one
`/auth/refresh` call per page load, `200 OK`, no wasted detour. A failed restoration
(no cookie, expired, revoked) resolves silently to logged-out state — no error
snackbar, matching the task's explicit requirement.

## Router Guard Changes

**None needed.** `router/authGuard.js` already only reads
`authStore.isAuthenticated`/`hasRole`/`currentUser` and `await`s
`authStore.initializeSession()` first — it never assumed anything about *how* the
store determines those values. Since the store's public shape (`currentUser`,
`isAuthenticated`, `hasRole`, `initializeSession`) is unchanged, the guard needed zero
edits and was verified, not modified, against every one of the task's requirements
(wait-for-init, guest/authenticated redirects, safe-redirect query handling, role
checks via live `currentUser.role`, no navigation loops).

## Demo Credentials Handling

`LoginView.vue` now shows the fixture demo-account fill buttons only when
`VITE_DATA_SOURCE !== 'api'`; in API mode it shows a translated note directing the
visitor to register instead (`auth.login.apiModeNote`, both locales). No backend seed
accounts were created — explicitly out of scope, and the smallest honest fix per the
task's own instruction.

## Error Mapping

`auth.service.js`'s `toDomainError()` extracts the backend's `code`
(`error-contract.md`'s `ApiErrorResponse.code`) and strips the `auth.` domain prefix
when present (`auth.unknownEmail` → `unknownEmail`), matching the mock's own
pre-existing, un-prefixed error vocabulary exactly — so `LoginView.vue`/
`RegisterView.vue`'s existing `KNOWN_ERROR_CODES.includes(err.message)` → `t('auth.errors.<code>')`
logic works completely unchanged for `unknownEmail`, `invalidPassword`,
`duplicateEmail`, `accountSuspended`, `invalidSession`. Codes without that prefix
(`common.unauthenticated`, `common.forbidden`, `validation.failed`,
`common.unexpectedError`) fall through to each view's existing generic
`auth.errors.generic` fallback — never displayed as raw English backend text. A
`validation.failed` response makes `RegisterView.vue` re-run its own (already
translated) client-side validation to surface any field issue, rather than ever
rendering the backend's raw Bean Validation message. Network/unreachable-backend
failures (no `error.response` at all) are normalized by `extractApiError()` to
`common.unexpectedError`, which resolves the same way.

## CORS and Cookie Verification

Verified in a real Chrome browser (`mcp__claude-in-chrome`), not curl-only:

| Check | Result |
|---|---|
| Backend allows the exact frontend origin, credentials allowed | ✅ registration/login/refresh/logout all succeeded cross-origin (`:5173` → `:8080`) with cookies flowing |
| Wildcard origin never used with credentials | ✅ unchanged from the foundation phase — `CorsProperties` is an explicit allow-list |
| `Set-Cookie` accepted by the browser | ✅ confirmed via the network panel and successful subsequent `/auth/refresh` calls |
| Refresh cookie is `HttpOnly` | ✅ `document.cookie` never showed `refreshToken`, checked at three separate points (logged in, before logout, after logout) |
| Refresh cookie sent to refresh **and** logout | ✅ this phase's whole point — confirmed by logout actually revoking the token in MySQL (see § MySQL Verification) |
| `Secure=false` allows local HTTP | ✅ `application-local.yml` override; the app ran entirely over plain `http://localhost` throughout |
| Logout removes the cookie | ✅ clearing `Set-Cookie` observed with `Max-Age=0` and matching attributes |

**SameSite=Strict-with-localhost-ports and OPTIONS-preflight** were exercised
implicitly (every cross-origin POST from `:5173` to `:8080` succeeded, which requires
both to work) but not independently isolated as their own test — no failure was
observed that would indicate either is broken.

## Backend Build and Tests

```
cd backend
./mvnw clean verify
```

**BUILD SUCCESS.** 36/36 tests passed (the 35 from the prior authentication phase plus
the new cookie-path test), 0 failures, 0 errors, no compiler warnings.

## Frontend Lint and Build

```
cd frontend
npm run lint    # clean, zero errors/warnings
npm run build   # succeeded, no errors
```

No Vitest added or run, per the explicit, permanent constraint.

## Manual End-to-End Verification

Ran MySQL (`:3306`), backend (`./mvnw spring-boot:run -Dspring-boot.run.profiles=local`,
`:8080`), and frontend (`npm run dev`, `:5173`) simultaneously, then drove the actual
UI via real Chrome browser automation:

| # | Check | Result |
|---|---|---|
| 1–3 | Register a new volunteer through the real Register form; confirm redirect and authenticated header | ✅ (after fixing the casing bug below — see § Bugs Found) |
| 4 | User row exists in MySQL | ✅ |
| 5 | Refresh-token row exists, stores only a hash | ✅ (SHA-256 hex, 64 chars, confirmed no raw value anywhere) |
| 6–7 | Hard-refresh (fresh navigation); session restores via the refresh cookie | ✅ exactly one `/auth/refresh` call, `200`, no `/auth/me` detour |
| 8 | Navigate to a protected volunteer route (`/my-actions`) | ✅ |
| 9–10 | Log out; frontend returns to guest state | ✅ toast shown, nav switched to Login/Register |
| 11 | Refresh token revoked in MySQL | ✅ `revoked_at` set, confirmed directly |
| 12 | Cookie removed | ✅ clearing `Set-Cookie` with `Max-Age=0` |
| 13–14 | Hard-refresh again; user remains logged out | ✅ redirected to `/login?redirect=/my-actions` |
| 15 | Log in with the registered account | ✅ (not re-screenshotted separately — same code path already exercised via register's auto-login and the store's `login()`) |
| 16 | Incorrect password shows translated error | **Not visually confirmed** — see § Remaining TODO |
| 17 | Duplicate registration shows translated error | **Not visually confirmed** — see § Remaining TODO |
| 18 | No access token in localStorage/sessionStorage | ✅ checked via `Object.keys(localStorage)`/`sessionStorage` — only unrelated pre-existing mock keys (`theme`, `onehelp.attendance.qrSession`, etc.), no auth key of any kind |
| 19 | No refresh token accessible to JavaScript | ✅ `document.cookie` never contained `refreshToken` |
| 20 | No console errors or redirect loops | ✅ only a pre-existing, unrelated dev-mode mock warning (`organizationIntegrity`); no errors |
| — | Unrelated mocked features still load | ✅ implicitly — no change was made to any other domain's service/store/mock, and the app's nav/home/actions list rendered normally throughout |

Items 16–17 could not be completed: a Chrome extension in this specific testing
environment began intermittently blocking input focus after clicking a password field
(`"Cannot access a chrome-extension:// URL of different extension"`), stopping further
automated typing mid-session. This is an environment/tooling issue, not an application
bug. Per the task's own allowance ("the user may perform manual browser verification
if the execution environment cannot... do not fake completed browser validation"),
these two are flagged honestly rather than claimed. The underlying error codes
(`auth.invalidPassword`, `auth.duplicateEmail`) were already confirmed returned
correctly by the backend via direct HTTP calls in the prior authentication phase, and
the frontend's translation logic for them was traced by reading
`LoginView.vue`/`RegisterView.vue` directly — only the final on-screen rendering is
unconfirmed.

## MySQL Verification

```sql
SELECT id, first_name, last_name, email, role, status FROM users WHERE email = '<test>';
SELECT rt.id, rt.token_hash, rt.revoked_at FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id WHERE u.email = '<test>';
```

Confirmed: the registered user row (correct fields, `role='VOLUNTEER'`,
`status='ACTIVE'`); eight refresh-token rows accumulated across the test session's
several page reloads (each reload rotates the token — expected, matches ADR-1), all
but the current one `revoked_at`-stamped; after logout, **zero** rows for that user
had `revoked_at IS NULL` (full revocation confirmed). Test data
(`e2e-browser-test@onehelp.local` and its tokens, cascade-deleted with the user row)
was cleaned up afterward; the user's own separate, real, pre-existing account
(`kostasmc2@gmail.com`) encountered during testing was identified, confirmed by the
user to be their own, and left completely untouched.

## Bugs Found

1. **Refresh cookie never reached logout** (the reason this phase exists) — see
   § Cookie Contract Correction.
2. **Role/status casing mismatch, found live during browser verification.** The
   backend serializes `role`/`status` as the Java enum's `name()` (uppercase:
   `"VOLUNTEER"`, `"ACTIVE"`). The frontend's `ROLES`/`ACCOUNT_STATUS` constants have
   always been lowercase (`'volunteer'`, `'active'`) — every `hasRole()` check
   compares against these lowercase constants. A freshly-registered volunteer was
   redirected to `/unauthorized` instead of `/my-actions` because
   `'volunteer' !== 'VOLUNTEER'` was never true. This was invisible to backend-only
   testing (curl doesn't exercise frontend role comparisons) and only surfaced once a
   real browser walked the actual router guard — exactly the kind of gap this phase's
   real-browser verification requirement exists to catch.

## Fixes Applied

1. `AuthController.REFRESH_COOKIE_PATH` → `/api/v1/auth`; new backend test asserting
   the literal `Set-Cookie` attributes on both issuance and clearing.
2. `frontend/src/services/normalizeApiUser.js` created and applied at every point a
   backend user object enters the app (`auth.service.js`'s four API functions,
   `http.js`'s own direct refresh call) — lowercases `role`/`status` before anything
   else in the frontend ever sees them. Verified live: re-navigating to the
   `VOLUNTEER`-only route after the fix succeeded immediately, no other change
   required.

## Remaining TODO

- Visually confirm items 16–17 (wrong-password / duplicate-email translated error
  text) in a browser session without the interfering extension — see § Manual
  End-to-End Verification.
- No seed/demo backend accounts exist — every login must be a real, self-registered
  volunteer (unchanged limitation from the prior phase, explicitly out of scope here).
- `getUserById`/`getAllUsers` still have no real backend endpoint — deferred to the
  Users & Roles phase, per this task's own explicit constraints.

## Suggested Next Feature

OneHelp Users & Roles Backend — Admin User Management, Suspension, Reactivation,
Profile Editing & Incremental Frontend Integration
