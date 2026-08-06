# REST API Design

Base path: `/api/v1`. Every endpoint below maps to the modules defined in
`system-architecture.md`, the DTOs in `dto-catalogue.md`, and the error codes in
`error-contract.md`. Pagination uses `PageResponse<T>` (`dto-catalogue.md`) with
`page` (zero-based, default 0) and `size` (default 20, max 100) query parameters
throughout; sorting uses a `sort=field,direction` query parameter (e.g.
`sort=startAt,asc`); search is case-insensitive and diacritic-insensitive (matching
the frontend's own `normalizeSearchText.js`, reimplemented server-side via MySQL's
`utf8mb4_0900_ai_ci` accent-insensitive, case-insensitive collation on the searched
columns — see § Pagination, filtering, search below).

---

## Authentication

| Method | Path | Auth | Roles | Request | Response | Status | Transaction |
|---|---|---|---|---|---|---|---|
| POST | `/auth/register` | none (guest only) | — | `RegisterRequest` | `AuthResponse` | 201 | yes |
| POST | `/auth/login` | none (guest only) | — | `LoginRequest` | `AuthResponse` | 200 | yes |
| POST | `/auth/refresh` | refresh cookie | — | — | `AuthResponse` (no nested `user`, or a slimmed variant — implementation detail) | 200 | yes |
| POST | `/auth/logout` | access token or refresh cookie | any | — | — | 204 | yes |
| GET | `/users/me` | access token | any | — | `CurrentUserResponse` | 200 | no (read-only) |

Idempotency: `register`/`login` are not idempotent by nature (each call has a real
effect/check); `refresh` is safe to retry on network failure only up to the point a
new token has been issued (the rotation itself is not idempotent — a retried refresh
with an already-rotated token hits the reuse-detection path, by design).

---

## Public actions (discovery)

| Method | Path | Auth | Request | Response | Status |
|---|---|---|---|---|---|
| GET | `/actions` | none | query: `category`, `search`, `datePreset` (`today`\|`week`\|`month`\|`all`) or `dateFrom`/`dateTo`, `sort` (`newest`\|`soonest`), `page`, `size` | `PageResponse<ActionSummaryResponse>` | 200 |
| GET | `/actions/{id}` | none | — | `ActionDetailsResponse` | 200, or 404 (ADR-13) |

Both query `v_public_actions` exclusively (ADR-13) — never a raw `actions` table read
for these two endpoints.

---

## Volunteer participation

| Method | Path | Auth | Roles | Request | Response | Status | Transaction |
|---|---|---|---|---|---|---|---|
| POST | `/actions/{id}/participate` | required | `VOLUNTEER` | — | `ParticipationResponse` | 201 | yes (row-locked, ADR/transactions doc) |
| DELETE | `/actions/{id}/participate` | required | `VOLUNTEER` | — | `ParticipationResponse` | 200 | yes |
| GET | `/participations/me` | required | any authenticated | query: `status` filter optional | `PageResponse<MyActionResponse>` | 200 |
| GET | `/actions/{id}/participation` | required | `VOLUNTEER` | — | `ParticipationResponse` \| 404 | 200/404 |

`DELETE .../participate` is a soft-cancel (matches the mock's own
`cancelParticipation`), not a hard row delete — modeled as `DELETE` at the HTTP-verb
level for REST idiom, while the underlying operation is an `UPDATE`.

---

## Organizations and applications

| Method | Path | Auth | Roles | Request | Response | Status |
|---|---|---|---|---|---|---|
| POST | `/organizer-applications` | required | any (pre-organizer) | `OrganizationApplicationRequest` | `OrganizationApplicationResponse` | 201 |
| PATCH | `/organizer-applications/{id}` | required | applicant only | `OrganizationApplicationRequest` | `OrganizationApplicationResponse` | 200 |
| POST | `/organizer-applications/{id}/resubmit` | required | applicant only | `OrganizationApplicationRequest` | `OrganizationApplicationResponse` | 200 |
| GET | `/organizer-applications/me` | required | any | — | `OrganizationApplicationResponse` \| 404 | 200/404 |
| GET | `/organizations/me` | required | `ORGANIZER` | — | `OrganizationResponse` | 200 |
| PATCH | `/organizations/me` | required | `ORGANIZER` | `UpdateOrganizationRequest` | `OrganizationResponse` | 200 |
| POST | `/organizations/me/demote` | required | `ORGANIZER` | — | `{organizationName, actionsRemoved}` | 200 |

