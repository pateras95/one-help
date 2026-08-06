# API Integration Report — Organizations & Organizer Applications

Describes the final, implemented backend/frontend contract for the Organizations &
Organizer Applications domain — the permanent VOLUNTEER → application → review →
ORGANIZER → organization → demotion → VOLUNTEER lifecycle. This document describes
what was actually built, not a proposal; see
`docs/reports/2026-08-06-organizations-and-organizer-applications-integration.md` for
the phase report (files touched, tests, verification) and
`docs/backend-architecture/architecture-decisions.md` (ADR-4, ADR-8, ADR-9, ADR-15,
ADR-17) for the design decisions this implementation follows.

---

## Domain overview

One aggregate, `Organization`, covers the entire lifecycle from a volunteer's first
application through approval, suspension, and eventual demotion (ADR-8 — "the
application IS the organization record," no separate `organizer_applications` table).
The permanent product rule — one organizer owns exactly one organization, one
organization has exactly one organizer, forever — is enforced by a single database
constraint (`UNIQUE (organizer_user_id)`, ADR-4/ADR-15), not a membership table.

There is no Actions backend yet (explicitly out of scope this phase); organizer
demotion therefore only ever deletes the `organizations` row itself today —
`actionsRemoved` in the demotion response is always `0` until a future phase adds real
cascade steps.

## Database tables

**`organizations`** — one row per applicant/organization, ever. See
`backend/src/main/resources/db/migration/V2__organizations_schema.sql` for the exact
DDL. Key columns: `id`, `organizer_user_id` (`CHAR(36)`, `UNIQUE NOT NULL`, FK →
`users.id ON DELETE RESTRICT`), `name_el`/`name_en`, `description_el`/`description_en`,
`organization_type`, `contact_email`, `phone`, `website`, `address`, `municipality`,
`supporting_message`, `status`, `submitted_at`, `reviewed_at`, `reviewed_by` (FK →
`users.id ON DELETE SET NULL`), `rejection_reason`, `previous_rejection_reason`,
`created_at`/`updated_at`/`version`.

**`organization_categories`** — normalized join table (`organization_id`, `category`),
composite PK, `ON DELETE CASCADE` from `organizations`. Values are shared with the
future Actions module's `ActionCategory` enum (defined here first since Actions is out
of scope this phase).

No new migration touches `users`, `refresh_tokens`, or `V1`. No `organization_members`/
`memberships` table exists — eliminated entirely per ADR-4.

## Entity relationships

```
User (1) ──── owns (0..1, UNIQUE FK) ──── Organization
Organization (1) ──── has (0..N) ──── OrganizationCategory
```

`Organization.organizerUserId` and `Organization.reviewedBy` are raw `UUID` fields on
the entity (not JPA relationships) — resolved into safe `UserSummaryResponse` objects
only at the DTO-mapping layer (`OrganizationMapper`), never returned as bare ids.

## Application lifecycle

`OrganizationStatus`: `PENDING` → `APPROVED` | `REJECTED`; `REJECTED` → `PENDING`
(resubmit only); `APPROVED` ↔ `SUSPENDED`.

| From | To | Actor | Trigger |
|---|---|---|---|
| *(none)* | `PENDING` | volunteer | `POST /organizer-applications` |
| `PENDING` | `APPROVED` | administrator | `POST /admin/organizations/{id}/approve` — also promotes role, revokes tokens |
| `PENDING` | `REJECTED` | administrator | `POST /admin/organizations/{id}/reject` — reason required |
| `REJECTED` | `PENDING` | volunteer (self) | `POST /organizer-applications/{id}/resubmit` |
| `APPROVED` | `SUSPENDED` | administrator | `POST /admin/organizations/{id}/suspend` |
| `SUSPENDED` | `APPROVED` | administrator | `POST /admin/organizations/{id}/restore` |
| `APPROVED`/`SUSPENDED` | *(deleted)* | organizer (self) or administrator | demotion — see below |

Invalid: approving/rejecting a non-`PENDING` row; suspending/restoring a `PENDING` or
`REJECTED` row (must be approved first) — all return `organization.invalidTransition`
(400).

## Organization lifecycle (post-approval)

Once `APPROVED`, the organizer may edit their own profile fields
(`PATCH /organizations/me`) while `APPROVED` or `SUSPENDED` — matching the pre-existing
frontend gating exactly. An administrator may edit any organization's profile fields
at any status (`PATCH /admin/organizations/{id}`) and independently suspend/restore
its public standing. Suspension does **not** affect the owner's own account/login —
only the organization's approval standing (no refresh-token revocation on
suspend/restore, unlike user suspension).

