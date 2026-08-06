# Phase Report — OneHelp Organizations & Organizer Applications Backend & Incremental Frontend Integration

## Summary

Implemented the real Organizations & Organizer Applications domain — the permanent
VOLUNTEER → application → admin review → ORGANIZER → organization → demotion →
VOLUNTEER lifecycle — and wired every corresponding frontend feature
(Become Organizer, the organizer's own organization, and Admin Organizations/
application review) to the live backend. One organizer owns exactly one organization,
enforced by a database unique constraint, not just application logic. Organizer
promotion happens only via admin approval; demotion (self-service or
administrator-triggered) is one shared, transactional operation that deletes the
organization and reverts the role — never a generic role edit. Actions, Participation,
Attendance, QR, Reports, Moderation, and Admin Activity persistence were explicitly
not touched. Full validation: `./mvnw clean verify` (130/130 tests, including 57 new
organizations tests against real MySQL), `npm run lint`/`npm run build` clean, and a
complete real-browser walkthrough of the entire lifecycle — submit, reject, resubmit,
approve, edit, suspend, restore, self-demote, admin-demote, reapply — each step
independently confirmed in MySQL, not just the UI.

## Source Documents Reviewed

All 20 required documents read in full before any code change: the three prior phase
reports, `api-authentication.md`, `api-users-and-roles.md`,
`frontend-mock-inventory.md`, `domain-models.md`, `service-contracts.md`,
`business-rules.md`, `routes-and-authorization.md`,
`frontend-backend-replacement-map.md`, `risks-and-open-decisions.md`,
`database-schema.md`, `domain-model-and-state-machines.md`, `rest-api-design.md`,
`dto-catalogue.md`, `security-and-authentication.md`, `transactions-and-integrity.md`,
`error-contract.md`, `architecture-decisions.md` (ADR-4, ADR-8, ADR-9, ADR-15, ADR-17
directly govern this domain), and `claude.md`. Also inspected the real current
implementations of `auth/**`, `users/**`, `common/security/**`,
`common/exception/**`, the Flyway migrations, and every listed frontend file
(`organizerApplication/**`, `organizer/**`, `admin/services/organizations.service.js`,
`admin/stores/adminOrganizations.store.js`, `admin/views/AdminOrganizationsView.vue`,
`organizerDemotion.service.js`, the auth/admin storage mocks, `actions/**`,
`participation/**`, `attendance/**`, `router/**`, `constants/roles.js`) — every
consumer of a mock module was grepped and understood before that module was touched or
removed.

## Database and Flyway Changes

One new migration, `V2__organizations_schema.sql` — `V1` untouched. Creates
`organizations` (one row per applicant/organization, ever — ADR-8) and
`organization_categories` (normalized join table, ADR-17). `organizations.
organizer_user_id` carries `UNIQUE NOT NULL`, the entire database-level enforcement of
"one organizer owns exactly one organization, one organization has exactly one
organizer" (ADR-4/ADR-15) — no membership table exists. `CHECK` constraints enforce
valid `status`/`organization_type` literals, name/description/supporting-message
length bounds, and "rejection reason required when rejected." No Actions,
Participations, Attendance, QR, Reports, or Moderation tables were created.

## Entities and Enums Created

`Organization` (entity), `OrganizationStatus` (`PENDING`/`APPROVED`/`REJECTED`/
`SUSPENDED`), `OrganizationType` (8 values matching the frontend's existing
`organizationTypes.js`), `OrganizationCategory` (5 values matching
`actionCategories.js` — defined here first since Actions doesn't exist yet, reused
unchanged when it does). `organizerUserId`/`reviewedBy` are raw `UUID` fields on the
entity, not JPA relationships — resolved into safe `UserSummaryResponse` objects only
at the mapping layer, never returned as bare ids.

## Backend Endpoints Implemented

`POST /organizer-applications`, `GET /organizer-applications/me`,
`PATCH /organizer-applications/{id}`, `POST /organizer-applications/{id}/resubmit`;
`GET/PATCH /organizations/me`, `POST /organizations/me/demote`;
`GET /admin/organizations` (paginated, search + status filter),
`GET/PATCH /admin/organizations/{id}`, `POST /admin/organizations/{id}/{approve,
reject,suspend,restore,demote}`. Full contract, DTOs, validation, and error codes in
`docs/backend-discovery/api-organizations.md`. No standalone public
`GET /organizations/{id}` endpoint was added — no current frontend consumer needs one,
and the approved `rest-api-design.md` never specified one either; documented as a
deliberate scope decision.

