# Phase Report — OneHelp Users & Roles Backend — Admin User Management & Incremental Frontend Integration

## Summary

Implemented the real Users & Roles backend domain and wired the admin user-management
frontend feature to it, making the backend the source of truth for the user directory,
account status, and current-user/admin profile editing. Authentication continues
working exactly as before (verified, not just assumed). Organizations, Organizer
Applications, and Actions were not touched — no role-change endpoint, no promotion, no
demotion exists anywhere in this API, by explicit permanent design. Full validation:
`./mvnw clean verify` (73/73 tests, including new real-MySQL integration tests) and a
live manual sweep through the actual Vue admin UI against the running backend — real
search, real pagination, real suspend/reactivate/edit, each independently confirmed in
MySQL and via direct login attempts.

One real bug was found and fixed during this phase: Spring Security's `@PreAuthorize`
method-security rejections were being caught by the global `@RestControllerAdvice`'s
generic exception handler (returning a misleading 500) before Spring Security's own
filter-level 403 handler ever got a chance — see § Bugs Found.

## Source Documents Reviewed

All 17 explicitly required, in full, before any code change:
`docs/reports/2026-08-06-authentication-foundation.md`,
`docs/reports/2026-08-06-authentication-frontend-integration.md`,
`docs/backend-discovery/api-authentication.md`,
`docs/backend-discovery/frontend-mock-inventory.md`,
`docs/backend-discovery/domain-models.md`, `docs/backend-discovery/service-contracts.md`,
`docs/backend-discovery/business-rules.md`,
`docs/backend-discovery/routes-and-authorization.md`,
`docs/backend-discovery/frontend-backend-replacement-map.md`,
`docs/backend-discovery/risks-and-open-decisions.md`,
`docs/backend-architecture/database-schema.md`,
`docs/backend-architecture/rest-api-design.md`, `docs/backend-architecture/dto-catalogue.md`,
`docs/backend-architecture/security-and-authentication.md`,
`docs/backend-architecture/error-contract.md`,
`docs/backend-architecture/transactions-and-integrity.md`, `claude.md`. Also inspected,
before writing or removing anything: `backend/.../users/**`, `backend/.../auth/**`,
`backend/.../common/security/**`, `db/migration/**`, and every listed frontend file.
Grepped every consumer of `getUserById`/`getAllUsers`/`userStatus.storage`/
`userProfileOverride.storage`/`userRole.storage`/`users.mock` before deciding what
could change — none were removed; see § Mock Files Retained.

## Backend Endpoints Implemented

`GET/PATCH /api/v1/users/me`, `GET /api/v1/admin/users` (paginated, search + role/status
filters), `GET/PATCH /api/v1/admin/users/{id}`, `POST /api/v1/admin/users/{id}/suspend`,
`POST /api/v1/admin/users/{id}/reactivate`. `GET /api/v1/auth/me` kept unchanged and
still live, now delegating to the same `UserService.getCurrentUser` implementation
`/users/me` uses — see `docs/backend-discovery/api-users-and-roles.md` for the full
contract, DTOs, and per-endpoint validation/error table.

## Role Rules Enforced

Exactly `VOLUNTEER`/`ORGANIZER`/`ADMINISTRATOR`, no `MODERATOR` (already proven by the
existing `UserRoleTest`, unchanged). No DTO in this phase has a `role` field — proven
by an integration test that submits one and confirms it's ignored. No promotion
endpoint (volunteer → organizer only happens through the not-yet-built Organizations
approval flow). No demotion endpoint — deliberately deferred: the cascade needs
`organizations`/`actions`/`participations`/`attendance`/`qr sessions`/`reports`/
`moderation` tables, none of which exist yet; a partial implementation now would do
nothing useful and get entirely rewritten once those tables land, so none was built.
Admin self-protection: cannot suspend self (`400 users.selfSuspensionNotAllowed`,
checked before the target row is even loaded); no endpoint lets an admin edit their own
or anyone's role.

## Profile Editing

