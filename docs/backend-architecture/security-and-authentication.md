# Security and Authentication Architecture

Implements ADR-1, ADR-2, ADR-3, ADR-14 from `architecture-decisions.md`. Route-level
authorization must match `docs/backend-discovery/routes-and-authorization.md`'s
current role × route matrix exactly (no frontend-visible role gate is dropped or
loosened); resource-level authorization closes the gaps that matrix explicitly
disclaimed as frontend-only.

---

## Authentication flow

### Volunteer registration

`POST /api/v1/auth/register` → `AuthenticationService.register()`:
1. Validate `RegisterRequest` (Bean Validation: name presence, email format, password
   ≥ 8 chars — matching `RegisterView.vue`'s existing client-side rule, plus a server-
   side re-check since the frontend's own validation carries no security weight).
2. Reject if `lower(email)` already exists (`users.email` unique index) →
   `auth.duplicateEmail` (409).
3. Hash the password with `BCryptPasswordEncoder` (work factor 12, Spring Security
   default — adequate for MVP, revisit only if login-time latency budget requires a
   lower factor).
4. Insert `users` row, `role = VOLUNTEER` (hardcoded — **never** accepted from the
   request body; matches the mock's own `register()` behavior of always creating a
   volunteer, per `docs/backend-discovery/service-contracts.md`).
5. Issue an access token + refresh token exactly as login does (auto-login after
   register, matching the mock's `auth.store.js::register` behavior).

### Login

`POST /api/v1/auth/login` → `AuthenticationService.login()`:
1. Look up by `lower(email)`; not found → `auth.unknownEmail` (401, but see § 404 vs
   401/403 policy note below — login errors do not leak which part failed beyond the
   mock's own two distinct codes, preserved for frontend compatibility).
2. `BCryptPasswordEncoder.matches()` → mismatch → `auth.invalidPassword` (401).
3. `status == SUSPENDED` → `auth.accountSuspended` (403) — checked **before** issuing
   any token.
4. Issue access token (JWT, 15 min TTL, claims `{sub, role, status, iat, exp, jti}`)
   and a refresh token (opaque, 30-day TTL, persisted hashed in `refresh_tokens`,
   returned via `Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict;
   Path=/api/v1/auth/refresh`).

### Token refresh

`POST /api/v1/auth/refresh` (reads the `refreshToken` cookie, no request body):
1. Hash the presented token, look up by `token_hash`.
2. Not found, or `revoked_at IS NOT NULL`, or `expires_at < now()` → 401
   (`auth.invalidSession`); **if `revoked_at IS NOT NULL` specifically (a token that
   was already rotated/used once before) — this is a reuse signal**: revoke the entire
   rotation chain for that user (walk `replaced_by_token_id` backwards, or simply
   revoke all of that user's `refresh_tokens` rows) and log a `WARN` security event
   (`system-architecture.md` § Observability) — this is the standard refresh-token
   theft/replay defense.
3. Re-read the user's **live** `role`/`status` from `users` (not cached from the old
   token) — this is what bounds ADR-1's staleness window.
4. `status == SUSPENDED` → 403, same as login.
5. Rotate: mark the presented row `revoked_at = now()`, insert a new `refresh_tokens`
   row, set `replaced_by_token_id` on the old row, issue a fresh access token +
   fresh refresh cookie.

### Logout

`POST /api/v1/auth/logout`: revoke the current refresh-token row (`revoked_at =
now()`), clear the cookie (`Set-Cookie` with `Max-Age=0`). No access-token revocation
mechanism exists (it simply expires within 15 minutes) — matches the mock's own
`logout()` being a near-no-op, with the meaningful state change being the persisted
credential's invalidation, not an instantaneous access-token kill.

### Current user

`GET /api/v1/users/me` → resolves from the validated access token's `sub` claim,
re-reads the live `User` row (so a role/status change reflected by a very recent
refresh is visible immediately on this call, without waiting for the next refresh) —
matches `auth.service.js::getCurrentSession`'s "re-checked on every guarded
navigation" behavior, adapted to a stateless-access-token world.

### Password hashing

`BCryptPasswordEncoder`, Spring Security's default — never a custom hashing scheme.
Password hashes are never selected into any JPA query result used for a DTO (enforced
by `UserRepository` only ever projecting into DTOs that omit the field, not by
after-the-fact stripping).

### Suspended-account behavior

Blocks login (step 3 above) and blocks refresh (step 4 above); an already-issued
access token continues to work for up to its remaining TTL (≤15 min) unless the
suspending admin action also revokes refresh tokens (it does, per ADR-3) — the access
token itself is never individually revocable (stateless JWTs cannot be revoked without
a blocklist, which is exactly the server-side state this design otherwise avoids;
15 minutes is the accepted ceiling).

### Role change behavior (approval, demotion)

Both `AdminOrganizationService.approve()` and `OrganizerDemotionService.demote()`
revoke all of the affected user's `refresh_tokens` in the same transaction as the role
change (ADR-3) — the user must re-authenticate (or their next silent-refresh attempt
fails and the frontend redirects to Login) to obtain a token reflecting their new role,
bounding staleness to the same ≤15-minute ceiling as suspension.

### Admin suspension behavior

Covered above (`AdminUserService.suspend()`); additionally guarded by a self-
suspension check (`adminUserId != targetUserId` → 400 `admin.cannotSuspendSelf`,
matching the mock exactly).

### CORS and CSRF policy

- **CORS**: `common`'s `CorsConfigurationSource` allows exactly the configured
  frontend origin(s) (`CORS_ALLOWED_ORIGINS` env var — `http://localhost:5173` in
  local dev, the real frontend origin in production), `allowCredentials = true`
  (required for the refresh cookie to be sent cross-origin in local dev where frontend
  and backend run on different ports), methods `GET,POST,PATCH,DELETE,OPTIONS`,
  headers `Authorization,Content-Type`. No wildcard origin is ever used together with
  `allowCredentials = true` (browsers reject that combination outright, and it would
  be unsafe regardless).
- **CSRF**: Spring Security's CSRF protection is **disabled for the stateless
  `Authorization: Bearer` API surface** (the access token is never auto-attached by
  the browser, so CSRF does not apply to any endpoint requiring it) but **the refresh
  endpoint is the one cookie-authenticated endpoint and is therefore the one CSRF-
  relevant surface**: mitigated by `SameSite=Strict` on the refresh cookie (the
  primary defense — a `Strict` cookie is never sent on a cross-site navigation or
  cross-site fetch at all) plus scoping the cookie's `Path` to
  `/api/v1/auth/refresh` exclusively, so it is never even transmitted to any other
  endpoint where a CSRF concern could otherwise arise. No separate CSRF token is
  introduced given `SameSite=Strict` already covers the one cookie-based endpoint;
  this is documented as an explicit, sufficient decision, not an oversight.
- **Local Vite + local Spring Boot**: `http://localhost:5173` (frontend) and
  `http://localhost:8080` (backend) are different origins (different ports) — the
  CORS configuration above, plus `withCredentials: true` on the frontend's Axios
  instance, is required for the refresh cookie to work locally exactly as it will in
  production. A Vite dev-server proxy (forwarding `/api` to `:8080`) is offered as an
  alternative that makes the two origins appear the same to the browser, removing the
  cross-origin cookie concern entirely for local dev — see
  `local-development-and-integration.md` for the recommended choice.

---

## Authorization architecture

### Route/controller level

Every controller method is annotated with Spring Security method security
(`@PreAuthorize("hasRole('ORGANIZER')")`, etc.), mirroring
`docs/backend-discovery/routes-and-authorization.md`'s route × role matrix exactly —
every current frontend route restriction has a corresponding backend annotation, not
just a frontend router guard:

| Frontend route meta | Backend equivalent |
|---|---|
| `roles: [ROLES.VOLUNTEER]` | `@PreAuthorize("hasRole('VOLUNTEER')")` |
| `roles: [ROLES.ORGANIZER]` | `@PreAuthorize("hasRole('ORGANIZER')")` |
| `roles: [ROLES.ADMINISTRATOR]` | `@PreAuthorize("hasRole('ADMINISTRATOR')")` |
| `requiresAuth: true`, no `roles` | `@PreAuthorize("isAuthenticated()")` |
| `requiresAuth: false` | no annotation (public) |

### Resource/service level (object-level ownership — the layer the mock never had)

These checks run **inside** the service method, after the coarser role check, and are
the direct closure of `docs/backend-discovery/routes-and-authorization.md`'s explicit
warning that "direct IDs supplied by clients never establish ownership" on their own:

| Rule | Enforcement |
|---|---|
| Organizer can edit only their own organization | `OrganizationApplicationService`/`AdminOrganizationService` resolve the organization by the **authenticated principal's** user id (`organizationRepository.findByOrganizerUserId(currentUserId)`), never by a client-supplied organization id for the "my organization" endpoints |
| Organizer can edit/transition only actions owned by their organization | `OrganizerActionService` loads the action, then compares `action.organization.organizerUserId` against the authenticated principal; mismatch → 404 (not 403 — see below) |
| Volunteer can participate only as themselves | `ParticipationService.join()`/`cancel()` always use the authenticated principal's id; no endpoint accepts a client-supplied `userId` for join/cancel |
| Organizer cannot participate as a volunteer | `ParticipationService.join()` requires `hasRole(VOLUNTEER)` at the method-security layer — **this is the fix for the mock's most significant gap** (`docs/backend-discovery/risks-and-open-decisions.md` item 1: the mock's `joinAction` had no role check at all) |
| Admin cannot suspend themselves | `AdminUserService.suspend()`, explicit id-equality check |
| Anonymous users cannot discover hidden resources | `PublicActionQueryService` and `PublicActionController` query **only** `v_public_actions`; a draft/cancelled/rejected/hidden action is never returned by any public endpoint, and a direct-by-id request for one returns 404 |
| Direct IDs never establish ownership | universal rule across every controller: an entity id in a path/body is only ever a *lookup key*, never itself proof of authorization — every mutating endpoint re-derives "does the caller own this" from the authenticated principal, never from a client-asserted role/id in the request payload (closing "mass-assignment"-style trust issues, see § Security checklist) |

### 404 vs. 403 leakage policy

- **Public endpoints** (`/actions/**`): a non-visible action is **404**, never 403 —
  matches ADR-13 exactly, avoids confirming an action id exists at all to an
  unauthorized caller.
- **Owner-scoped endpoints** (`/organizer/actions/{id}/**`, `/organizer/organization`):
  an action/organization that exists but is **not owned by the caller** is also
  **404**, not 403 — an organizer attempting to probe another organizer's action id
  should not learn "this exists but isn't yours" (that itself is information
  disclosure); they should see the same response as a nonexistent id.
- **Admin endpoints** (`/admin/**`): a nonexistent resource is 404; **role**
  mismatches (a non-administrator calling any `/admin/**` path at all) are handled one
  layer up, before any resource lookup happens, as **403** (Spring Security's method-
  security failure) — the distinction is deliberate: "you're not an admin at all" is
  not sensitive information worth hiding (the route's existence is already public
  knowledge from the frontend's own bundled router config), but "this specific
  resource does/doesn't belong to you" is.

### Roles storage model

Single `role` enum column on `users` (ADR-14) — not an authorities join table. The
JWT's `role` claim is a single string, mapped to exactly one Spring Security
`GrantedAuthority` (`ROLE_VOLUNTEER`/`ROLE_ORGANIZER`/`ROLE_ADMINISTRATOR`) per
authenticated request; `hasRole(...)` checks are single-value comparisons, matching the
mock's own `authStore.hasRole(...roles)` semantics (which also only ever compares
against a single stored role value, never a set).

---

## Security checklist

Distinguishes MVP-required items (must exist before any real user data is handled)
from later-hardening items (valuable, explicitly not MVP-blocking).

### MVP-required

| Item | Design |
|---|---|
| Password hashing | BCrypt (work factor 12) |
| JWT/session security | Short-lived signed access token, httpOnly/secure/SameSite=Strict refresh cookie, rotation with reuse detection (ADR-1) |
| Refresh-token rotation | Every refresh invalidates the presented token and issues a new one; reused-old-token detection revokes the whole chain |
| CSRF | `SameSite=Strict` + path-scoped cookie on the one cookie-authenticated endpoint; bearer-header endpoints are CSRF-exempt by construction |
| CORS | Explicit allow-listed origin(s), no wildcard with credentials |
| Validation | Bean Validation on every request DTO (`validation` details in `error-contract.md`) |
| Authorization (route + resource level) | Both layers, per § Authorization architecture above |
| Object-level ownership checks | Universal rule, per table above |
| Mass-assignment prevention | Request DTOs are explicit, hand-defined classes (never binding a request directly onto a JPA entity); fields like `role`, `status`, `id`, `organizerUserId`, `reviewedBy` are never bindable from client input on any DTO that a non-privileged caller can submit |
| SQL injection prevention | Spring Data JPA/JPQL + parameterized native queries only; no string-concatenated SQL anywhere in the design |
| Sensitive-data logging | `password_hash`, raw refresh tokens, and raw QR-token JWTs are never logged; log statements reference ids, not full request/response bodies, for auth-adjacent endpoints |
| QR signing | Signed JWT (ADR-6), replacing the mock's unsigned base64url token entirely |
| Token expiry | 15 min access / 30 day refresh / 10 min QR token, all explicit, documented constants |
| Account suspension | Blocks login and refresh; revokes existing refresh tokens (ADR-3) |
| Admin self-protection | Self-suspension guard |
| 404 vs. 403 leakage | Explicit policy above, no endpoint is exempt |
| Input length limits | Every `VARCHAR`/`TEXT` field has a `@Size`/DB `CHECK` length bound mirrored from `database-schema.md` — no unbounded text input anywhere |
| Secure production configuration | Cookie `Secure` flag on (HTTPS-only in production), `JWT_SECRET` sourced from environment/secret manager, never committed |

### Explicitly deferred (later hardening, not MVP-blocking)

| Item | Why deferred |
|---|---|
| Brute-force/login-rate limiting | No rate-limiting infrastructure exists yet; acceptable at MVP scale/audience (a small, curated volunteer platform, not a public high-value target), but flagged here explicitly rather than silently omitted — recommend adding a simple per-IP/per-email login attempt counter (in-memory or a `login_attempts` table) before any public production launch with meaningful traffic |
| Audit-log integrity guarantees (tamper-evidence, e.g. hash chaining) | `admin_activity_log` is an operational activity trail, explicitly **not** claimed as a legally compliant audit log — matching the mock's own disclaimer (`docs/backend-discovery/frontend-mock-inventory.md`); if legal/regulatory audit compliance is ever required, that is a distinct, larger design exercise, not an incremental addition |
| Full audit trail on every read (who viewed what) | Not implemented; only state-changing operations are logged, per Part 1 item 11's explicit scope |
| Asymmetric JWT signing (RS256) | ADR-2 — deferred until a second verifying service exists |
| Distributed session/token revocation via Redis | ADR-6/ADR-1 — deferred until write volume or multi-instance scale requires it |

**No overclaiming**: this design provides real, production-appropriate authentication
and authorization for a single-service monolith with all its own data in one
database. It does not claim GDPR/PCI/SOC2 compliance, does not implement WAF-level
protections, and does not implement anomaly detection beyond the one specific reuse-
detection case described above — all explicitly out of scope unless a future
requirement names them.