## Application Lifecycle

One `organizations` row per user, ever (ADR-8 — no separate `organizer_applications`
table). `PENDING → APPROVED` (admin, promotes role + revokes tokens) or `PENDING →
REJECTED` (admin, reason required); `REJECTED → PENDING` only via the dedicated
resubmit endpoint (self, sets `previousRejectionReason` from the cleared
`rejectionReason`); editing is allowed only while `PENDING` (`organization.notPending`
otherwise) — an approved application cannot be edited through this endpoint at all,
since approval also promotes the caller's role and the endpoint is `VOLUNTEER`-only
(verified live: after approval, the applicant's own edit attempt correctly receives
`common.forbidden`, a stronger guarantee than a status check alone).

## Organization Lifecycle

Post-approval, the organizer may edit their own profile while `APPROVED` or
`SUSPENDED` (`PATCH /organizations/me`); an administrator may edit any organization at
any status and independently suspend/restore its public standing
(`POST .../suspend`/`.../restore`, both idempotent — matching the idempotent choice
already established for user suspend/reactivate in the prior phase). Organization
suspension does **not** revoke the owner's refresh tokens or otherwise touch their
account — only the organization's own standing.

## One-to-One Ownership Enforcement

Enforced at both layers, per the task's explicit requirement:
- **Database**: `UNIQUE (organizer_user_id)` on `organizations` — the actual guarantee
  under a concurrent-submission race.
- **Service**: `existsByOrganizerUserId` pre-check on submit (clean error message in
  the common case); `AdminOrganizationServiceImpl.approve()` additionally re-verifies
  the applicant's live role is still `VOLUNTEER` before promoting.

## Approval and Promotion Transaction

`AdminOrganizationServiceImpl.approve()` — one `@Transactional` method: row-locks the
organization (`SELECT ... FOR UPDATE`), requires `PENDING`, requires the applicant
`ACTIVE` and still `VOLUNTEER`, flips status to `APPROVED` with `reviewedAt`/
`reviewedBy`, promotes the applicant's role to `ORGANIZER`, and revokes every one of
their active refresh tokens — all or nothing. Verified live: a second approval attempt
on the same now-`APPROVED` row correctly fails with `organization.invalidTransition`,
and exactly one organization row exists throughout.

## Rejection and Resubmission

Rejection requires `PENDING` and a non-blank reason (`organization.reasonRequired`
otherwise — a dedicated code, not the generic validation error, since the DTO
deliberately has no `@NotBlank` on `reason`); sets `REJECTED` + the reason +
reviewer/timestamp; role and organization untouched. Resubmission requires `REJECTED`,
moves the row back to `PENDING`, copies the old reason into
`previousRejectionReason`, clears `rejectionReason`, resets `submittedAt`. Verified
live end to end: reject with a reason → volunteer sees that exact reason → edits and
resubmits → application returns to `PENDING` with the prior reason preserved as
`previousRejectionReason` → admin approves.

## Suspension and Restoration

Idempotent (Part 10's explicit choice, matching the Users & Roles phase's precedent):
suspending an already-suspended organization, or restoring an already-approved one,
both succeed and return the current state, no error. Suspending/restoring a `PENDING`
or `REJECTED` organization is rejected (`organization.invalidTransition` — must be
approved first). Verified live: suspend → owner can still log in normally (their
account is unaffected) → restore → organization approved again.

## Organizer Self-Demotion

`POST /organizations/me/demote` — no parameters, always acts on the authenticated
caller. Delegates to the shared `OrganizerDemotionService.demote(organizerUserId,
initiatedBy)` (`initiatedBy == organizerUserId` for self-service). Verified live:
confirmation dialog → organization deleted → role reverts to `VOLUNTEER` → session
cleared (frontend redirected to a fresh login, the revoked refresh token correctly
failing silent restoration) → fresh login succeeds as `VOLUNTEER` → the same user
submitted a brand-new application afterward, confirmed `PENDING` again.

## Administrator Demotion