Two distinct DTOs, deliberately not shared: `UpdateCurrentUserRequest` (self,
firstName/lastName/localePreference — no email, per the approved architecture's silence
on self-service email verification) and `UpdateAdminUserRequest` (admin-on-another-user,
firstName/lastName/email/localePreference — email included here specifically because
`dto-catalogue.md` already approves it for this exact context, and the pre-existing
frontend edit dialog already needs it). Neither DTO has `role`/`status`/`passwordHash`/
`id`/`createdAt`/`version`. `AccountView.vue` was inspected and confirmed to have **no
profile-editing UI at all** today — `PATCH /users/me` is implemented as a documented,
tested backend capability with no current frontend consumer, per the task's own
instruction to document rather than invent a UI redesign.

## Suspension and Reactivation

**Idempotent** (chosen over a conflict-response alternative, and documented as a
deliberate choice, not a default): suspending an already-suspended user, or
reactivating an already-active one, both return `200` with the current state, no
error. Suspension revokes every active refresh token for the target in the same
transaction as the status change (reuses `RefreshTokenService.revokeAllForUser` — no
duplicated SQL). Reactivation does not restore any token; the user must log in again.
Both verified end-to-end, twice — once via the real MySQL integration test, once again
manually through the live browser UI (see § Manual End-to-End Verification).

## Refresh Token Revocation

No new revocation code was written — `AdminUsersController`'s suspend action calls the
exact same `RefreshTokenService.revokeAllForUser` the authentication phase already
built and tested. Verified via MySQL directly (see § MySQL Verification) that
suspending a user leaves zero rows with `revoked_at IS NULL` for that user, and that
reactivation does not un-revoke any of them.

## Database/Flyway Changes

**None.** The existing `users` table already had every column, index, and constraint
this domain needed (`role`/`status` CHECK constraints, `ix_users_role`,
`ix_users_status`, `uk_users_email`, `version`). No new migration was written — a
leading-wildcard search `LIKE` can't benefit from a B-tree index regardless, and a
full-text index was considered and rejected as disproportionate for this MVP's scale.

## Backend Files Created

**DTOs** (`users/dto/`): `UserSummaryResponse`, `UserDetailsResponse`,
`UpdateCurrentUserRequest`, `UpdateAdminUserRequest`, `UserStatusChangeResponse`.
**Generic envelope**: `common/web/PageResponse.java` (documented since the
architecture phase, never actually built until now). **Exceptions** (`users/exception/`):
`UserNotFoundException` (404), `SelfSuspensionNotAllowedException` (400),
`AdminDuplicateEmailException` (409). **Service**: `users/service/UserService.java` +
`impl/UserServiceImpl.java`. **Controllers**: `users/controller/UsersController.java`
(`/users/me`), `users/controller/AdminUsersController.java` (`/admin/users/**`,
class-level `@PreAuthorize("hasRole('ADMINISTRATOR')")`). **Tests**:
`users/service/impl/UserServiceImplTest.java` (19 Mockito unit tests),
`users/controller/AdminUsersControllerIntegrationTest.java` (19 real-MySQL
integration tests).

## Backend Files Modified

- `users/entity/User.java` — no change (already had everything needed).
- `users/repository/UserRepository.java` — added `existsByEmailAndIdNot`, `search`
  (paginated, filtered `@Query`).
- `users/mapper/UserMapper.java` — added `toSummary`, `toDetails`.
- `auth/service/impl/AuthenticationServiceImpl.java` — `getCurrentUser` now delegates
  to `UserService.getCurrentUser` instead of duplicating the not-found/suspended/live-row
  logic (risks-and-open-decisions.md item 18 explicitly recommends exactly one
  aggregate owning this).
- `common/exception/GlobalExceptionHandler.java` — added an explicit
  `AuthorizationDeniedException` handler — see § Bugs Found.
- `common/exception/AccountSuspendedException.java` — **moved** from `auth.exception`
  to `common.exception`, since both the `auth` and `users` domains now throw it.