## Endpoints

### Volunteer / organizer-application

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/v1/organizer-applications/me` | any authenticated | Own record at any status; 404 if none |
| `POST` | `/api/v1/organizer-applications` | `VOLUNTEER` | Submit; 201 |
| `PATCH` | `/api/v1/organizer-applications/{id}` | `VOLUNTEER`, owner only | Edit while `PENDING` |
| `POST` | `/api/v1/organizer-applications/{id}/resubmit` | `VOLUNTEER`, owner only | Edit + return to `PENDING` from `REJECTED` |

### Organizer's own organization

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/v1/organizations/me` | `ORGANIZER` | Own organization |
| `PATCH` | `/api/v1/organizations/me` | `ORGANIZER` | Edit while `APPROVED`/`SUSPENDED` |
| `POST` | `/api/v1/organizations/me/demote` | `ORGANIZER` | Self-demotion (see below) |

### Admin — organizations & applications

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/v1/admin/organizations` | `ADMINISTRATOR` | Paginated; `search` (both name locales), `status` filter |
| `GET` | `/api/v1/admin/organizations/{id}` | `ADMINISTRATOR` | Full detail; 404 if unknown |
| `PATCH` | `/api/v1/admin/organizations/{id}` | `ADMINISTRATOR` | Edit profile fields; owner/status never editable here |
| `POST` | `/api/v1/admin/organizations/{id}/approve` | `ADMINISTRATOR` | Transactional promotion |
| `POST` | `/api/v1/admin/organizations/{id}/reject` | `ADMINISTRATOR` | `{reason}`, required |
| `POST` | `/api/v1/admin/organizations/{id}/suspend` | `ADMINISTRATOR` | Idempotent |
| `POST` | `/api/v1/admin/organizations/{id}/restore` | `ADMINISTRATOR` | Idempotent |
| `POST` | `/api/v1/admin/organizations/{id}/demote` | `ADMINISTRATOR` | Administrator-triggered demotion (see below) |

**No standalone public `GET /organizations/{id}` endpoint was implemented.** The
approved `rest-api-design.md` does not specify one either — a public-safe organization
subset is designed to be composed as a nested field inside a future `ActionDetailsResponse`
(Actions phase), not a standalone endpoint, and no current frontend page needs one (no
public organization directory exists). Documented here as a deliberate scope decision,
not an oversight.

**Endpoint naming resolution**: the task brief suggested `/organizer/organization` and
`/admin/users/{id}/demote-organizer` as possible paths; this implementation follows the
already-approved `rest-api-design.md` exactly instead (`/organizations/me`,
`/admin/organizations/{id}/demote`), per the same precedent set in the Users & Roles
phase (favor already-approved architecture over a brief's suggested alternative,
document the resolution).

## DTOs

- **`LocalizedText(el, en)`** — response-side bilingual field shape.
- **`LocalizedNameRequest(el, en)`** — validated `2–120` chars each.
- **`LocalizedDescriptionRequest(el, en)`** — validated `20–2000` chars each.
- **`OrganizationApplicationRequest`** — submit / edit-pending / resubmit (same shape):
  `name` (`LocalizedNameRequest`), `organizationType`, `description`
  (`LocalizedDescriptionRequest`), `contactEmail`, `phone` (optional), `website`
  (optional, `^https?://.+\..+$`), `address`, `municipality`, `categories` (non-empty),
  `supportingMessage` (20–2000 chars), `acceptedTerms` (checked server-side, submit
  only).
- **`UpdateOrganizationRequest`** — same fields minus `acceptedTerms`; used for both
  organizer self-edit and admin edit (dto-catalogue.md's documented single-DTO design
  — no separate `UpdateAdminOrganizationRequest` was created; see § Error codes for why
  this satisfies "dedicated DTO, no mass assignment" without a second class).
- **`RejectOrganizationRequest(reason)`** — reason not `@NotBlank` at the bean-validation
  layer deliberately, so a blank reason raises the specific `organization.reasonRequired`
  code, not the generic `validation.failed`.
- **`OrganizationResponse`** — the single response shape for the entire lifecycle
  (ADR-8): `id`, `organizer` (`UserSummaryResponse`), `name`, `description`,
  `organizationType`, `contactEmail`, `phone`, `website`, `address`, `municipality`,
  `categories`, `supportingMessage`, `status`, `submittedAt`, `reviewedAt`,
  `reviewedBy` (`UserSummaryResponse`|null), `rejectionReason`,
  `previousRejectionReason`, `version`. `organizerUserId` is never a bare field —
  always resolved into `organizer`.
