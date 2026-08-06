# Architecture Decisions

Numbered, ADR-style decisions resolving every critical and architecture-level item
from `docs/backend-discovery/risks-and-open-decisions.md`, plus the additional
technology/structure decisions required by this phase. Each entry states the problem,
current frontend behavior, the chosen decision, rejected alternatives, reasoning, and
impact across database/API/security/frontend-integration. Every decision preserves the
permanent product rules from `claude.md` (one organizer per organization, no manager
role, no certificates/exports/payments/donations).

---

## ADR-1 — Authentication transport

**Resolves**: risk #5 (authorization/session transport undecided), Part 1 item 1.

**Problem**: the mock stores `{userId, issuedAt}` in localStorage with no real
security value (`docs/backend-discovery/domain-models.md` § Auth Session). A real
backend needs a transport that survives XSS/CSRF threats, supports suspension/role-
change invalidation, and works across local Vite + local Spring Boot + production.

**Current frontend behavior**: `auth.store.js` re-validates the stored session against
`getCurrentSession(userId)` on every app boot and every router navigation
(`docs/backend-discovery/frontend-mock-inventory.md` § Authentication;
`routes-and-authorization.md` § Guard logic). `httpClient` (`services/http.js`) exists,
configured, unused today.

**Decision**: **short-lived signed access JWT returned in the login/refresh response
body and held only in memory on the frontend (a Pinia store field, never
localStorage), sent as `Authorization: Bearer <token>`**, paired with **a long-lived
opaque refresh token delivered exclusively via an `HttpOnly`, `Secure`,
`SameSite=Strict` cookie scoped to the single refresh endpoint path
(`/api/v1/auth/refresh`)**.

- Access token: JWT, HS256 (see ADR-2 for why HS256 over RS256 at MVP scale), 15-minute
  TTL, claims `{sub: userId, role, status, iat, exp, jti}`.
- Refresh token: opaque random 256-bit value, only its SHA-256 hash is persisted
  (`refresh_tokens` table, see `database-schema.md`), 30-day TTL, rotated on every use
  (old row marked `revoked_at`, new row issued, `replaced_by_token_id` chains them for
  theft detection — reusing a revoked token revokes the entire chain).

**Rejected alternatives**:
- *Fully cookie-based session (access token also in a cookie)* — rejected because it
  reintroduces CSRF risk for every state-changing endpoint (would require CSRF tokens
  on top), and couples the access token's lifetime to cookie semantics the SPA doesn't
  need; the bearer-header approach means CSRF is a non-issue for the access token by
  construction (browsers do not auto-attach `Authorization` headers).
- *Access token in localStorage (today's mock pattern)* — explicitly excluded by the
  brief; vulnerable to persistent theft via any XSS, however small.
- *Fully stateless refresh (no DB row, just a longer-lived JWT)* — rejected because it
  cannot be revoked before its own expiry, which breaks "suspended-account
  invalidation" and "admin role changes" requirements below.

**Reasoning**: this is the standard production-safe pattern for an SPA talking to its
own backend with no third-party IdP: the short-lived bearer token bounds the blast
radius of any XSS-based token theft to 15 minutes, while the long-lived credential
(the one worth stealing) never touches JavaScript-readable storage at all. Refresh
rotation with reuse detection gives real revocation without adding Redis/session-store
infrastructure (Part 2 forbids unnecessary infrastructure) — a relational table
(MySQL, per ADR-17) is sufficient at this scale.

**Database impact**: new `refresh_tokens` table (see `database-schema.md`).

**API impact**: `POST /auth/login`, `POST /auth/register` return `{accessToken,
expiresIn, user}` and set the refresh cookie; `POST /auth/refresh` reads the cookie,
rotates, and returns a new `{accessToken, expiresIn}` + rotated cookie; `POST
/auth/logout` revokes the current refresh-token row and clears the cookie.

**Security impact**: suspension and role changes take effect within, at most, the
15-minute access-token TTL (the resource server re-derives authorization from the
token's `role`/`status` claims, which are only as fresh as the last refresh — see
ADR-3 for how staleness is bounded) or immediately on the next refresh/API call that
re-checks the user's live DB row (chosen: **every access-token issuance point —
login, register, and refresh — re-reads the user's live `role`/`status` from the
database**, so a full 15-minute token cannot outlive a suspension by more than its own
remaining TTL, and a forced-logout-all-sessions admin action, see ADR-3, can zero that
window entirely).

**Frontend integration impact**: `auth.store.js`'s public shape (`currentUser`,
`isAuthenticated`, `login`, `register`, `logout`, `initializeSession`,
`refreshCurrentUser`, `hasRole`) is preserved unchanged. Internally: `login`/`register`
store the returned access token in a store-local ref (not localStorage);
`initializeSession()` on boot calls `POST /auth/refresh` (relying on the browser
sending the refresh cookie automatically) to silently re-establish a session, falling
back to "not authenticated" on any failure — replacing today's "read `onehelp.auth.session`
from localStorage" step with "attempt a silent refresh," with an equivalent
success/failure branch. An Axios response interceptor on `httpClient` performs one
automatic retry-after-refresh on a 401, transparent to callers.