`POST /admin/organizations/{id}/demote` — keyed by the *organization's* id (what the
admin's own list already has on hand), not the organizer's user id. Defensive checks
before delegating to the same shared service: admin cannot be the organization's own
owner (`organizer.demotionNotAllowed`; structurally impossible under the permanent
single-role rule, checked anyway), target's live role must still be `ORGANIZER`
(`organizer.notOrganizer`). Verified live with a second test organizer: approve →
admin demote → organization gone, role `VOLUNTEER`, zero orphaned organization rows
remained anywhere in the database.

## Refresh Token Revocation

Reuses the existing `RefreshTokenService.revokeAllForUser` unchanged (no duplicated
logic) at exactly two points: approval (applicant) and demotion
(self or admin-triggered, on the demoted organizer). Suspension/restoration/rejection
never revoke tokens. Verified directly in MySQL after both approval and demotion:
zero rows with `revoked_at IS NULL` for the affected user immediately afterward.

## Backend Files Created

**Entities/enums** (`organizations/entity/`): `Organization`, `OrganizationStatus`,
`OrganizationType`, `OrganizationCategory`. **Repository**: `OrganizationRepository`
(row-locked lookups, duplicate-name check, paginated search). **DTOs**
(`organizations/dto/`): `LocalizedText`, `LocalizedNameRequest`,
`LocalizedDescriptionRequest`, `OrganizationApplicationRequest`,
`UpdateOrganizationRequest`, `RejectOrganizationRequest`, `OrganizationResponse`,
`OrganizerDemotionResponse`. **Exceptions** (`organizations/exception/`, 11 classes):
`OrganizationAlreadyExistsException`, `OrganizationNotFoundException`,
`OrganizationNotPendingException`, `OrganizationNotRejectedException`,
`TermsNotAcceptedException`, `DuplicateOrganizationNameException`,
`RejectionReasonRequiredException`, `OrganizationInvalidTransitionException`,
`OrganizerOrganizationMissingException`, `OrganizerRoleRequiredException`,
`OrganizerDemotionNotAllowedException`. **Mapper**: `OrganizationMapper` (hand-written
— resolves `organizer`/`reviewedBy` via `UserRepository`, not MapStruct, since these
require a lookup, not a field copy). **Services**: `OrganizationService`/
`OrganizationServiceImpl` (volunteer application + organizer self-service),
`AdminOrganizationService`/`AdminOrganizationServiceImpl`, `OrganizerDemotionService`/
`OrganizerDemotionServiceImpl` (the one shared cascade, used by both self and admin
call sites), plus a small package-private `OrganizationFieldApplier` helper avoiding
duplicated field-copy logic between the two request DTOs. **Controllers**:
`OrganizerApplicationController`, `OrganizationController`,
`AdminOrganizationsController`. **Tests**: `OrganizationServiceImplTest` (14),
`OrganizerDemotionServiceImplTest` (3), `AdminOrganizationServiceImplTest` (12),
`OrganizationsIntegrationTest` (28 real-MySQL tests).

## Backend Files Modified

`common/exception/GlobalExceptionHandler.java` — added an
`HttpMessageNotReadableException` handler (a malformed/invalid enum literal in a
request body, e.g. an invalid `organizationType`, was previously falling through to
the generic 500 handler; now correctly returns `422 validation.failed`) — see § Bugs
Found.

## Frontend Files Created

`frontend/src/services/normalizeApiOrganization.js` — converts between the backend's
`UPPER_SNAKE_CASE` enums and the frontend's existing lowercase/camelCase constants, in
both directions, plus the bilingual `{el, en}` request-payload duplication (ADR-9's
documented, accepted frontend simplification — the form still collects one language of
input, exactly as before).

## Frontend Files Modified

