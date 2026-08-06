# API Integration — Users & Roles

Implemented in `docs/reports/2026-08-06-users-and-roles-backend-integration.md`. This
document describes the final, actually-implemented backend/frontend contract for the
Users & Roles domain: current-user profile self-service, and administrator user
management. Builds directly on the existing `users`/`refresh_tokens` schema and the
authentication domain (`docs/backend-discovery/api-authentication.md`) — no new table
was needed.

---

## Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/v1/users/me` | authenticated | Canonical current-user profile — identical data to `GET /auth/me` (see below) |
| PATCH | `/api/v1/users/me` | authenticated | firstName/lastName/localePreference only |
| GET | `/api/v1/admin/users` | `ADMINISTRATOR` | Paginated list, search + role/status filters |
| GET | `/api/v1/admin/users/{id}` | `ADMINISTRATOR` | Full administrative detail |
| PATCH | `/api/v1/admin/users/{id}` | `ADMINISTRATOR` | firstName/lastName/email/localePreference |
| POST | `/api/v1/admin/users/{id}/suspend` | `ADMINISTRATOR` | Idempotent; revokes all refresh tokens |
| POST | `/api/v1/admin/users/{id}/reactivate` | `ADMINISTRATOR` | Idempotent; does not restore tokens |

`GET /api/v1/auth/me` (from the authentication phase) is **unchanged and still live** —
it and `GET /users/me` both resolve through the exact same `UserService.getCurrentUser`
implementation, so they can never drift apart. The distinction is purely which domain
"owns" the route conceptually: `/auth/me` is there for session/authentication
restoration (that's what the frontend's boot-time flow actually calls); `/users/me` is
the canonical profile endpoint, and the one that also owns self-editing
(`PATCH /users/me`).

---

## Permanent Role Rules

- Exactly three roles: `VOLUNTEER`, `ORGANIZER`, `ADMINISTRATOR`. No `MODERATOR` (ADR-18,
  and `UserRoleTest` proves this at the enum level).
- Public registration always creates `VOLUNTEER` — unchanged from the authentication
  phase.
- **No generic role-change endpoint exists anywhere in this API.** Neither
  `UpdateCurrentUserRequest` nor `UpdateAdminUserRequest` has a `role` field — proven
  by an integration test that submits a `role` value in the PATCH body and confirms
  it's silently ignored.
- Volunteer → Organizer only happens through the future Organizations phase's
  application-approval flow — not built yet.
- Organizer → Volunteer (demotion) is **deliberately deferred** to that same phase: the
  cascade needs to delete `organizations`/`actions`/`participations`/`attendance`/
  `qr sessions`/`reports`/`moderation records`, none of which exist as real tables yet.
  Implementing a partial demotion endpoint now would either silently do nothing to
  those (nonexistent) tables or require inventing throwaway logic that gets rewritten
  the moment those tables exist — neither is acceptable, so no demotion endpoint of any
  kind exists in this phase.
- The only way to grant `ADMINISTRATOR` or `ORGANIZER` locally today is a manual SQL
  `UPDATE` (see `backend/README_LOCAL.md` § 9) — never a public endpoint, and never
  will be without a separately-approved secure process.

---

## Request DTOs

### `UpdateCurrentUserRequest` (`PATCH /users/me`)

```json
{ "firstName": "Δήμητρα", "lastName": "Παπαδοπούλου", "localePreference": "en" }
```

| Field | Required | Validation |
|---|---|---|
| `firstName` | yes | `@NotBlank`, max 100 |
| `lastName` | yes | `@NotBlank`, max 100 |
| `localePreference` | no | `el` or `en` if present |

No `email` field — self-service email changes are not supported by the approved
architecture. No `role`/`status`/`id`/`passwordHash`/`createdAt`/`version` field, ever.

### `UpdateAdminUserRequest` (`PATCH /admin/users/{id}`)

```json
{ "firstName": "A", "lastName": "B", "email": "new@onehelp.local", "localePreference": "en" }
```