- `auth/service/impl/AuthenticationServiceImplTest.java` — updated for both changes
  above (mocks `UserService`, imports the moved exception).

## Frontend Files Created

None new — this phase reuses `normalizeApiUser.js`/`authSession.js` from the
authentication-integration phase unchanged.

## Frontend Files Modified

- `features/admin/services/adminUsers.service.js` — rewritten for the real endpoints.
  `suspendUser`/`reactivateUser`/`updateUserProfile` **no longer take an `adminUserId`
  parameter** (the backend derives it from the bearer token now — the mock's own
  signature was a pure mock artifact).
- `features/admin/stores/adminUsers.store.js` — rewritten for real server-side
  pagination/search/role/status filters, with a request-sequence guard against a slow
  request overwriting a newer one's result (a gap the codebase's existing
  `actions.store.js::setSearch` debounce pattern doesn't itself cover).
- `features/admin/views/AdminUsersView.vue` — every dialog/list-item/button preserved
  unchanged; added a role filter, a status filter, and a pagination control — the
  minimum additions actually required to offer real filtering/pagination, not a
  redesign. No role-changing control existed to remove.
- `locales/{en,el}/admin.js` — added the new filter labels.

## Mock Files Retained

`userRole.storage.js`, `userProfileOverride.storage.js`,
`admin/mocks/userStatus.storage.js`, and `auth.service.js`'s own `getUserById`/
`getAllUsers` — all confirmed, by grep, to still be the only source for
`organizerActions.service.js`, `AdminReportsView.vue`, `AdminActionsView.vue`,
`AdminOrganizationsView.vue`, and `organizationIntegrity.js`, every one of which
belongs to a domain that remains fully mocked. None were touched.

## Mock Files Removed

None — every module considered still has a real consumer in a still-mocked domain.

## Admin Users Integration

Real pagination (`page`/`size`, capped at 100), real debounced search (300ms, matching
the codebase's existing pattern), real role/status filter dropdowns mapping to API
query params, resetting to page 0 on any filter change. Verified manually: searching
"Konstantinos" returned exactly 1 of 4 seeded users; suspending/reactivating updated
the list in place instantly and was independently confirmed via direct MySQL queries
and direct login attempts (see below).

## Current User Profile Integration

No frontend change was made — `AccountView.vue` has no editing UI to wire up (see §
Profile Editing). `GET /users/me`/`PATCH /users/me` exist as tested backend
capabilities, documented as having no current frontend consumer, per the task's own
explicit instruction not to invent a redesign.

## Security Verification

All performed via real HTTP calls in `AdminUsersControllerIntegrationTest`, not
assumed: a `VOLUNTEER` and an `ORGANIZER` (both real, registered accounts) each get
`403 common.forbidden` from every `/admin/users/**` endpoint; an unauthenticated
request gets `401 common.unauthenticated`; the `ADMINISTRATOR` account succeeds on all
of them; an admin cannot suspend themselves; a client-supplied `role` field in a PATCH
body is silently ignored (DB role unchanged); direct IDs in the path never establish
authorization on their own (every check is role-gated first, then id-scoped).

## Backend Build and Tests

```
cd backend
./mvnw clean verify
```

**BUILD SUCCESS.** 73/73 tests passed (the 36 from the prior two phases plus 19
`UserServiceImplTest` unit tests and 19 `AdminUsersControllerIntegrationTest`
real-MySQL integration tests —1 more than 18 total new because
`usersMeReturnsTheAuthenticatedProfileAndMatchesAuthMe` and
`patchUsersMeUpdatesFirstLastAndLocaleOnly` also live in that same class). 0 failures,
0 errors, no compiler warnings.

## Frontend Lint and Build

```
cd frontend
npm run lint    # clean
npm run build   # succeeded
```

No Vitest added or run, per the explicit constraint.

## Manual End-to-End Verification

Ran MySQL, backend (`local` profile), and frontend together; drove the real UI via
Chrome browser automation (not curl-only):

1. Registered a fresh volunteer through the real Register form, promoted it to
   `ADMINISTRATOR` via the documented local-dev SQL (never a public endpoint), and
   registered two more plain volunteers via the API for search/filter test data.
2. Logged in as the new admin; opened **Χρήστες** (Admin Users) — the real backend's 4
   users rendered, including a pre-existing, real, unrelated administrator account
   (confirmed with the user beforehand and left completely untouched throughout).
3. Searched "Konstantinos" — server-side search correctly returned exactly 1 of 4
   results (debounced, no client-side filtering).
4. Self-suspend button correctly disabled with the explanatory caption, for the
   logged-in admin's own row.
5. Suspended a test volunteer → UI updated in place instantly to "Suspended" with a
   Reactivate action. Confirmed in MySQL: `status = SUSPENDED`, the user's refresh
   token's `revoked_at` set. Confirmed via curl: login now returns
   `403 auth.accountSuspended`.
6. Reactivated the same user → UI updated back to "Active." Confirmed in MySQL:
   `status = ACTIVE`. Confirmed via curl: login now succeeds (`200`).
7. Edited a user's first name through the edit dialog → UI updated instantly; confirmed
   the exact new value in MySQL directly.
8. Navigated to the still-mocked Organizations admin screen — 14 fixture organizations
   rendered exactly as before, unaffected by any of the above (mixed mock/API mode
   stable).
9. Checked the browser console — the only message was an unrelated third-party Chrome
   extension's own disconnect warning (the same extension that caused input-focus
   flakiness during interaction, unrelated to this application); no app-level errors.