---

## ADR-2 — JWT signing algorithm

**Problem**: ADR-1 requires a signing algorithm for the access token.

**Decision**: **HS256 (symmetric) for the MVP**, key sourced from an environment
variable (`JWT_SECRET`, ≥256-bit random value, never committed), with the
implementation isolated behind a single `TokenSigner` interface so it can be swapped
for RS256 (asymmetric) later without touching call sites, if the backend ever needs to
let a separate service verify tokens without holding the signing secret.

**Rejected alternative**: RS256 from day one — rejected as unnecessary complexity for
a single monolith that both issues and verifies its own tokens; the asymmetric-key
benefit (verifiers don't need the signing secret) has no MVP consumer.

**Impact**: no other document depends on this choice beyond `security-and-
authentication.md`, which documents the `TokenSigner` seam explicitly as a
production-hardening path.

---

## ADR-3 — Forced session invalidation (suspension / role change staleness bound)

**Problem**: ADR-1 leaves a bounded (≤15 min) staleness window where a just-suspended
or just-demoted user's still-valid access token continues to authorize requests.

**Decision**: accept the ≤15-minute staleness window for the MVP as an explicit,
documented trade-off, **and** additionally revoke all of a user's `refresh_tokens` rows
the moment an admin suspends them or an organizer is demoted/an organization is
approved — so the staleness window is a hard ceiling (worst case 15 minutes) that can
never be extended by a silent refresh, and the user is fully logged out (must
re-authenticate, and re-authentication itself re-checks status) within that ceiling.

**Rejected alternative**: a request-level DB status check on every single API call —
rejected as unnecessary infrastructure load for an MVP (turns every request into two
queries minimum) when a 15-minute ceiling is an acceptable, clearly documented
trade-off; revisit if the product later requires sub-minute suspension enforcement.

**Database impact**: `suspendUser`/`demoteOrganizerToVolunteer`/`approveOrganization`
service methods each additionally execute `UPDATE refresh_tokens SET revoked_at = now()
WHERE user_id = ? AND revoked_at IS NULL` inside their existing transaction.

**API impact**: none (internal to the service layer).

**Frontend integration impact**: none beyond ADR-1's silent-refresh-failure handling
— a revoked user simply fails their next refresh attempt and is redirected to Login,
identical in shape to today's `invalidSession`/`accountSuspended` handling.

---

## ADR-4 — Organization ownership model (no separate membership table)

**Resolves**: risk #6, Part 1 item 2.

**Problem**: the mock has a `Membership` model whose `status` is a literal alias of
`Organization.status` and whose `role` has exactly one possible value
(`docs/backend-discovery/domain-models.md` § Organization Ownership/Membership).

**Decision**: **no `memberships`/`organization_members` table.** The relationship is
represented entirely by `organizations.organizer_user_id UUID NOT NULL UNIQUE
REFERENCES users(id)`.

**Rejected alternative**: carry the membership table forward for "future audit/history
value" — rejected because `admin_activity_log` already captures every ownership-
affecting event (approval, suspension, restoration, demotion) with a timestamp and
actor, which is the only "history" value a membership table could add; a redundant
table that must always agree with `organizations.organizer_user_id` is a
data-integrity liability (two places that can disagree) for zero net new information.

**Reasoning**: the permanent product rule (one organizer, one organization, no
managers, ever) means this relationship will never need to become one-to-many. A
unique foreign key is the simplest correct representation and is directly enforceable
by the database (see ADR-15).

**Database impact**: eliminates a table entirely versus the mock's structure; the
unique constraint on `organizer_user_id` is the sole enforcement mechanism.

**API impact**: none — `GET /organizer/organization` (self) and
`GET /admin/organizations/{id}` both resolve straight from the `organizations` row;
no separate membership DTO exists.

**Frontend integration impact**: `organizationApplication.store.js`'s `membership`
state field is dropped; `application` alone (mapped from `OrganizationResponse`)
carries everything the frontend currently reads from either. This is a **contract
change from the mock** — flagged explicitly, see `rest-api-design.md`'s
traceability table.

---

## ADR-5 — Participation counts (single source of truth)

**Resolves**: risk #8, Part 1 item 3.

**Problem**: the mock stores a seeded `registeredCount` on `Action` and overlays it
client-side with a live count derived from localStorage participation records
(`docs/backend-discovery/domain-models.md` § Action; § risk item 8) — the seed values
are "phantom" counts with no backing participation rows.

**Decision**: **participant count is always calculated from confirmed `participations`
rows, never stored as a counter on `actions`.** The public/organizer/admin action read
paths all compute it via `COUNT(*) FROM participations WHERE action_id = ? AND status
= 'CONFIRMED'` (exposed through the `v_public_actions`-adjacent query layer, see
ADR-13), and capacity checks at join time run inside the same transaction as the
count, using a row lock to prevent a race (see `transactions-and-integrity.md`).

**Rejected alternative**: a denormalized `registered_count` counter column, updated
transactionally on join/cancel — rejected because it reintroduces exactly the
drift risk the mock already suffers from (a counter that must always agree with the
real row count is strictly worse than just computing the row count, at this data
scale — actions have at most a few hundred participants each, a `COUNT(*)` with an
index on `(action_id, status)` is trivially fast).

**Database impact**: no `registered_count` column on `actions` at all. Seed data (Part
18) must create real `participations` rows for any nonzero "registered" figure in demo
data — no unexplained phantom counts, closing the mock's own gap rather than
reproducing it.

**API impact**: every `ActionSummaryResponse`/`ActionDetailsResponse` includes a
`registeredCount` field computed at read time (see `dto-catalogue.md`) — the field
name is preserved for frontend compatibility even though its backend source changes
completely.

**Frontend integration impact**: `features/participation/utils/participationCount.js`
(`getLocalConfirmedCount`, `withOverlaidCount`) becomes dead code once the actions
service is switched to the real API (Phase 4/5 of the implementation order) — the
overlay was only ever needed because the mock's base count couldn't see
localStorage-only joins; a real backend has no such blind spot. This is called out as a
frontend cleanup opportunity for the *next* phase (implementation), not performed now.

---

## ADR-6 — QR token architecture

**Resolves**: risk #3, Part 1 item 4.

**Problem**: the mock token is explicitly unsigned (`docs/backend-discovery/domain-
models.md` § QR Token — "NOT a cryptographically signed token"), and a purely
stateless signed replacement cannot support "regeneration immediately invalidates the
previous token," since a valid-but-superseded JWT would otherwise keep verifying
successfully until its own expiry.

**Decision**: **signed JWT + a minimal server-side "current token pointer"** — not
full Redis-backed session state. A single-row-per-action table,
`qr_check_in_tokens(action_id PK, token_id, issued_at, expires_at,
issued_by_organizer_id)`, always upserted on generate/regenerate (mirrors the mock's
own `upsertQrSession` "always supersedes" behavior). The QR image encodes a signed JWT
with claims `{actionId, organizerId, jti: tokenId, iat, exp}` — **no participant PII**,
matching the mock's own confirmed property exactly. Validation at check-in time:
(1) verify signature, (2) verify `exp` not passed, (3) verify the decoded `jti`
**equals** the `token_id` currently on file for that `actionId` (this is what makes
regeneration invalidate the old token even though it hasn't expired), (4) verify
`organizerId` matches the action's real owning organizer.

**Rejected alternatives**:
- *Pure stateless JWT, no server-side row* — rejected because it cannot satisfy
  "regeneration support" (an old-but-unexpired token would keep validating).
- *Signed JWT + Redis* — rejected as unnecessary infrastructure for the MVP: one row
  per action, always overwritten, is a trivial write pattern a relational table
  handles without a new moving part; Redis is documented as a valid *future* upgrade
  if QR-session write volume ever becomes a real hot path (it will not, at this
  product's scale — one active session per action, regenerated by human action, not
  polling).

**TTL**: 10 minutes, matching the mock's `QR_TOKEN_TTL_MINUTES`, kept as an explicit,
documented constant (not silently changed).

**Replay behavior**: a token remains valid for repeat scans by *different* volunteers
until expiry or regeneration — this is intentional (the token identifies the
session/organizer, not a single participant; each scanning volunteer's own identity is
supplied out-of-band at check-in time, exactly as in the mock). The
duplicate-check-in guard is a separate, independent check (unique constraint on
`attendance.participation_id`, ADR-15), not the token's job.

**Database impact**: `qr_check_in_tokens` table (see `database-schema.md`); no
`qr_sessions`-style history is retained (always overwritten), matching the mock's
scope exactly.

**API impact**: `POST /organizer/actions/{id}/qr-token` (generate/regenerate, same
endpoint per ADR — regeneration is just calling generate again), `POST
/attendance/check-in/qr` (validate + check in in one call, matching the mock's
`checkInByQr` combining decode+expiry+ownership+check-in), and a separate `POST
/attendance/validate-token` for the confirm-screen pre-check the frontend performs
before committing (`CheckInView.vue`'s two-step flow, preserved as-is).

**Security impact**: closes risk #3 entirely — the backend token is genuinely
tamper-resistant, unlike the mock's base64url-only encoding.

**Frontend integration impact**: none to the store/view public API — `attendanceStore
.checkInByQr(token)`, `.regenerateQrSession(actionId)`, `.validateToken(token)` keep
their existing signatures; only the token's internal format changes from base64url
JSON to a signed JWT, which the frontend never parses itself (it only ever passes the
opaque string through).

---

## ADR-7 — Action moderation representation

**Resolves**: risk #10, Part 1 item 5.

**Decision**: **a separate `action_moderation` table**, one row per action
(1:1, PK = FK = `action_id`), **plus** an append-only `action_moderation_history`
table recording every transition.

**Rejected alternative**: columns directly on `actions` — rejected because moderation
is a distinct bounded concern owned by a different actor (admin) than the action's own
lifecycle (owned by the organizer); keeping it in its own table lets the `moderation`
backend module (Part 3) own its schema/migrations independently of the `actions`
module, and makes the eventual `action_moderation_history` audit trail a natural
sibling table rather than a bolt-on. The 1:1 cardinality means this costs one extra
join on every action read, which is negligible.

**Decision on when a moderation row is created**: **eagerly, at action-creation time**
(a service-level transaction creates both the `actions` row and its `action_moderation`
row together, defaulting to `PENDING_REVIEW` for organizer-created actions), **not**
lazily synthesized on first read like the mock's `getModerationRecord` default. Seed
data explicitly sets `APPROVED` for demo/seed actions. This closes risk #10's ambiguity
by choosing the eager, explicit option (recommended in the discovery doc).

**Database impact**: `action_moderation` (current state) + `action_moderation_history`
(append-only transitions) — see `database-schema.md`.

**API impact**: `admin/actions.service.js`'s methods map to
`/admin/actions/{id}/approve|reject|hide|restore`, each writing both tables inside one
transaction.

**Frontend integration impact**: none — `getModeratedActionById`'s decorated shape
(action + moderation status/reason/reviewedAt/reviewedBy) is preserved as a composed
DTO field, regardless of the two-table backend split.

---

## ADR-8 — Organization application representation

**Resolves**: risk #6 (related), Part 1 item 6.

**Decision**: **one `organizations` table**, containing pending/approved/rejected/
suspended records — exactly matching the mock's own model ("the application *is* the
organization record," `docs/backend-discovery/domain-models.md` § Organization
Application/Organization).

**Rejected alternative**: separate `organization_applications` + `organizations`
tables, with an application "promoted" into an organization row on approval —
rejected because it would require a data-migration step (copy fields, mint a new id,
re-point any future FKs) at approval time for no behavioral benefit: there is no case
in the current or planned product where a rejected application needs to exist as a
record independent of what the same row becomes if later resubmitted and approved (the
mock's own `resubmitRejectedApplication` reuses the identical row, not a new one). The
two-table design would also complicate the unique-organizer constraint (ADR-4/ADR-15),
since it would need to span both tables' lifecycles.

**Reasoning**: this is the "select the cleaner backend model while preserving the
frontend workflow" case explicitly invited by the brief — the frontend's model here
is *already* the cleaner one; splitting it would add complexity, not remove it.

**Database/API/frontend impact**: none beyond what ADR-4 already describes — this
decision is what ADR-4's `organizations` table shape assumes throughout.

---

## ADR-9 — Multilingual content storage

**Resolves**: risk (implicit, Part 1 item 7).

**Decision**: **dedicated language columns per translatable field** — e.g.
`actions.title_el` / `actions.title_en`, `organizations.name_el` /
`organizations.name_en` — for the fixed, closed set of two supported locales (`el`,
`en`).

**Rejected alternatives**:
- *JSONB column per field* (e.g. `title JSONB` holding `{el, en}`) — rejected: harder
  to apply per-language `NOT NULL`/length `CHECK` constraints, harder to index for
  search, and offers no benefit unless the set of locales is expected to grow
  dynamically, which it is not (`claude.md`: "The initial application language is
  Greek," no i18n library/locale-expansion plan documented anywhere).
- *Translation tables* (`action_translations(action_id, locale, field, value)`) —
  rejected as over-engineered for exactly two fixed, rarely-changing locales; this
  design earns its complexity only when locale count is open-ended or user-managed,
  neither of which applies here.

**Explicit correction versus the mock**: the mock's `buildOrganizationFieldsFromPayload`
duplicates a single-language form input into both `el`/`en` keys as "a mock
simplification, not a translation" (`docs/backend-discovery/domain-models.md`).
**The backend does not replicate this shortcut.** Both language columns are
independently required, validated fields in the request DTOs (`ActionCreateRequest`,
`OrganizationApplicationRequest` — see `dto-catalogue.md`); if the frontend later still
only collects one language of input from the organizer, that is an explicit frontend
product decision to make during the implementation phase, not a backend data-modeling
shortcut. The backend never auto-copies one language column into the other.

**Database impact**: every bilingual field in `domain-models.md` becomes two columns;
no translation/JSONB tables are created.

**API impact**: DTOs expose both `xxxEl`/`xxxEn` fields (or a nested
`{el, en}` object per field, see `dto-catalogue.md` for the exact chosen shape),
matching the frontend's existing `{el, en}` object convention closely enough to need
only a thin mapping layer, not a redesign.

---

## ADR-10 — Action closure and participation eligibility

**Resolves**: risk #11, Part 1 item 8.

**Decision**: participation (`POST /actions/{id}/participate`) requires **all** of:
`actions.lifecycle_status = 'PUBLISHED'` (not `CLOSED` — this is a deliberate
correction, see below), moderation `status = 'APPROVED'`, organization
`status = 'APPROVED'`. Any of `CLOSED`, `CANCELLED`, `HIDDEN`/`REJECTED` moderation, or
a suspended/pending/rejected organization blocks new joins with a specific, distinct
error code per cause (see `error-contract.md`).

**Explicit correction versus the mock**: the mock's `joinAction` only checked
`isPastDate`, never `organizerStatus === 'closed'`
(`docs/backend-discovery/business-rules.md` § Participation; risk #11) — a real gap
this design closes. **Public visibility and participation eligibility are related but
distinct policies**, as the brief requires: an action can be publicly *visible* while
`CLOSED` (closed actions still show in listings/history, per
`PUBLIC_VISIBLE_STATUSES = [published, closed]` in the mock,
`domain-models.md` § enums) without being *joinable* — visibility answers "can anyone
see this," eligibility answers "can a volunteer join this right now." The backend
keeps them as two separate authoritative checks (`ActionVisibilityQueryService` vs. a
`ParticipationEligibilityService`), never one conflated boolean.

**Reasoning**: closing this gap is explicitly required by the brief's Part 1 item 8,
and matches the intuitive product meaning of "closed" (organizer stopped taking new
signups) independent of whether the mock's own service code happened to enforce it.

**Database/API impact**: capacity/eligibility checks happen inside the join
transaction (see `transactions-and-integrity.md`); no schema impact beyond the
existing `lifecycle_status`/moderation/organization-status columns already designed.

**Frontend integration impact**: `ParticipationPanel.vue`'s existing `isOrganizerClosed`
UI branch already assumes this behavior (it just wasn't backed by the mock service) —
**no frontend change is required**, the backend simply makes the UI's existing
assumption true.

---

## ADR-11 — Check-in time window enforcement

**Resolves**: risk #12, Part 1 item 9.

**Decision**: **hard-enforced for QR self-check-in, not enforced (organizer
discretion) for manual check-in.** Window: opens 30 minutes before `actions.start_at`,
closes 180 minutes after `start_at` (identical numbers to the mock's
`CHECK_IN_WINDOW`) — computed in the action's own `timezone` column (default
`Europe/Athens`, see ADR-19/Part 17), converted to a UTC instant for comparison against
the server's UTC clock.

**Rejected alternative**: enforce the window identically for both check-in methods —
rejected because manual check-in exists precisely for the case where the organizer is
physically present and vouching for a volunteer's attendance outside normal
constraints (late arrival, a QR scan failure, etc.); removing organizer discretion
there would make manual check-in strictly redundant with QR check-in, defeating its
purpose. No override flag is introduced for QR check-in itself — if the window should
flex, the organizer uses manual check-in, which already has no window restriction.

**Explicit correction versus the mock**: the mock's window is UI-informational only,
never enforced by the service (`docs/backend-discovery/business-rules.md` § Attendance
and QR; risk #12). The backend makes it a real, hard rule for the self-service QR path,
closing this gap deliberately rather than silently carrying the mock's leniency
forward.

**Database/API impact**: no new columns (`start_at`/`timezone` already needed for
scheduling); the check is service-level, evaluated at `POST /attendance/check-in/qr`
time. `error-contract.md` defines the new `attendance.outsideCheckInWindow` error code.

**Frontend integration impact**: `checkInWindow.js`'s `showWindowNotice` UI already
exists as an informational banner on the organizer's QR screen — it now doubles as an
accurate preview of a real constraint rather than pure decoration; the volunteer-
facing `CheckInView.vue` gains one new possible failure phase
(`outsideCheckInWindow`), a small, additive frontend change to make during the
implementation phase.

---

## ADR-12 — Duplicate report prevention scope

**Resolves**: risk #14, Part 1 item 10.

**Decision**: a reporter may not submit a new report for the same action while an
existing report from them on that action is `OPEN` **or** `INVESTIGATING`. `RESOLVED`/
`DISMISSED` do not block a fresh report.

**Explicit correction versus the mock**: the mock only checked `status === 'open'`,
allowing a duplicate submission while a prior report from the same reporter was
already `investigating` (`docs/backend-discovery/business-rules.md` § Reports; risk
#14). The backend closes this by treating both active states as blocking.

**Reasoning**: "investigating" is still an active, unresolved report from that
reporter's perspective — allowing a second one adds noise without new signal (the
reporter can still add context via the existing `description` field on their original
report if they think of something later — no separate "add a comment" feature exists
or is proposed here, staying within current scope).

**Database impact**: generated-column + `UNIQUE` index (`active_report_key`) on
`action_reports` — the MySQL-compatible replacement for what would have been a
PostgreSQL partial index (see ADR-15/ADR-17/`database-schema.md`).

**API impact**: `error-contract.md` maps this to `admin.duplicateOpenReport` (name
kept from the mock's existing error code for frontend compatibility, semantics
widened).

---

## ADR-13 — Public action visibility: single authoritative policy

**Resolves**: risk #16, Part 1 item (implicit throughout Part 10).

**Decision**: **one database view, `v_public_actions`**, encodes the full boolean
policy (`lifecycle_status IN ('PUBLISHED','CLOSED')` AND action_moderation.status =
`'APPROVED'` AND organizations.status = `'APPROVED'` AND organizations is not
suspended AND action is not cancelled/hidden/rejected), wrapped by exactly one
service, `ActionVisibilityQueryService` (`actions` module), that every controller
needing "is this action public" (public list, public details, map, and any admin
dashboard summary that wants a "published count") must call — **never re-derive the
boolean itself**. This is the direct fix for risk #16 (`AdminDashboardView.vue`
duplicating the policy inline in the mock).

**Rejected alternatives**:
- *Repository-level `@Query` duplicated per use site* — rejected, this is exactly the
  duplication problem being fixed.
- *Application-only policy object querying three separate repositories per call, no
  view* — viable but slower for list endpoints (three round trips or a manual join
  in Java instead of letting the database do it); a view keeps the logic in one place
  *and* lets the database optimize it once, indexed.

**404 vs 403 policy**: a non-visible action (draft/cancelled/rejected/hidden/wrong
org-status) returns **404 Not Found** to an anonymous or non-owning caller — never
403 — preserving the mock's exact behavior and its stated rationale (avoid leaking
existence). An owning organizer or an administrator always sees the full record
through their own dedicated endpoints (`/organizer/actions/{id}`,
`/admin/actions/{id}`), which bypass `v_public_actions` entirely and apply ownership/
role authorization instead.

**Database impact**: `v_public_actions` view (see `database-schema.md`).

**API impact**: `GET /actions`, `GET /actions/{id}`, `GET /map/actions` (if a
dedicated map endpoint is introduced, see `rest-api-design.md`) all query this view;
`GET /admin/dashboard/summary` also queries it for its "published actions" count,
rather than recomputing the boolean.

---

## ADR-14 — Role storage model

**Decision**: **a single `role` enum column on `users`**, not an authorities/roles
join table.

**Reasoning**: the permanent product rule is that a user has exactly one role at a
time (never volunteer-and-organizer simultaneously); a many-to-many authorities table
is the correct pattern when a principal can hold multiple roles concurrently, which
this product will never need. Spring Security's `GrantedAuthority` model still works
perfectly with a single-column role (mapped to one authority per request), so there is
no framework-imposed reason to add the join table either.

**Rejected alternative**: `user_authorities(user_id, authority)` many-to-many table —
rejected as unneeded complexity per the permanent single-role rule.

**Database/API impact**: `users.role` enum column (ADR handled fully in ADR-16/
`database-schema.md`); JWT `role` claim is a single string, not an array.

---

## ADR-15 — Database-level enforcement of business rules (not application-only)

**Resolves**: risk #4 (unique constraint not enforced at DB level), Part 1 item 4 of
the closing checklist ("must be enforced independently of frontend/application code").

**Decision**: every uniqueness/integrity rule identified in
`docs/backend-discovery/business-rules.md`'s "Database uniqueness constraints implied"
section becomes a **real constraint or partial unique index**, not merely a service-
layer check:

| Rule | Enforcement |
|---|---|
| One organizer per organization | `UNIQUE (organizer_user_id)` on `organizations` |
| Unique, case-insensitive user email | plain `UNIQUE (email)` index, made case-insensitive by the table's `utf8mb4_0900_ai_ci` collation (ADR-17) |
| No duplicate active confirmed participation | generated-column + `UNIQUE` index (`active_confirmation_key`) on `participations` — MySQL-compatible replacement for a PostgreSQL partial index (ADR-17, `database-schema.md`) |
| No duplicate active check-in per participation | `UNIQUE (participation_id)` on `attendance` (one attendance row per participation, ever) |
| No duplicate active open/investigating report per reporter/action | generated-column + `UNIQUE` index (`active_report_key`) on `action_reports` — same MySQL-compatible pattern (ADR-17, `database-schema.md`) |
| One moderation record per action | `action_moderation.action_id` is itself the primary key (1:1 by construction) |
| Valid latitude/longitude | `CHECK` constraints on range, plus a `CHECK` that both are null or both are set |
| Valid capacity | `CHECK (capacity > 0)` |
| Rejection reason required when rejected | `CHECK` constraints on `organizations` and `action_moderation` |

**Reasoning**: this is the direct fix for the discovery's most-repeated critical
finding — every one of these rules existed only in mock JavaScript, checkable by
nothing once a request bypasses the frontend. Application-level (`@Valid`/service)
checks are kept **in addition**, for good error messages before hitting the database,
but the constraint is the actual source of truth against races and direct-API misuse.

**Database impact**: fully specified in `database-schema.md`.

---

## ADR-16 — Build tool

**Decision**: **Maven**.

**Reasoning**: broader team/ecosystem familiarity than Gradle for a Spring Boot
monolith of this size, XML-based reproducible builds with no Groovy/Kotlin DSL
learning curve, Spring Initializr's default and best-documented path, and no current
requirement (multi-module polyglot builds, custom build logic, incremental-build
performance at scale) that would justify Gradle's added flexibility.

**Rejected alternative**: Gradle — a reasonable choice but not clearly better for a
single-module (or lightly-modularized, see `system-architecture.md`) monolith; would
add a learning-curve cost with no offsetting MVP benefit.

---

## ADR-17 — Database engine: MySQL replaces PostgreSQL

**Problem**: this architecture was originally drafted against PostgreSQL 16
throughout (`database-schema.md`, `system-architecture.md`,
`local-development-and-integration.md`). The team decided, after this architecture
was first approved, to standardize on MySQL instead, matching the development team's
existing operational experience.

**Decision**: **MySQL 8.x (an actively supported release), InnoDB, `utf8mb4` with the
`utf8mb4_0900_ai_ci` collation, MySQL Connector/J, Spring Data JPA, Hibernate, and
Flyway with MySQL-dialect migrations** replace PostgreSQL 16 everywhere in this
architecture and in the backend implementation. No PostgreSQL driver, extension, or
PostgreSQL-only SQL syntax is used anywhere in the backend.

**Why MySQL**: it matches the development team's existing experience (the stated
reason for revisiting the original PostgreSQL choice), remains fully compatible with
Spring Data JPA/Hibernate/Flyway, and every PostgreSQL-specific mechanism the original
design relied on has a documented, equally-safe MySQL-native equivalent (below) — there
was no feature genuinely unique to PostgreSQL that this product depends on.

**PostgreSQL-specific designs replaced** (full detail in `database-schema.md`):

| PostgreSQL mechanism | MySQL replacement | Where documented |
|---|---|---|
| Partial unique indexes (`WHERE status = 'CONFIRMED'` / `WHERE status IN (...)`) | Generated (computed) `STORED` column that is `NULL` for inactive rows, plus a regular `UNIQUE` index on that column — MySQL unique indexes treat multiple `NULL`s as non-duplicate, exactly like PostgreSQL's | `database-schema.md` § `participations`, § `action_reports` |
| `unaccent` extension + `lower()` functional index | Column/table collation `utf8mb4_0900_ai_ci` (accent-insensitive **and** case-insensitive, Unicode-9.0-based, correct for Greek tonos/diacritics and English) | `database-schema.md` § Character set and collation; `rest-api-design.md` § Pagination, filtering and search |
| `JSONB` | MySQL `JSON` for genuinely free-form, never-filtered data (`admin_activity_log.metadata`); a normalized join table for data that *is* filtered/queried (`organizations.categories` → `organization_categories`) | `database-schema.md` § `admin_activity_log`, § `organizations` |
| Native `CREATE TYPE ... AS ENUM` | Java `enum` + `@Enumerated(EnumType.STRING)` + `VARCHAR` column + `CHECK` constraint (MySQL 8.0.16+ enforces `CHECK`) | `database-schema.md` § Enum types |
| `gen_random_uuid()` / `pgcrypto` | Application-generated `java.util.UUID` (`UUID.randomUUID()`), stored as `CHAR(36)` consistently across every table (never `BINARY(16)`, never mixed) | `database-schema.md` § UUID strategy |
| `TIMESTAMPTZ` | `DATETIME(6)`, with the application, JDBC connection, and Hibernate all pinned to UTC — never MySQL `TIMESTAMP` (session-timezone-converting, 2038-limited) | `database-schema.md` § Time, dates, and timezone policy |
| Native array columns (`action_category[]`, `TEXT[]`) | Normalized join table where the data is filtered/queried (`organization_categories`); MySQL `JSON` array where it is only ever read/displayed whole (`actions.required_equipment_el/en`) | `database-schema.md` § `organizations`, § `actions` |
| `INSERT ... ON CONFLICT ... DO UPDATE` | `INSERT ... ON DUPLICATE KEY UPDATE` | `database-schema.md` § `qr_check_in_tokens` |
| Transaction isolation reasoning tied to "PostgreSQL's default (`READ COMMITTED`)" | InnoDB's default isolation level is `REPEATABLE READ`, not `READ COMMITTED` — re-verified as still safe for every locking operation in `transactions-and-integrity.md`, since `SELECT ... FOR UPDATE` row/gap locking under `REPEATABLE READ` provides equal-or-stronger protection against the specific races those operations guard against | `transactions-and-integrity.md` |

**Rejected alternative**: keep PostgreSQL — rejected per the team's explicit decision
to standardize on the database engine matching its existing operational experience;
nothing in this product's requirements depends on a PostgreSQL-only capability that
lacks a safe MySQL equivalent (see table above).

**Consequences and tradeoffs**:
- MySQL's lack of partial indexes means the two active-uniqueness rules
  (`participations`, `action_reports`) need one extra generated column each — a small,
  well-understood, one-time schema cost, still fully database-enforced (not a
  service-level-only check) and safe under concurrent requests.
- `utf8mb4_0900_ai_ci` collation replaces a PostgreSQL extension
  (`unaccent`) with a built-in MySQL 8 feature — simpler operationally (no extension
  to enable per migration) but slightly less flexible than a dedicated
  unaccent-then-compare function if a future requirement ever needed accent-sensitive
  search on some columns and accent-insensitive on others; not a concern for this
  product today (every searchable column wants the same accent/case-insensitive
  behavior).
- MySQL's `JSON` type has no PostgreSQL-`JSONB`-style separate binary storage format;
  this has no observable impact here since `metadata` is never queried by key.
- InnoDB's default `REPEATABLE READ` (vs. PostgreSQL's default `READ COMMITTED`) is
  documented explicitly in `transactions-and-integrity.md` rather than silently
  inherited, since the original transaction design's reasoning explicitly named
  PostgreSQL's default.
- CI, local development, and production all standardize on one engine (MySQL),
  removing any risk of PostgreSQL-only syntax accidentally reaching a MySQL-only
  environment or vice versa.

**Database/API/security/frontend-integration impact**: fully absorbed by
`database-schema.md`, `system-architecture.md`, and
`local-development-and-integration.md`'s MySQL-specific rewrites; no frontend-visible
contract changes (every DTO shape, error code, and endpoint from the original design
is unchanged — this ADR is purely a persistence-layer decision).

---

## ADR-18 — Permanent removal of the reserved MODERATOR role

**Problem**: the frontend's `roles.js` constant file and `claude.md`'s original
"prepare the architecture for these roles" list both included a `MODERATOR` value,
documented throughout discovery as "reserved, not active" — no mock user, no route, no
UI branch, and no navigation entry ever reference it
(`docs/backend-discovery/domain-models.md`, `docs/backend-discovery/routes-and-
authorization.md`). The first draft of this architecture (`database-schema.md`'s
`user_role` enum, `domain-model-and-state-machines.md`'s `UserRole` section) carried
`MODERATOR` forward as a reserved-but-unused enum literal, "kept... so a future
explicit scope change does not require an enum migration."

**Decision**: **`MODERATOR` is permanently removed, not merely left unused.** The
product supports exactly three roles — `VOLUNTEER`, `ORGANIZER`, `ADMINISTRATOR` —
now and in the future. The backend `UserRole` Java enum, the `users.role` `CHECK`
constraint, every authorization matrix, every DTO/API document, and every seed-data
description contain only these three values. No `ModeratorController`, moderator
route, moderator permission, or moderator TODO/placeholder exists or will be added.

**Rejected alternative**: keep `MODERATOR` reserved-but-unused in the enum/`CHECK`
constraint "for future flexibility," as the first draft did — rejected because it
is explicit product direction that there will not be a moderator role now or in the
future; carrying forward an unused literal in a `CHECK` constraint and a Java enum is
speculative scope-creep surface area (an unused value some future developer might be
tempted to wire up) with no present or planned benefit, and contradicts the explicit
instruction to remove it permanently rather than merely leave it inactive.

**Frontend note**: the frontend's own `roles.js` constant (which still contains a
`MODERATOR: 'moderator'` value, per discovery) is **not modified** by this phase — the
frontend is explicitly out of scope for this backend-foundation phase, and that
reserved frontend value was already documented as inert (no route, no mock user, no UI
branch). It is recorded here as **permanently unsupported** — useful context for a future
frontend cleanup pass — not as a value the backend will ever accept, activate, or
migrate toward.

**Database impact**: `database-schema.md`'s `user_role` representation (`VARCHAR(20)`
+ `CHECK (role IN ('VOLUNTEER','ORGANIZER','ADMINISTRATOR'))`) has exactly three
literals; the Flyway `V1__foundation_and_auth_schema.sql` migration never creates or
references a `MODERATOR` value.

**API/security impact**: `security-and-authentication.md`'s route/role authorization
matrices, `dto-catalogue.md`'s role-field documentation, and every JWT `role` claim
example reference only the three supported roles (already true throughout the
first-draft documents — confirmed by full-text review, see the backend-architecture
document set).

**Frontend integration impact**: none — no route, store, or mock in the current
frontend ever assigns or checks `MODERATOR`, so this ADR changes no frontend-visible
behavior; it only forecloses a future backend feature that was never active.

---

## Summary of decisions carried unchanged from discovery (no new ADR needed)

- Certificates, exports, payments, donations remain excluded — no backend design
  element anywhere references them.
- Volunteer-only participation join **gains** real server-side enforcement (risk #1,
  closed by ordinary role-based authorization at the `POST /actions/{id}/participate`
  endpoint — see `security-and-authentication.md`; no separate ADR needed, it is a
  standard authorization rule, not an architectural trade-off).
- Organizer demotion cascade **must run inside one transaction** — resolved fully in
  `transactions-and-integrity.md`, cross-referenced here as risk #2's closure.