| Field | Required | Validation |
|---|---|---|
| `firstName` | yes | `@NotBlank`, max 100 |
| `lastName` | yes | `@NotBlank`, max 100 |
| `email` | yes | `@Email`, max 255, unique excluding self |
| `localePreference` | no | `el` or `en` if present |

`email` is included here (unlike self-edit) — matching the already-approved
`dto-catalogue.md` `UpdateUserRequest` shape and the pre-existing frontend admin edit
dialog's actual fields. `localePreference` is accepted but not yet sent by the current
UI (no form field for it) — a documented, forward-looking capability, not a UI gap.

---

## Response DTOs

### `UserSummaryResponse` (one row of `GET /admin/users`)

```json
{
  "id": "...", "firstName": "A", "lastName": "B", "email": "a@onehelp.local",
  "role": "VOLUNTEER", "status": "ACTIVE", "avatarInitials": "AB",
  "createdAt": "2026-08-06T12:00:00Z"
}
```

### `UserDetailsResponse` (`GET /admin/users/{id}`)

Same fields as `UserSummaryResponse` plus `localePreference`, `updatedAt`, `version`.
**No organization field of any kind** — organizer organization data does not exist in
the backend yet; a nullable placeholder would still imply a promise this phase cannot
back, so the field is omitted entirely rather than fabricated (per the task brief's
explicit instruction).

### `UserStatusChangeResponse` (`POST .../suspend`, `.../reactivate`)

```json
{ "id": "...", "status": "SUSPENDED", "updatedAt": "2026-08-06T12:05:00Z" }
```

### `PageResponse<UserSummaryResponse>` (`GET /admin/users`)

```json
{ "content": [ /* UserSummaryResponse[] */ ], "page": 0, "size": 20, "totalElements": 42, "totalPages": 3 }
```

Implemented for real in this phase (`common.web.PageResponse<T>`) — previously only
documented in `dto-catalogue.md`, never built.

### Casing (frontend consumers)

Same rule as the authentication phase: the backend serializes `role`/`status`
uppercase (Java enum `name()`); the frontend's `ROLES`/`ACCOUNT_STATUS` constants are
lowercase. `frontend/src/services/normalizeApiUser.js` (already built in the
authentication-integration phase) is reused unchanged for every user object this
domain returns — list rows, details, and status-change responses alike.

---

## Pagination, Search, Filters

- `page` (0-based, default 0), `size` (default 20, **capped at 100** — a request for
  more silently gets 100, never an unbounded list).
- `search` — matches `firstName`, `lastName`, or `email`, via SQL `LIKE '%...%'`.
  Accent- and case-insensitive **for free**, from the `users` table's own
  `utf8mb4_0900_ai_ci` collation (`database-schema.md`) — no `lower()`/normalization
  needed in the query.
- `role` — one of `VOLUNTEER`/`ORGANIZER`/`ADMINISTRATOR`, exact match.
- `status` — one of `ACTIVE`/`SUSPENDED`, exact match.
- `sort` — standard Spring Data `sort=field,direction` (e.g. `sort=lastName,asc`);
  defaults to `createdAt,desc` (newest first, matching the mock's own `getUsers()`
  ordering).
- No Flyway migration was needed for search performance — a leading-wildcard `LIKE`
  can't use a B-tree index either way, and the existing `ix_users_role`/`ix_users_status`
  indexes already help the filter side at this scale. A full-text index was considered
  and rejected as disproportionate for an MVP admin tool.

---

## Validation

| Rule | Enforced where | Response |
|---|---|---|
| `firstName`/`lastName` blank or > 100 chars | `@Valid` | 422 `validation.failed` |
| `email` malformed, blank, or > 255 chars (admin edit only) | `@Valid` | 422 `validation.failed` |
| `localePreference` not `el`/`en` | `@Valid` (`@Pattern`, only checked if present) | 422 `validation.failed` |
| Duplicate email on admin edit (case-insensitive, excludes self) | `UserServiceImpl.updateAdminUser` | 409 `admin.duplicateEmail` |
| Unknown user id (admin details/edit/suspend/reactivate) | `UserServiceImpl` | 404 `users.notFound` |
| Admin suspends their own account | `UserServiceImpl.suspendUser` | 400 `users.selfSuspensionNotAllowed` |
| Non-administrator calls any `/admin/users/**` endpoint | `@PreAuthorize` (class-level) | 403 `common.forbidden` |
| No access token / invalid token | `JwtAuthenticationFilter` + entry point | 401 `common.unauthenticated` |