10. Cleaned up all three test accounts from MySQL afterward, leaving only the
    pre-existing real administrator account, untouched.

## MySQL Verification

```sql
SELECT status FROM users WHERE email = '...';                                  -- SUSPENDED / ACTIVE
SELECT revoked_at FROM refresh_tokens WHERE user_id = (SELECT id FROM users ...); -- non-NULL after suspend
SELECT first_name, last_name, email FROM users WHERE email = '...';            -- reflects the admin edit
```

All confirmed directly, independent of what the UI claimed — not inferred from a
green checkmark.

## Bugs Found

**`@PreAuthorize` method-security rejections were returning 500, not 403.** Spring
Security's `AuthorizationDeniedException` (thrown from inside the `@PreAuthorize`
AOP interceptor around the controller method) was being caught by
`GlobalExceptionHandler`'s generic `@ExceptionHandler(Exception.class)` fallback —
because `@RestControllerAdvice` resolves exceptions *inside* the servlet dispatch,
before they'd ever reach `SecurityConfig`'s filter-level `RestAccessDeniedHandler`
(which only ever sees a URL-level `authorizeHttpRequests` rejection, never a
method-security one). This was invisible in the authentication phase because no
method-level `@PreAuthorize` existed anywhere yet — this phase's `AdminUsersController`
is the first code to use it, and the first real-browser/integration test to exercise a
non-administrator hitting an admin endpoint caught it immediately.

## Fixes Applied

Added an explicit `@ExceptionHandler(AuthorizationDeniedException.class)` to
`GlobalExceptionHandler`, rendering the same `common.forbidden`/403 `ApiErrorResponse`
shape `RestAccessDeniedHandler` already produces for the URL-level case. Verified: both
integration tests that were failing (`volunteerReceives403FromAdminEndpoints`,
`organizerReceives403FromAdminEndpoints`) now pass, and every other test remained
green.

## Remaining TODO

- No admin activity logging exists yet (deliberately deferred, per the task's own Part
  19 — not a silent gap).
- `PATCH /users/me` has no frontend consumer (no editing UI exists in `AccountView.vue`
  to wire it to).
- Organizer promotion/demotion, and organization data on `UserDetailsResponse`, all
  wait for the Organizations phase.

## Suggested Next Feature

OneHelp Organizations & Organizer Applications Backend — Application Review,
Organization Ownership, Organizer Promotion, Organizer Demotion Cascade & Incremental
Frontend Integration