`GET /organizer-applications/me` and `GET /organizations/me` may be the same
underlying resource (ADR-8) exposed at two paths for frontend-workflow clarity
(pre-approval vs. post-approval framing, matching `BecomeOrganizerView.vue`'s and
`OrganizerOrganizationView.vue`'s distinct current uses) — both resolve to the
identical `organizations` row for the caller.

**Implementation note**: implemented exactly at these paths, plus the admin surface
(`GET/PATCH /admin/organizations`, `.../approve`, `.../reject`, `.../suspend`,
`.../restore`, `.../demote` — all present, matching the "Admin — organizations" table
below). No standalone public `GET /organizations/{id}` endpoint was added (no
Actions-phase consumer exists yet to justify one) — see
`docs/backend-discovery/api-organizations.md` for the full as-built contract and this
deliberate scope decision.

---

## Organizer actions

| Method | Path | Auth | Roles | Request | Response | Status |
|---|---|---|---|---|---|---|
| GET | `/organizer/actions` | required | `ORGANIZER` | query: `status`, `page`, `size` | `PageResponse<OrganizerActionResponse>` | 200 |
| POST | `/organizer/actions` | required | `ORGANIZER` | `ActionCreateRequest` | `OrganizerActionResponse` | 201 |
| GET | `/organizer/actions/{id}` | required | `ORGANIZER` (owner) | — | `OrganizerActionResponse` | 200, or 404 |
| PATCH | `/organizer/actions/{id}` | required | `ORGANIZER` (owner) | `ActionUpdateRequest` | `OrganizerActionResponse` | 200, or 404 |
| POST | `/organizer/actions/{id}/status` | required | `ORGANIZER` (owner) | `ActionTransitionRequest` | `OrganizerActionResponse` | 200, or 404 |
| GET | `/organizer/actions/{id}/participants` | required | `ORGANIZER` (owner) | query: `status`, `page`, `size` | `PageResponse<{participation: ParticipationResponse, volunteer: UserSummaryResponse, attendance: AttendanceResponse\|null}>` | 200, or 404 |
| GET | `/organizer/actions/{id}/attendance` | required | `ORGANIZER` (owner) | — | `PageResponse<AttendanceResponse>` | 200, or 404 |
| POST | `/organizer/actions/{id}/qr-token` | required | `ORGANIZER` (owner) | — | `QrSessionResponse` | 201 (also used for regenerate — same endpoint, always supersedes, ADR-6) |
| GET | `/organizer/actions/{id}/qr-token` | required | `ORGANIZER` (owner) | — | `QrSessionResponse` \| 404 (none active) | 200/404 |
| POST | `/attendance/check-in/manual` | required | `ORGANIZER` (owner of the participation's action) | `ManualCheckInRequest` | `AttendanceResponse` | 201 |
| POST | `/attendance/{id}/check-out` | required | `ORGANIZER` (owner) | — | `AttendanceResponse` | 200 |

---

## Volunteer attendance

| Method | Path | Auth | Roles | Request | Response | Status |
|---|---|---|---|---|---|---|
| POST | `/attendance/validate-token` | required | any authenticated | `{token}` | `{action: ActionSummaryResponse}` | 200 |
| POST | `/attendance/check-in/qr` | required | `VOLUNTEER` | `QrCheckInRequest` | `AttendanceResponse` | 201 |
| GET | `/attendance/me` | required | any authenticated | — | `PageResponse<AttendanceResponse>` | 200 |

---

## Reports

| Method | Path | Auth | Roles | Request | Response | Status |
|---|---|---|---|---|---|---|
| POST | `/actions/{id}/reports` | required | `VOLUNTEER` | `ActionReportRequest` | `ReportResponse` | 201 |

---

## Admin — users

| Method | Path | Auth | Roles | Request | Response | Status |
|---|---|---|---|---|---|---|
| GET | `/admin/users` | required | `ADMINISTRATOR` | query: `search`, `role`, `status`, `page`, `size` | `PageResponse<CurrentUserResponse>` | 200 |
| GET | `/admin/users/{id}` | required | `ADMINISTRATOR` | — | `CurrentUserResponse` | 200, or 404 |
| PATCH | `/admin/users/{id}` | required | `ADMINISTRATOR` | `UpdateUserRequest` | `CurrentUserResponse` | 200, or 404 |
| POST | `/admin/users/{id}/suspend` | required | `ADMINISTRATOR` | — | `CurrentUserResponse` | 200, or 400 (self) |
| POST | `/admin/users/{id}/reactivate` | required | `ADMINISTRATOR` | — | `CurrentUserResponse` | 200 |

## Admin — organizations

| Method | Path | Auth | Roles | Request | Response | Status |
|---|---|---|---|---|---|---|
| GET | `/admin/organizations` | required | `ADMINISTRATOR` | query: `status`, `search`, `page`, `size` | `PageResponse<OrganizationResponse>` | 200 |
| GET | `/admin/organizations/{id}` | required | `ADMINISTRATOR` | — | `OrganizationResponse` | 200, or 404 |
| PATCH | `/admin/organizations/{id}` | required | `ADMINISTRATOR` | `UpdateOrganizationRequest` | `OrganizationResponse` | 200 |
| POST | `/admin/organizations/{id}/approve` | required | `ADMINISTRATOR` | — | `OrganizationResponse` | 200, or 400 (invalid transition) |
| POST | `/admin/organizations/{id}/reject` | required | `ADMINISTRATOR` | `{reason}` | `OrganizationResponse` | 200 |
| POST | `/admin/organizations/{id}/suspend` | required | `ADMINISTRATOR` | — | `OrganizationResponse` | 200 |
| POST | `/admin/organizations/{id}/restore` | required | `ADMINISTRATOR` | — | `OrganizationResponse` | 200 |
| POST | `/admin/organizations/{id}/demote` | required | `ADMINISTRATOR` | — | `{organizationName, actionsRemoved}` | 200 |

## Admin — actions and moderation

| Method | Path | Auth | Roles | Request | Response | Status |
|---|---|---|---|---|---|---|
| GET | `/admin/actions` | required | `ADMINISTRATOR` | query: `moderationStatus`, `lifecycleStatus`, `search`, `page`, `size` | `PageResponse<OrganizerActionResponse>` | 200 |
| GET | `/admin/actions/{id}` | required | `ADMINISTRATOR` | — | `OrganizerActionResponse` | 200, or 404 |
| PATCH | `/admin/actions/{id}` | required | `ADMINISTRATOR` | `ActionUpdateRequest` | `OrganizerActionResponse` | 200 |
| POST | `/admin/actions/{id}/moderation` | required | `ADMINISTRATOR` | `ModerationTransitionRequest` | `OrganizerActionResponse` | 200, or 400 |
| POST | `/admin/actions/{id}/status` | required | `ADMINISTRATOR` | `ActionTransitionRequest` | `OrganizerActionResponse` | 200 |

## Admin — reports

| Method | Path | Auth | Roles | Request | Response | Status |
|---|---|---|---|---|---|---|
| GET | `/admin/reports` | required | `ADMINISTRATOR` | query: `status`, `reason`, `page`, `size` | `PageResponse<ReportResponse>` | 200 |
| GET | `/admin/reports/{id}` | required | `ADMINISTRATOR` | — | `ReportResponse` | 200, or 404 |
| POST | `/admin/reports/{id}/status` | required | `ADMINISTRATOR` | `ModerationTransitionRequest`-shaped (`{status, note}`) | `ReportResponse` | 200, or 400 |

## Admin — activity

| Method | Path | Auth | Roles | Request | Response | Status |
|---|---|---|---|---|---|---|
| GET | `/admin/activity` | required | `ADMINISTRATOR` | query: `actionType`, `targetType`, `page`, `size` | `PageResponse<ActivityLogResponse>` | 200 |

## Admin — dashboard summary

| Method | Path | Auth | Roles | Request | Response | Status |
|---|---|---|---|---|---|---|
| GET | `/admin/dashboard/summary` | required | `ADMINISTRATOR` | — | `{totalUsers, activeVolunteers, organizerCount, pendingOrganizerApprovals, publishedActionsCount, actionsAwaitingReview, suspendedAccounts, openReports}` | 200 |

`publishedActionsCount` is computed via `ActionVisibilityQueryService`/
`v_public_actions` (ADR-13) — **not** recomputed inline, closing the mock's own
`AdminDashboardView.vue` duplication (risk #16) at the API layer directly.

---

## Pagination, filtering and search

- **Page numbering**: zero-based (`page=0` is the first page), matching Spring Data's
  own `Pageable` convention.
- **Default page size**: 20. **Maximum page size**: 100 (a request for more is
  clamped, not rejected, to prevent unbounded fetches per the brief's explicit
  instruction).
- **Sorting syntax**: `sort=<field>,<asc|desc>`, repeatable for multi-field sort
  (Spring Data's native `Pageable` binding supports this without custom code).
- **Case-insensitive, diacritic-insensitive search (ADR-17)**: every searchable text
  column (`actions.title_el/en`, `location_name_*`, `municipality_*`,
  `organizations.name_*`, `users.first_name`/`last_name`/`email`) is defined with the
  table's `utf8mb4_0900_ai_ci` collation — MySQL 8's accent-insensitive (`_ai_`),
  case-insensitive (`_ci_`) collation, built on the Unicode 9.0 collation algorithm —
  so a plain `column LIKE :query` (with `%` wildcards, no `lower()`/`unaccent()` call
  needed) already matches regardless of case or Greek tonos/diacritics. This replaces
  PostgreSQL's `unaccent` extension + `lower()` function pair with a single
  column/table-level property, and directly reimplements the frontend's own
  `normalizeSearchText.js` (`NFD`-normalize + strip combining marks) as a
  database-side equivalent, so search behavior is identical whether it runs
  client-side (today, against the mock) or server-side (after the actions domain's
  phase of the implementation order).
- **Indexes needed for search performance**: a plain `INDEX` on each searched column
  above is sufficient for prefix `LIKE 'query%'` matching; MySQL's collation-aware
  comparison means no separate functional/expression index (as the `lower(unaccent(...))`
  PostgreSQL design required) is needed — the collation is a property of the column
  itself, not of a derived expression. This is simple substring/prefix matching, not
  ranked relevance search; MySQL's `FULLTEXT` index type (its nearest equivalent to
  PostgreSQL's `tsvector`-based full-text search) is a documented, natural future
  option if search quality ever needs to improve, not required now.
- **No large unbounded list fetches**: every list endpoint above is paginated;
  none returns an unbounded array.

### Public actions filters

`category` (single `ActionCategory` value), `search` (free text, see above),
`datePreset` (`today`/`week`/`month`/`all`, matching the mock's exact semantics from
`docs/backend-discovery/service-contracts.md`) **or** an explicit `dateFrom`/`dateTo`
range (new, additive — not present in the mock, offered as a natural superset since
the backend can trivially support it once querying a real date range, without removing
the preset option the frontend already uses), `sort` (`newest`/`soonest`).

### Admin filters

Users: `search` (name/email), `role`, `status`. Organizations: `status`, `search`
(name). Actions: `moderationStatus`, `lifecycleStatus`, `search` (title/organization
name/municipality). Reports: `status`, `reason`. Activity: `actionType`, `targetType`.

### Organizer filters

Own actions: `status` (lifecycle). Participants: `status` (participation status).

---

## Traceability table

Maps every current frontend service method (`docs/backend-discovery/service-contracts.md`)
to its backend endpoint, module, database tables, DTOs, business rules, and error
codes. Where a contract is **deliberately changed** rather than preserved as-is, the
row is marked accordingly (only two such cases exist, both already called out in
`architecture-decisions.md`: ADR-4's membership elimination, and ADR-10's closed-action
join gap being *closed* rather than left open).

| Frontend service method | API endpoint | Module | Tables | DTOs | Business rule(s) | Error codes |
|---|---|---|---|---|---|---|
| `auth.service.js::login` | `POST /auth/login` | `auth` | `users`, `refresh_tokens` | `LoginRequest`→`AuthResponse` | suspended-account check | `auth.unknownEmail`, `auth.invalidPassword`, `auth.accountSuspended` |
| `auth.service.js::register` | `POST /auth/register` | `auth` | `users`, `refresh_tokens` | `RegisterRequest`→`AuthResponse` | volunteer-only registration | `auth.duplicateEmail` |
| `auth.service.js::logout` | `POST /auth/logout` | `auth` | `refresh_tokens` | — | refresh-token revocation | — |
| `auth.service.js::getCurrentSession` | `POST /auth/refresh`, `GET /users/me` | `auth`, `users` | `refresh_tokens`, `users` | `AuthResponse`/`CurrentUserResponse` | suspension re-check, staleness bound (ADR-3) | `auth.invalidSession`, `auth.accountSuspended` |
| `auth.service.js::getUserById` | (internal, composed into `UserSummaryResponse` fields on other endpoints) | `users` | `users` | `UserSummaryResponse` | — | — |
| `auth.service.js::getAllUsers` | `GET /admin/users` | `users` | `users` | `PageResponse<CurrentUserResponse>` | admin-only | — |
| `adminUsers.service.js::suspendUser` | `POST /admin/users/{id}/suspend` | `users` | `users`, `refresh_tokens`, `admin_activity_log` | `CurrentUserResponse` | self-suspend guard; token revocation (ADR-3) | `admin.cannotSuspendSelf` |
| `adminUsers.service.js::reactivateUser` | `POST /admin/users/{id}/reactivate` | `users` | `users`, `admin_activity_log` | `CurrentUserResponse` | — | — |
| `adminUsers.service.js::updateUserProfile` | `PATCH /admin/users/{id}` | `users` | `users`, `admin_activity_log` (**newly logged**, closing a mock gap) | `UpdateUserRequest`→`CurrentUserResponse` | role never editable | `admin.duplicateEmail`, `admin.invalidRequest` |
| `organizations.service.js::getOrganizations` | `GET /admin/organizations` | `organizations` | `organizations` | `PageResponse<OrganizationResponse>` | admin-only | — |
| `organizations.service.js::approveOrganization` | `POST /admin/organizations/{id}/approve` | `organizations` | `organizations`, `users`, `refresh_tokens`, `admin_activity_log` | `OrganizationResponse` | approval grants role (ADR-4 — **contract change**: no separate membership row created, unlike the mock) | `organization.invalidTransition` |
| `organizations.service.js::rejectOrganization` | `POST /admin/organizations/{id}/reject` | `organizations` | `organizations`, `admin_activity_log` | `OrganizationResponse` | reason required | `organization.reasonRequired`, `.invalidTransition` |
| `organizations.service.js::suspendOrganization` / `restoreOrganization` | `POST /admin/organizations/{id}/suspend`\|`/restore` | `organizations` | `organizations`, `admin_activity_log` | `OrganizationResponse` | non-cascading, role untouched | `.invalidTransition` |
| `organizations.service.js::updateOrganizationDetails` | `PATCH /admin/organizations/{id}` | `organizations` | `organizations` | `UpdateOrganizationRequest`→`OrganizationResponse` | shared validation with organizer edit | field-validation codes |
| `organizationApplication.service.js::submitOrganizationApplication` | `POST /organizer-applications` | `organizations` | `organizations` | `OrganizationApplicationRequest`→`Response` | unique-organizer constraint (ADR-15) | `.alreadyHasOrganization`, `.suspended`, field codes |
| `organizationApplication.service.js::updatePendingApplication` | `PATCH /organizer-applications/{id}` | `organizations` | `organizations` | same | pending-only | `.notPending` |
| `organizationApplication.service.js::resubmitRejectedApplication` | `POST /organizer-applications/{id}/resubmit` | `organizations` | `organizations` | same | rejected-only | `.notRejected` |
| `organizationApplication.service.js::updateOrganizationProfile` | `PATCH /organizations/me` | `organizations` | `organizations` | `UpdateOrganizationRequest`→`OrganizationResponse` | approved/suspended-only | `.notOrganizer` |
| `organizationApplication.service.js::getUserOrganizationMembership` | *(eliminated — ADR-4, contract change)* | — | — | — | membership folded into `organizations.organizer_user_id` | — |
| `organizerDemotion.service.js::demoteOrganizerToVolunteer` | `POST /organizations/me/demote`, `POST /admin/organizations/{id}/demote` | `organizations` (orchestrates `actions`/`moderation`/`participation`/`attendance`/`reports`) | all cascade tables (`transactions-and-integrity.md`) | `{organizationName, actionsRemoved}` | full transactional cascade | `.notOrganizer` |
| `actions.service.js::getActions` | `GET /actions` | `actions` | `v_public_actions`, `organizations` | `PageResponse<ActionSummaryResponse>` | ADR-13 visibility policy | — |
| `actions.service.js::getActionById` | `GET /actions/{id}` | `actions` | `v_public_actions`, `organizations` | `ActionDetailsResponse` | ADR-13; 404-not-403 | `action.notFound` |
| `organizerActions.service.js::getOrganizerActions` | `GET /organizer/actions` | `actions` | `actions`, `action_moderation`, `participations` (count) | `PageResponse<OrganizerActionResponse>` | ownership | — |
| `organizerActions.service.js::createOrganizerAction` | `POST /organizer/actions` | `actions`, `moderation` | `actions`, `action_moderation` (eager row, ADR-7) | `ActionCreateRequest`→`OrganizerActionResponse` | org-status gate | `.organizationSuspended`, `.organizationNotApproved`, field codes |
| `organizerActions.service.js::updateOrganizerAction` | `PATCH /organizer/actions/{id}` | `actions` | `actions`, `participations` (capacity check) | `ActionUpdateRequest`→`OrganizerActionResponse` | capacity floor | `.capacityBelowConfirmed` |
| `organizerActions.service.js::changeOrganizerActionStatus` | `POST /organizer/actions/{id}/status` | `actions` | `actions`, `admin_activity_log` (**newly logged for organizer-initiated changes too**) | `ActionTransitionRequest`→`OrganizerActionResponse` | transition table + past-date republish guard | `.invalidTransition`, `.actionDateInPast` |
| `organizerActions.service.js::getOrganizerActionParticipants` | `GET /organizer/actions/{id}/participants` | `actions`, `participation`, `attendance`, `users` | `participations`, `attendance`, `users` | composed participant list DTO | ownership | `.notOwner` |
| `organizerActions.service.js::validatePayload` | (internal, shared) | `actions` | — | — | reused identically by admin content-edit (`error-contract.md` § no duplicated rules) | field codes |
| `actionVisibility.js::isActionPubliclyVisible` | (internal — `v_public_actions` view + `ActionVisibilityQueryService`) | `actions` | `v_public_actions` | — | ADR-13, single authoritative policy | — |
| `actionModeration.service.js::getModeratedActions`/`getModeratedActionById` | `GET /admin/actions`, `GET /admin/actions/{id}` | `moderation`, `actions` | `actions`, `action_moderation` | `PageResponse<OrganizerActionResponse>` / single | admin-only | — |
| `actionModeration.service.js::approveAction`/`rejectAction`/`hideAction`/`restoreAction` | `POST /admin/actions/{id}/moderation` | `moderation` | `action_moderation`, `action_moderation_history`, `admin_activity_log` | `ModerationTransitionRequest`→`OrganizerActionResponse` | transition table | `.invalidTransition`, `.reasonRequired` |
| `actionModeration.service.js::updateActionDetails` | `PATCH /admin/actions/{id}` | `moderation` (delegates to `actions`' shared validator) | `actions`, `admin_activity_log` (**newly logged**, closing a mock gap) | same as organizer edit | capacity floor | `.capacityBelowConfirmed` |
| `actionModeration.service.js::changeActionLifecycleStatus` | `POST /admin/actions/{id}/status` | `moderation` (delegates to `actions`' shared transition logic) | `actions`, `admin_activity_log` | `ActionTransitionRequest`→`OrganizerActionResponse` | same one transition implementation as organizer path | same codes |
| `participation.service.js::getUserParticipations` | `GET /participations/me` | `participation` | `participations` | `PageResponse<MyActionResponse>` | own-data-only | — |
| `participation.service.js::getActionParticipants` | (composed into `GET /organizer/actions/{id}/participants`) | `participation` | `participations` | — | ownership | — |
| `participation.service.js::getParticipation`/`getParticipationById` | (internal, consumed by `attendance`) | `participation` | `participations` | — | — | — |
| `participation.service.js::joinAction` | `POST /actions/{id}/participate` | `participation` | `participations` | `ParticipationResponse` | ADR-10 eligibility (**contract change: closes the mock's own gap**), capacity race (transactions doc), duplicate-confirmed constraint | `.actionNotFound`, `.actionClosed`, `.actionFull`, `.alreadyJoined`, new `.organizationNotApproved`/`.actionNotModerated` |
| `participation.service.js::cancelParticipation` | `DELETE /actions/{id}/participate` | `participation` | `participations` | `ParticipationResponse` | soft-cancel, `cancelledAt` required by `CHECK` | `.participationNotFound` |
| `participationCount.js::getLocalConfirmedCount`/`withOverlaidCount` | (eliminated as frontend logic — folded into `ActionSummaryResponse.registeredCount`, ADR-5) | `participation`/`actions` | `participations` | — | single source of truth | — |
| `attendance.service.js::checkInByQr` | `POST /attendance/check-in/qr` | `attendance` | `attendance`, `qr_check_in_tokens`, `participations` | `QrCheckInRequest`→`AttendanceResponse` | ADR-6 token validation, ADR-11 window | `.invalidToken`, `.expiredToken`, `.notConfirmed`, `.alreadyCheckedIn`, `.actionNotJoinable`, new `.outsideCheckInWindow` |
| `attendance.service.js::checkInManually` | `POST /attendance/check-in/manual` | `attendance` | `attendance`, `participations`, `admin_activity_log` (**newly logged**) | `ManualCheckInRequest`→`AttendanceResponse` | ownership | `.notOwner`, `.notConfirmed`, `.alreadyCheckedIn` |
| `attendance.service.js::checkOut` | `POST /attendance/{id}/check-out` | `attendance` | `attendance`, `admin_activity_log` (**newly logged**) | `AttendanceResponse` | ownership, terminal state | `.notOwner`, `.notCheckedIn` |
| `attendance.service.js::generateCheckInSession` | `POST /organizer/actions/{id}/qr-token` | `attendance` | `qr_check_in_tokens` | `QrSessionResponse` | ADR-6, always supersedes | `.notOwner`, `.actionNotJoinable` |
| `attendance.service.js::getActiveCheckInSession` | `GET /organizer/actions/{id}/qr-token` | `attendance` | `qr_check_in_tokens` | `QrSessionResponse` | ownership | `.notOwner` |
| `attendance.service.js::validateCheckInToken` | `POST /attendance/validate-token` | `attendance` | `qr_check_in_tokens` | `{action}` | pre-check, no state change | `.invalidToken`, `.expiredToken` |
| `attendance.service.js::getActionAttendance`/`getUserAttendance`/`getAttendanceByParticipation` | `GET /organizer/actions/{id}/attendance`, `GET /attendance/me` | `attendance` | `attendance` | `PageResponse<AttendanceResponse>` | ownership / own-data-only | — |
| `reports.service.js::createReport` | `POST /actions/{id}/reports` | `reports` | `action_reports` | `ActionReportRequest`→`ReportResponse` | ADR-12 duplicate-active scope (**widened vs. mock**), own-action restriction | `.invalidRequest`, `.notFound`, `.cannotReportOwnAction`, `.duplicateOpenReport` |
| `reports.service.js::getReports`/`getReportById` | `GET /admin/reports`, `GET /admin/reports/{id}` | `reports` | `action_reports` | `PageResponse<ReportResponse>` / single | admin-only | — |
| `reports.service.js::updateReportStatus` | `POST /admin/reports/{id}/status` | `reports` | `action_reports`, `admin_activity_log` | `{status, note}`→`ReportResponse` | transition table, note retained on reopen | `.invalidTransition` |
| `activityLog.service.js::getActivityLog` | `GET /admin/activity` | `adminactivity` | `admin_activity_log` | `PageResponse<ActivityLogResponse>` | admin-only, read-only | — |
| *(mock: scattered direct `logActivity` calls)* | *(internal `ActivityLogger` interface, no endpoint)* | `adminactivity` | `admin_activity_log` | — | **contract change**: centralized write path (`system-architecture.md`), plus **expanded scope** (action creation/edit, manual attendance, admin profile edits now logged — all previously-unlogged mock gaps closed per Part 1 item 11) | — |

**No frontend service contract was silently dropped.** The two deliberate,
explicitly-marked changes above (membership elimination, participation-eligibility
gap closure) are the only places this design departs from a 1:1 mock mapping, and both
are documented as intentional corrections in `architecture-decisions.md`, not
oversights.