- **`OrganizerDemotionResponse(organizationName, actionsRemoved)`** — `actionsRemoved`
  always `0` this phase.
- **`PageResponse<OrganizationResponse>`** — reused unchanged from the Users & Roles phase.

**Deviation from the task brief's suggested DTO list**: no `OrganizationPublicResponse`/
`OrganizationAdminResponse`/`OrganizationStatusChangeResponse` were created —
`rest-api-design.md` and `dto-catalogue.md` (already approved) specify a single
`OrganizationResponse` reused everywhere, and suspend/restore/approve/reject all return
it directly rather than a dedicated status-change DTO. Documented here, same pattern as
the Users & Roles phase's error-code deviations.

## Validation

| Field | Rule | Layer |
|---|---|---|
| `name.el`/`name.en` | `@NotBlank`, 2–120 chars | DTO + DB `CHECK` |
| `description.el`/`description.en` | `@NotBlank`, 20–2000 chars | DTO + DB `CHECK` |
| `organizationType` | valid enum | DTO (Jackson binding failure → 422 `validation.failed`) + DB `CHECK` |
| `contactEmail` | `@Email`, max 255 | DTO |
| `website` | `^https?://.+\..+$` if present | DTO |
| `categories` | non-empty, valid enum values | DTO (`@NotEmpty` + enum binding) |
| `supportingMessage` | `@NotBlank`, 20–2000 chars | DTO + DB `CHECK` |
| `acceptedTerms` | must be `true` | service, submit only |
| duplicate organization name | soft check, both locales, case/accent-insensitive via collation | service |
| rejection reason | required when rejecting | service (not DTO, for the specific error code) |

An invalid `organizationType`/`category` literal in the JSON body is now caught by a
new `GlobalExceptionHandler` handler for `HttpMessageNotReadableException` (added this
phase) — previously this would have fallen through to the generic exception handler
and leaked a raw 500; it now correctly returns `422 validation.failed`.

## Permissions

| Role | Can |
|---|---|
| `VOLUNTEER` | submit/view/edit/resubmit own application only |
| `ORGANIZER` | view/edit own organization, self-demote; cannot submit another application; cannot access another organizer's organization or any `/admin/**` endpoint |
| `ADMINISTRATOR` | list/review applications, list/view/edit/suspend/restore organizations, demote an organizer; cannot use the volunteer application flow (role-gated) |
| unauthenticated | 401 on every endpoint above |

Every endpoint resolves "whose application/organization is this" from the
authenticated principal (`CurrentUserProvider`), never a client-supplied id, for the
`/me`-scoped endpoints. Application-editing endpoints that do take a path id
(`PATCH /organizer-applications/{id}`, `.../resubmit`) verify ownership server-side and
return **404** (not 403) when the id belongs to someone else — direct ids never
establish ownership (security-and-authentication.md).

## Error codes

| Code | HTTP | Meaning |
|---|---|---|
| `organization.alreadyHasOrganization` | 409 | Caller already has an application/organization, any status |
| `organization.notFound` | 404 | Unknown, or not owned by caller (never discloses which) |
| `organization.notPending` | 400 | Edit-while-pending attempted on a non-`PENDING` row |
| `organization.notRejected` | 400 | Resubmit attempted on a non-`REJECTED` row |
| `organization.termsNotAccepted` | 422 | Submit without accepting terms |
| `organization.duplicateName` | 409 | Soft name-uniqueness check failed |
| `organization.reasonRequired` | 422 | Reject without a reason |
| `organization.invalidTransition` | 400 | Approve/reject/suspend/restore attempted from an illegal status |
| `organizer.organizationMissing` | 404 | Defensive — `ORGANIZER` role with no organization row (should never occur) |
| `organizer.notOrganizer` | 403 | Admin demotion target's live role is not `ORGANIZER` (defensive) |
| `organizer.demotionNotAllowed` | 400 | Admin attempted to demote themselves (structurally impossible, checked anyway) |
| `common.forbidden` / `common.unauthenticated` | 403 / 401 | Standard role/auth gate |
| `validation.failed` | 422 | Bean validation or malformed enum literal |