---

## Error Codes — What Changed From the Task Brief's Suggested List

The task brief suggested `users.concurrentModification` for an optimistic-lock
conflict. **Reused the already-documented, already-implemented generic
`common.staleWrite` (409) instead** — `error-contract.md` already defines exactly this
code for *any* domain's `@Version` mismatch, and introducing a redundant
domain-specific code for the identical situation would be the "inconsistent
representation" this same task brief explicitly warns against elsewhere (Part 9).

The task brief suggested `users.alreadySuspended`/`users.alreadyActive` "only if
choosing conflict behavior." **Idempotent was chosen instead** (see § Suspension
Behavior below) — so neither code exists; suspending an already-suspended user (or
reactivating an already-active one) simply succeeds and returns the current state.

`admin.duplicateEmail` (not a task-brief-suggested `users.*` code) was used for the
admin-edit duplicate-email case specifically because `error-contract.md` already
documents exactly this code, for exactly this scenario, from the original architecture
phase — reusing established, approved naming rather than inventing a parallel one.

---

## Suspension Behavior

- **Idempotent.** Suspending an already-suspended user returns `200` with the current
  (unchanged) state — no error, no re-revocation. Same for reactivating an
  already-active user. Chosen over a `409`-conflict alternative because a double-click
  or a second admin tab acting on stale data is a harmless, common occurrence for this
  operation, and a confusing conflict toast for a no-op action would be worse UX than
  quietly confirming the (already-true) resulting state.
- **Refresh-token revocation is transactional with the status change** — reuses the
  existing `RefreshTokenService.revokeAllForUser` (no duplicated SQL), inside the same
  `@Transactional` method as the `status → SUSPENDED` write. A suspension can never
  commit without also invalidating existing refresh tokens.
- **Reactivation explicitly does not un-revoke anything** — the user must log in again
  from scratch. Verified by an integration test: the pre-suspension refresh cookie
  remains dead (`401 auth.invalidSession`) even after reactivation, while a fresh login
  immediately succeeds.
- **Login/refresh contract, matching the existing authentication phase exactly** (no
  change was needed there): a suspended account's login attempt returns
  `403 auth.accountSuspended`; its refresh attempt returns the same; `/auth/me` and
  `/users/me` both reject a suspended caller the same way, via the shared
  `common.exception.AccountSuspendedException` (moved from `auth.exception` to
  `common.exception` in this phase specifically because both domains now throw it).
- **Access-token staleness window, unchanged**: an already-issued access token remains
  technically valid for its remaining ≤15-minute TTL on endpoints that don't re-read
  live state — an accepted, already-documented trade-off (ADR-3), not new to this
  phase.
- **No cascade into domain data.** Suspension never deletes the user or any of their
  records; organization consequences (if the suspended user happens to be an
  organizer) are explicitly deferred to the Organizations phase, since that domain
  doesn't exist as real tables yet.

---

## Database