`organizerApplication/services/organizationApplication.service.js` and
`organizerDemotion.service.js` — full rewrites, real API only (mock branch removed
entirely, same precedent as `adminUsers.service.js` from the prior phase);
`organizerDemotion.service.js` now exports two functions (`demoteSelf`,
`demoteOrganizerByOrganizationId`) instead of the mock's one shared function, matching
the two distinct real endpoints. `organizerApplication/stores/
organizationApplication.store.js` — the mock's `membership` state dropped entirely
(ADR-4). `organizer/views/OrganizerOrganizationView.vue` — demotion call site updated.
`admin/services/organizations.service.js` — full rewrite, real API only.
`admin/stores/adminOrganizations.store.js` — rewritten with real server-side
pagination/search/status-filter (debounced search + request-sequence guard, matching
`adminUsers.store.js`'s established pattern). `admin/views/AdminOrganizationsView.vue`
— switched to the real store; added a status filter dropdown and pagination control
(the minimum necessary additions, not a redesign — every existing card/dialog/button
preserved); `org.organizer` (now resolved server-side) used directly instead of the
old `getAllUsers()` client-side join; demotion call updated to the organization's id.
`admin/views/AdminUsersView.vue` — its pre-existing organizer→organization cross-link
lookup was updated from a now-incompatible per-user call to matching against a page of
real admin organizations client-side (documented limitation: best-effort within the
first 100). `admin/utils/adminErrors.js` — added `DUPLICATE_NAME`, `NOT_ORGANIZER`,
`DEMOTION_NOT_ALLOWED`. `locales/{en,el}/admin.js` — added the corresponding error
messages and the new status-filter labels. `main.js` — removed the now-obsolete
`repairOrganizationIntegrity()` dev-only call.

## Mock Files Retained

`admin/mocks/organizations.mock.js`/`organizations.storage.js` — still the sole data
source for the still-mocked Actions domain's organization lookups
(`organizerActions.service.js`, `actions.service.js`, `actionVisibility.js`,
`actionModeration.service.js`); the real Organizations domain no longer reads or
writes them at all. `auth/mocks/userRole.storage.js` — retained for
`auth.service.js`'s mock-mode (`VITE_DATA_SOURCE=mock`) `sanitizeUser()`; no longer
written by the real Organizations domain (doc comment corrected). `userProfileOverride.
storage.js`, `admin/mocks/userStatus.storage.js`, `auth/mocks/users.mock.js` —
untouched, same rationale as the prior phase.

## Mock Files Removed

Four files, all fully replaced with zero remaining consumers after the rewrites above:
`organizerApplication/utils/organizationValidation.js`,
`organizerApplication/mocks/organizationMembership.storage.js`,
`organizerApplication/utils/organizationMembership.js`,
`organizerApplication/utils/organizationIntegrity.js` (plus its call site in
`main.js`).

## Mixed Mock/API Boundary

After this phase, real backend/API: authentication, users & roles, organizer
applications, organizations, organizer ownership, organization
suspension/restoration, organizer promotion, organizer demotion. Still mocked:
actions, public action discovery, participation, attendance, QR, reports,
moderation, admin activity. The still-mocked Actions/organizer-actions feature reads
organization data from the **mock** organization storage (unchanged), which is no
longer written by the real Organizations domain — a real, approved organizer will
appear to that mocked feature as having no organization until the Actions backend
phase replaces that lookup with a real query. Documented explicitly in
`docs/backend-discovery/api-organizations.md` § Actions-domain boundary, not silently
left implicit.

## Security Verification

All via real HTTP calls in `OrganizationsIntegrationTest`: `VOLUNTEER` submitting is
allowed, `ORGANIZER`/`ADMINISTRATOR` attempting to submit get `403 common.forbidden`
(role-gated before any service logic runs); editing/resubmitting an application owned
by a different user returns `404` (not 403 — direct ids never establish ownership);
`/admin/organizations/**` rejects `VOLUNTEER`/`ORGANIZER` with `403` and
unauthenticated callers with `401`; `/organizations/me` rejects non-`ORGANIZER`
callers with `403`; an administrator cannot demote themselves through the admin
endpoint; a demotion target whose live role is no longer `ORGANIZER` is rejected.

## Backend Build and Tests

```
cd backend
./mvnw clean verify
```

**BUILD SUCCESS.** 130/130 tests passed (73 from the prior two phases + 29 new unit
tests + 28 new real-MySQL integration tests for this phase). 0 failures, 0 errors.

## Frontend Lint and Build

```
cd frontend
npm run lint    # clean
npm run build   # succeeded
```

No Vitest added or run, per the explicit constraint.

## Manual End-to-End Verification

Ran MySQL, backend (`local` profile), and frontend together; drove the real UI via
Chrome browser automation:

1. Registered a fresh volunteer through the real Register form.
2. Opened Become Organizer, submitted a real application — confirmed `PENDING` in
   MySQL directly, and confirmed it survived a page refresh.
3. Prepared a local test administrator via the documented SQL pattern (never a public
   endpoint).
4. As admin, found the pending application in Admin Organizations, rejected it with a
   reason.
5. Logged back in as the volunteer — the exact rejection reason displayed correctly.
6. Edited and resubmitted — application returned to `PENDING`.
7. Approved it as admin — confirmed in MySQL: organization `APPROVED` with
   reviewer/timestamp set, applicant's role `ORGANIZER`, zero active refresh tokens
   for that user.
8. Logged in again as the (former) volunteer — landed directly on the Organizer
   dashboard, confirming the new role took effect on fresh login.
9. Opened "Η οργάνωσή μου" (My Organization), edited the description, saved —
   confirmed the new value in MySQL.
10. As admin, suspended the organization — confirmed the owner could still log in
    normally (their account itself unaffected) — then restored it.
11. As the organizer, used the self-service "Become a volunteer again" danger-zone
    action — confirmed in MySQL: organization row gone, role back to `VOLUNTEER`,
    zero active refresh tokens; confirmed the frontend session was cleared and a
    fresh login was required; confirmed the same user could submit a brand-new
    application afterward.
12. Repeated the full submit → approve cycle with a second test organization, then
    used the **administrator's** "Remove organizer and organization" action instead
    of self-service — confirmed identical results (organization deleted, role
    reverted) and zero orphaned organization rows remained anywhere in the database.
13. Confirmed the unrelated, still-mocked public Actions list (11 fixture actions)
    rendered correctly and unaffected throughout.
14. Checked the browser console at each step — no application-level errors.
15. Cleaned up all test accounts and data afterward, leaving only the pre-existing
    real administrator account untouched.

One checklist item was verified from code consistency rather than an independent
screenshot: the organizer's own suspended-organization notice banner
(`OrganizerOrganizationView.vue`'s `v-if="isSuspended"` block) — the same
`organization.status` binding that was directly observed working correctly for every
other status (`PENDING`/`APPROVED`/`REJECTED`) during this walkthrough, so this is
reported as inferred-from-consistent-behavior, not independently screenshotted, in the
interest of precise reporting.

## MySQL Verification

Every state transition in the walkthrough above was independently confirmed with a
direct query against `organizations`, `users`, and `refresh_tokens` — not inferred
from the UI. Representative examples are embedded in the numbered steps above.

## Bugs Found

**Invalid enum literals in a request body returned a raw 500, not a validation
error.** Spring's default JSON deserialization throws `HttpMessageNotReadableException`
for an invalid `organizationType`/`category` value — this exception has no handler in
the pre-existing `GlobalExceptionHandler`, so it fell through to the generic
`Exception.class` handler and returned an unhelpful `500 common.unexpectedError`
instead of the expected `422 validation.failed`. Found while implementing Part 6's
explicit validation requirements for these two fields, before it could ever reach a
real user, and fixed proactively.

## Fixes Applied

Added an explicit `@ExceptionHandler(HttpMessageNotReadableException.class)` to
`GlobalExceptionHandler`, returning `422 validation.failed` — consistent with
`error-contract.md`'s own stated intent ("enum binding failure is a 422
automatically"). Verified via a dedicated behavior check during implementation; no
regression in any other test.

## Remaining TODO

- `actionsRemoved` in the demotion response is always `0` — no Actions backend exists
  yet to actually remove anything beyond the organization row itself; the shared
  `OrganizerDemotionServiceImpl.demote()` method is structured so the future Actions
  phase can add its cascade steps inside the same transaction without changing the
  method's contract.
- No admin activity logging for any organization-lifecycle event — explicitly out of
  scope this phase, same as the Users & Roles phase.
- The mocked Actions/organizer-actions feature does not see real organizations (see §
  Mixed Mock/API Boundary) — documented, deferred to the Actions phase.
- No standalone public `GET /organizations/{id}` endpoint exists — deferred to the
  Actions phase, which will compose a public-safe organization subset directly into
  its own response DTOs.

## Suggested Next Feature

OneHelp Actions Backend — Public Discovery, Organizer CRUD, Lifecycle, Moderation,
Maps, Directions & Incremental Frontend Integration