**Deviations from the task brief's suggested list**: `organization.alreadySuspended`/
`organization.alreadyActive` were not implemented — suspend/restore are **idempotent**
(same choice as the Users & Roles phase's suspend/reactivate), so calling either on an
already-matching status simply returns `200` with the current state, no error.
`organization.ownerMismatch`/`organization.concurrentModification` were not
implemented as distinct codes — ownership mismatches surface as `organization.notFound`
(404, per the 404-vs-403 policy) and optimistic-lock conflicts reuse the existing
`common.staleWrite` (409), exactly as `error-contract.md` already specifies for every
other versioned entity in this codebase.

## Transaction boundaries

- **Approval** (`AdminOrganizationServiceImpl.approve`): row-locks the organization
  (`SELECT ... FOR UPDATE`), verifies `PENDING` + applicant `ACTIVE` + applicant
  `VOLUNTEER`, flips status to `APPROVED`, sets `reviewedAt`/`reviewedBy`, promotes the
  applicant's role to `ORGANIZER`, revokes all their refresh tokens — one
  `@Transactional` method. A concurrent second approval attempt on the same row blocks
  on the lock, then correctly fails with `organization.invalidTransition` once it
  observes `APPROVED`.
- **Rejection**: same row lock, requires `PENDING`, requires a non-blank reason, sets
  `REJECTED` + reason + reviewer/timestamp. No role change, no organization deleted.
- **Suspend/restore**: row lock, requires the organization not be `PENDING`/`REJECTED`,
  flips status. No cascade into any other table, no refresh-token revocation (organization
  standing, not the owner's account).
- **Demotion** (`OrganizerDemotionServiceImpl.demote`, shared by both self-service and
  admin-triggered call sites): row-locks the organization by `organizer_user_id`,
  captures the name for the response, hard-deletes the row, resets the user's role to
  `VOLUNTEER`, revokes all their refresh tokens — one transaction. `actionsRemoved` is
  always `0` (no Actions backend exists yet); this method is exactly where the future
  Actions phase must add its own cascade calls, inside this same transaction, before
  the organization delete.

## Promotion behavior

`VOLUNTEER → ORGANIZER` happens **only** as a side effect of `POST
/admin/organizations/{id}/approve`, inside the same transaction as the organization's
own status change. There is no generic role-change endpoint anywhere in this API.

## Demotion behavior

`ORGANIZER → VOLUNTEER` happens **only** via `POST /organizations/me/demote` (self) or
`POST /admin/organizations/{id}/demote` (administrator), both delegating to the one
shared `OrganizerDemotionService`. The user account itself is never deleted — only its
role reset and its organization removed. The demoted user may submit a brand-new
application from scratch at any time afterward (verified in the real-MySQL integration
test and manually in the browser).

## Refresh-token effects

| Operation | Refresh tokens revoked? |
|---|---|
| Application submit/edit/resubmit | no |
| Approval | **yes** — applicant must log in again to receive an `ORGANIZER`-scoped token |
| Rejection | no |
| Organization suspend/restore | **no** — the owner's own account/session is unaffected; only the organization's public standing changes |
| Self/admin demotion | **yes** — the (former) organizer must log in again |

## Frontend files migrated

- `frontend/src/services/normalizeApiOrganization.js` (new) — response/request casing
  and shape conversion between the backend's `UPPER_SNAKE_CASE` enums and the
  frontend's existing lowercase/camelCase constants.
- `frontend/src/features/organizerApplication/services/organizationApplication.service.js`
  — full rewrite, real API only (mock branch removed entirely, same precedent as
  `adminUsers.service.js` from the Users & Roles phase).
- `frontend/src/features/organizerApplication/services/organizerDemotion.service.js` —
  full rewrite; now exports two functions (`demoteSelf`, `demoteOrganizerByOrganizationId`)
  instead of the mock's one shared function, matching the two distinct real endpoints.
- `frontend/src/features/organizerApplication/stores/organizationApplication.store.js`
  — `membership` state dropped entirely (ADR-4).
- `frontend/src/features/organizer/views/OrganizerOrganizationView.vue` — demotion call
  site updated to `demoteSelf()`.
- `frontend/src/features/admin/services/organizations.service.js` — full rewrite, real
  API only.
- `frontend/src/features/admin/stores/adminOrganizations.store.js` — rewritten with
  real server-side pagination/search/status-filter (debounced search + request-sequence
  guard, same pattern as `adminUsers.store.js`).
- `frontend/src/features/admin/views/AdminOrganizationsView.vue` — switched to the real
  store/service; added a status filter dropdown and pagination control (the minimum
  necessary additions, not a redesign); `org.organizer` used directly instead of the
  old `getAllUsers()` client-side join; demotion call updated to pass the organization
  id instead of the organizer's user id.
- `frontend/src/features/admin/views/AdminUsersView.vue` — its pre-existing
  organizer→organization cross-link lookup (`loadOrganizations`) was updated from a
  (now-incompatible) per-user `getApplicationForUser(userId)` call to fetching a page
  of `getOrganizations({ size: 100 })` and matching client-side by `organizerUserId` —
  the only available admin lookup shape, since no "organization by organizer id"
  endpoint exists.
- `frontend/src/main.js` — removed the now-obsolete `repairOrganizationIntegrity()` dev-only
  call.

## Mock/storage files removed

All four fully replaced, zero remaining consumers after the rewrites above:

- `frontend/src/features/organizerApplication/utils/organizationValidation.js`
- `frontend/src/features/organizerApplication/mocks/organizationMembership.storage.js`
- `frontend/src/features/organizerApplication/utils/organizationMembership.js`
- `frontend/src/features/organizerApplication/utils/organizationIntegrity.js`

## Mock/storage files retained

- `frontend/src/features/admin/mocks/organizations.mock.js` /
  `organizations.storage.js` — still the data source for the still-mocked Actions
  domain's organization lookups (`organizer/services/organizerActions.service.js`,
  `actions/services/actions.service.js`, `actions/utils/actionVisibility.js`,
  `admin/services/actionModeration.service.js`). The real Organizations domain no
  longer reads or writes these files at all — they are now exclusively a
  compatibility layer for mocked Actions-adjacent code, clearly out of scope to
  reconcile with real organization ids this phase (Part 21).
- `frontend/src/features/auth/mocks/userRole.storage.js` — retained; its only
  remaining consumer is `auth.service.js`'s mock-mode `sanitizeUser()` (relevant only
  when `VITE_DATA_SOURCE=mock`). The real Organizations domain no longer writes to it
  (approval/demotion write `users.role` directly in MySQL now) — doc comment updated
  to reflect this.