**No new Flyway migration.** The existing `users` table (from the authentication
phase's `V1__foundation_and_auth_schema.sql`) already has every column, index, and
constraint this domain needs: `role`/`status` CHECK constraints, `ix_users_role`,
`ix_users_status`, `uk_users_email`, `version` (optimistic locking, already present,
simply not yet exercised by any endpoint before this phase).

---

## Frontend Files Created

- Nothing new beyond what the authentication-integration phase already built
  (`normalizeApiUser.js`, `authSession.js`) — this phase reuses both unchanged.

## Frontend Files Modified

- `frontend/src/features/admin/services/adminUsers.service.js` — rewritten to call the
  real endpoints. `suspendUser`/`reactivateUser`/`updateUserProfile` **no longer take
  an `adminUserId` parameter** — the backend derives the acting administrator from the
  bearer token (`CurrentUserProvider`), the same way every other real endpoint already
  does; the mock's own signature required it only because the mock had no token
  concept at all.
- `frontend/src/features/admin/stores/adminUsers.store.js` — rewritten for real
  server-side pagination/search/filters (`page`, `size`, `totalPages`, `totalElements`,
  `search`, `role`, `status` state; `setPage`/`setSearch`/`setRole`/`setStatus`
  actions). Debounced search follows the exact same `setTimeout` pattern already
  established by `actions.store.js::setSearch`, plus a request-sequence guard (a gap
  that existing pattern doesn't cover) so a slow, superseded request can never
  overwrite a newer one's result.
- `frontend/src/features/admin/views/AdminUsersView.vue` — every existing dialog,
  list-item layout, and button preserved unchanged. Added: a role filter `VSelect`, a
  status filter `VSelect`, and a `VPagination` control below the list — the minimum UI
  additions actually required to offer real server-side filtering/pagination (there
  was no way to "map filters to API query parameters" per the task brief without some
  control to set them). The old client-side `matchesSearchQuery`-based filtering
  (which searched translated role/status text as a side effect of having no real
  filters) is gone — replaced by real filters. No role-changing control was removed,
  because none ever existed in this view.
- `frontend/src/locales/{en,el}/admin.js` — added `users.filters.{roleLabel,
  statusLabel,allRoles,allStatuses}`.

## Mock/Storage Files Retained

`userRole.storage.js`, `userProfileOverride.storage.js`, and
`admin/mocks/userStatus.storage.js` are **all still load-bearing** and were **not**
touched — confirmed by grep before making any change:

- `organizerActions.service.js`, `AdminReportsView.vue` import `getUserById`.
- `AdminActionsView.vue`, `AdminOrganizationsView.vue`, `organizationIntegrity.js`
  import `getAllUsers`.

All five consumers belong to domains that remain fully mocked in this phase
(participation identity resolution, reports, organizer-owned actions, organization
integrity checks) — none of the ids they resolve are guaranteed to exist in the real
`users` table, and `organizerActions.service.js`'s own caller is an `ORGANIZER`, not an
`ADMINISTRATOR`, so routing it through the new admin-only endpoint would immediately
403. `auth.service.js`'s `getUserById`/`getAllUsers` therefore remain **fully mocked,
unconditionally** — not gated by `VITE_DATA_SOURCE` at all — exactly as documented in
the prior phase's own report, confirmed unchanged here.

## Mock/Storage Files Removed

None. Every mock/storage module considered for removal still has at least one real
consumer in a still-mocked domain.

---

## Known Limitations

- **No admin activity logging.** The architecture's future `admin_activity_log` domain
  does not exist yet — suspend/reactivate/edit operations are **not** audited anywhere
  in this phase. This is a deliberate, documented gap (per the task brief's own Part
  19), not a silent omission: no fake/partial activity log was created, and no
  operation claims to be audited when it isn't.
- **No organization data on organizer user details.** `UserDetailsResponse` has no
  organization field at all — see § Permanent Role Rules.
- **No role-history/status-history table.** Only the current `role`/`status` value is
  ever visible — not required by the approved architecture, and adding one
  speculatively was explicitly out of scope.
- **Admin edit's `localePreference` field has no UI control yet** — accepted by the
  backend, never sent by the current edit dialog (which the task brief explicitly
  said not to redesign).

## Next Integration Dependencies

- **Organizations & Organizer Applications** (the suggested next phase) needs: the
  `organizations` table, the approval flow that's the *only* path to `ORGANIZER`, and
  the demotion cascade this phase deliberately deferred.
- Once Organizations exists, `UserDetailsResponse` can gain a real
  `organizationSummary` field (resolved via a live join, never denormalized — matching
  `dto-catalogue.md`'s existing "no stored organization name on the action" precedent).
- A future Admin Activity phase should wire suspend/reactivate/edit into the same audit
  write-path it introduces for every other domain — not a bolt-on added just to this
  domain later.