## Actions-domain boundary

Per Part 21, after this phase:

**Real backend/API**: authentication, users & roles, organizer applications,
organizations, organizer ownership, organization suspension/restoration, organizer
promotion, organizer demotion.

**Still mocked**: actions, public action discovery, participation, attendance, QR,
reports, moderation, admin activity.

Mocked actions may still embed a denormalized organization display string/name and are
looked up by `organizerId` against the **mock** organization storage, not the real one
— this is an accepted, temporary seam: a real organizer approved/demoted in this phase
will not automatically have matching rows in the mock Actions fixtures, and the mocked
`organizer/services/organizerActions.service.js`'s own organization-approval gate
(`checkOrganizationGate`) will find no record for a real organizer's account. This is
explicitly out of scope to reconcile until the Actions backend phase replaces that
lookup with a real query against the `organizations` table — documented here as a known
limitation, not silently left implicit.

## Known limitations

- No admin activity logging for any organization-lifecycle event (approve/reject/
  suspend/restore/demote) — explicitly excluded from this phase's scope, same as the
  Users & Roles phase.
- `actionsRemoved` in the demotion response is always `0` — no Actions backend exists
  yet to actually remove anything beyond the organization row itself.
- The mocked Actions/organizer-actions feature's organization-approval gate does not
  see real organizations (see § Actions-domain boundary above) — a real, approved
  organizer will appear to that mocked feature as if they have no organization, until
  the Actions backend phase.
- No standalone public `GET /organizations/{id}` endpoint exists (see § Endpoints) —
  deferred to the Actions phase, which will compose a public-safe organization subset
  directly into its own response DTOs instead.
- `AdminUsersView.vue`'s organizer→organization cross-link is a best-effort match
  against the first 100 admin organizations (the backend's own page-size cap), not an
  exact lookup — acceptable since it was already a display-only convenience link in the
  mock it replaces.

## Next integration requirements

The Suggested Next Feature (per the phase report) is the Actions backend, which will
need to:
- Create `actions`, `action_moderation`, `action_moderation_history` tables (already
  fully specified in `database-schema.md`), referencing `organizations.id`.
- Extend `OrganizerDemotionServiceImpl.demote()` with the real cascade steps
  (participation/attendance/reports/actions deletion) inside the same transaction,
  before the organization row is deleted, and populate a real `actionsRemoved` count.
- Replace `organizer/services/organizerActions.service.js`'s mock organization lookups
  with real queries against the `organizations` table, closing the temporary boundary
  documented above.
- Implement `ActionDetailsResponse.organizationDetails` as a live join against the real
  `organizations` table (never a denormalized copy), per ADR-9/dto-catalogue.md.
