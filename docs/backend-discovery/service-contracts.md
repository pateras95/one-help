# Service Contract Inventory

Every frontend service method currently consumed by the app, grouped by domain. All
services share one mechanism: **`mockResponse(data, {delay=400, shouldFail=false,
errorMessage='Το αίτημα απέτυχε.'})`** (`src/utils/mockResponse.js`) — a
`setTimeout`-wrapped `Promise` that either resolves `data` or rejects
`new Error(errorMessage)`. There is no HTTP-status-code concept anywhere in the mock
layer; every domain error is a stable string constant carried as `Error.message` (e.g.
`PARTICIPATION_ERROR.ACTION_FULL`), translated downstream via a per-domain
`*ErrorKey(code)` helper into an i18n key (`participation.errors.actionFull`, falling
back to `...generic` for anything unrecognized). This pattern is uniform across all 10+
services and is the thing a real Axios error interceptor must reproduce (mapping HTTP
error responses back to the same domain error-code vocabulary) if the frontend's error
handling is to survive the swap unchanged.

Default loading delay is 400ms unless a service explicitly overrides it (e.g. auth's
`logout`/`getCurrentSession` use 150ms).

"Recommended future endpoint" columns are directional suggestions only — full OpenAPI
design is out of scope for this phase.

---

## Authentication (`features/auth/services/auth.service.js`)

| Method | Params | Returns | Success | Error behavior / codes | Consumers | Recommended HTTP |
|---|---|---|---|---|---|---|
| `login(email, password)` | email, password | sanitized `User` | resolves sanitized user | `unknownEmail` (no match), `invalidPassword` (mismatch), `accountSuspended` (checked via **admin**'s `getUserStatus`) | `auth.store.js` | `POST /api/v1/auth/login` |
| `register({firstName,lastName,email,password})` | payload | sanitized `User` (new volunteer) | appends to in-memory `usersDb`, always role `VOLUNTEER` — "organizer registration isn't offered in this phase" | `duplicateEmail` (case-insensitive) | `auth.store.js` | `POST /api/v1/auth/register` |
| `logout()` | — | `true` | no-op (150ms delay) — "no mock server state to invalidate" | never fails | `auth.store.js` | `POST /api/v1/auth/logout` (real backend: invalidate session/refresh token) |
| `getCurrentSession(userId)` | userId | sanitized `User` | re-validates against `usersDb` + suspension, 150ms delay | `invalidSession` (user gone), `accountSuspended` | `auth.store.js` (`initializeSession`, called at boot and on every router navigation, memoized) | `GET /api/v1/auth/me` |
| `getUserById(userId)` | userId | sanitized `User` \| `null` | never rejects — returns `null` for "not found," used for safe display lookups | — | `organizer/services/organizerActions.service.js` (participant identity), `admin/views/AdminReportsView.vue` | `GET /api/v1/users/{id}` (public-safe subset) |
| `getAllUsers()` | — | `Array<User>` (sanitized) | — | — | `admin/services/adminUsers.service.js` | `GET /api/v1/admin/users` |

## Users & Roles (`features/admin/services/adminUsers.service.js`)

| Method | Params | Returns | Success | Error codes | Consumers | Recommended HTTP |
|---|---|---|---|---|---|---|
| `getUsers()` | — | `Array<User>`, newest-`createdAt`-first | via `getAllUsers()` | — | `adminUsers.store.js` | `GET /api/v1/admin/users` |
| `suspendUser(adminUserId, targetUserId)` | ids | updated `User` | `setUserStatus(SUSPENDED)` + `logActivity(USER_SUSPENDED)` | `cannotSuspendSelf`, `notFound` | `adminUsers.store.js` | `POST /api/v1/admin/users/{id}/suspend` |
| `reactivateUser(adminUserId, targetUserId)` | ids | updated `User` | `setUserStatus(ACTIVE)` + `logActivity(USER_REACTIVATED)` | `notFound` | `adminUsers.store.js` | `POST /api/v1/admin/users/{id}/reactivate` |
| `updateUserProfile(adminUserId, targetUserId, payload)` | ids, `{firstName,lastName,email}` | updated `User` | writes `userProfileOverride`; **role is never editable here** | `invalidRequest` (empty name), `duplicateEmail` (regex `EMAIL_PATTERN`, checked against all users excluding self) | `AdminUsersView.vue` | `PATCH /api/v1/admin/users/{id}` |

## Organizations & organizer applications

### `features/admin/services/organizations.service.js` (admin-side management)

| Method | Params | Returns | Success | Error codes | Consumers | Recommended HTTP |
|---|---|---|---|---|---|---|
| `getOrganizations()` | — | `Array<Organization>`, sorted pending→approved→suspended→rejected then `submittedAt` desc | — | — | `adminOrganizations.store.js` | `GET /api/v1/admin/organizations` |
| `getOrganizationById(id)` | id | `Organization` \| `null` | — | — | (internal) | `GET /api/v1/admin/organizations/{id}` |
| `approveOrganization(adminUserId, organizationId)` | ids | updated `Organization` | `applyTransition` → `createOwnerMembership` + `setUserRoleOverride(ORGANIZER)` + `logActivity(ORGANIZATION_APPROVED)` | `invalidTransition` | `adminOrganizations.store.js` | `POST /api/v1/admin/organizations/{id}/approve` |
| `rejectOrganization(adminUserId, organizationId, reason)` | ids, reason | updated `Organization` | requires non-empty reason | `reasonRequired`, `invalidTransition` | `adminOrganizations.store.js` | `POST /api/v1/admin/organizations/{id}/reject` |
| `suspendOrganization(adminUserId, organizationId)` | ids | updated `Organization` | `setMembershipStatusForOrganization(SUSPENDED)` — membership preserved, role override **untouched** | `invalidTransition` | `adminOrganizations.store.js` | `POST /api/v1/admin/organizations/{id}/suspend` |
| `restoreOrganization(adminUserId, organizationId)` | ids | updated `Organization` | inverse of suspend | `invalidTransition` | `adminOrganizations.store.js` | `POST /api/v1/admin/organizations/{id}/restore` |
| `updateOrganizationDetails(adminUserId, organizationId, payload)` | ids, payload | updated `Organization` | reuses `validateOrganizationPayload`/`buildOrganizationFieldsFromPayload` from **organizerApplication** feature | `invalidRequest`, `notFound`, plus `APPLICATION_ERROR.*` codes surfaced through | `AdminOrganizationsView.vue` | `PATCH /api/v1/admin/organizations/{id}` |

### `features/organizerApplication/services/organizationApplication.service.js` (organizer-side)

| Method | Params | Returns | Success | Error codes | Consumers | Recommended HTTP |
|---|---|---|---|---|---|---|
| `getApplicationForUser(userId)` | userId | `Organization` \| `null` | — | — | `organizationApplication.store.js`, `AdminUsersView.vue` (direct import, bypasses the store) | `GET /api/v1/organizer-applications/me` |
| `getUserOrganizationMembership(userId)` | userId | `Membership` \| `null` | — | — | `organizationApplication.store.js` | (folded into the above if membership is eliminated as a model, see risks doc) |
| `getOrganizationForUser(userId)` | userId | `Organization` \| `null` (via membership → org lookup) | — | — | (internal) | — |
| `submitOrganizationApplication(userId, payload)` | userId, form payload | new `Organization` (`status: pending`) | blocks if any existing org record for this user regardless of status | `alreadyHasOrganization`, `suspended` (special case if a prior org was suspended), plus field-validation codes (`invalidOrganizationType`, `invalidEmail`, `invalidWebsite`, `invalidCategories`, `duplicateName`, `termsNotAccepted`) | `BecomeOrganizerView.vue` | `POST /api/v1/organizer-applications` |
| `updatePendingApplication(userId, applicationId, payload)` | ids, payload | updated `Organization` | only while `status === pending` | `notPending`, field-validation codes | `BecomeOrganizerView.vue` | `PATCH /api/v1/organizer-applications/{id}` |
| `resubmitRejectedApplication(userId, applicationId, payload)` | ids, payload | updated `Organization`, `status → pending`, `previousRejectionReason` set from old `rejectionReason`, `rejectionReason` cleared | only while `status === rejected` | `notRejected`, field-validation codes | `BecomeOrganizerView.vue` | `POST /api/v1/organizer-applications/{id}/resubmit` |
| `updateOrganizationProfile(userId, payload)` | userId, payload | updated `Organization` | only while `status ∈ {approved, suspended}` | `notOrganizer`, `invalidRequest` | `OrganizerOrganizationView.vue` | `PATCH /api/v1/organizations/me` |

### `features/organizerApplication/services/organizerDemotion.service.js` (the cascade)

| Method | Params | Returns | Success | Error codes | Consumers | Recommended HTTP |
|---|---|---|---|---|---|---|
| `demoteOrganizerToVolunteer(userId, initiatedBy)` | target userId, acting userId (may equal target for self-service) | `{organizationName, actionsRemoved: number}` | full cascade — see business-rules.md; logs `ORGANIZER_DEMOTED` **only** when `initiatedBy !== userId` (admin-initiated) | `invalidRequest`, `notOrganizer` | `OrganizerOrganizationView.vue` (self-service), `AdminOrganizationsView.vue` (admin-initiated) | `POST /api/v1/organizers/{userId}/demote` — **must run inside a single backend transaction**, see business-rules.md |

## Actions (public discovery) — `features/actions/services/actions.service.js`

| Method | Params | Returns | Success | Error behavior | Consumers | Recommended HTTP |
|---|---|---|---|---|---|---|
| `getActions({category, search, datePreset, sort, locale})` | filters | `Array<Action>` (localized, status-derived, publicly-visible only) | filters merged actions through `isActionPubliclyVisible` then category/search/date-preset/sort | never rejects (empty array on no match) | `actions.store.js`, `MapView.vue` (indirectly via store) | `GET /api/v1/actions?category=&search=&datePreset=&sort=` |
| `getActionById(id, locale)` | id, locale | `Action` \| `null` | returns `null` (not a rejection) for not-found **or** not-publicly-visible (draft/cancelled/unapproved reads as "not found" to a visitor) | — | `actions.store.js`, `participation.service.js` (join-time lookup), `MyActionsView.vue` | `GET /api/v1/actions/{id}` |

Derived, in-service (not persisted) logic worth flagging as **candidates for
server-side computed fields** rather than stored columns: `status` (`closed` if
organizer closed it, else `completed` if past date, else `full` if at capacity, else
`open`) and `organizationDetails` (public-safe subset of the resolved `Organization`).

## Organizer actions (CRUD + lifecycle) — `features/organizer/services/organizerActions.service.js`

| Method | Params | Returns | Success | Error codes | Consumers | Recommended HTTP |
|---|---|---|---|---|---|---|
| `getOrganizerActions(organizerId)` | organizerId | `Array<Action>` owned by this organizer | — | — | `organizer.store.js`, `AdminOrganizationsView.vue` (direct import) | `GET /api/v1/organizer/actions` |
| `getOrganizerActionById(organizerId, actionId)` | ids | `Action` \| rejection | ownership-checked | `actionNotFound`, `notOwner` | `organizer.store.js` | `GET /api/v1/organizer/actions/{id}` |
| `createOrganizerAction(organizerId, payload)` | organizerId, payload | new `Action` | org-status gate (`checkOrganizationGate`) → `validatePayload` → status must be `draft`/`published` | `organizationSuspended`, `organizationNotApproved`, plus field codes (`invalidCategory`, `invalidDate`, `invalidCapacity`, `invalidCoordinates`, `invalidStatus`) | `organizer.store.js` | `POST /api/v1/organizer/actions` |
| `updateOrganizerAction(organizerId, actionId, payload)` | ids, payload | updated `Action` | ownership → gate (no target status) → `validatePayload` → capacity-vs-confirmed check (`getLocalConfirmedCount` overlay) | `notOwner`, `capacityBelowConfirmed`, field codes | `organizer.store.js` | `PATCH /api/v1/organizer/actions/{id}` |
| `changeOrganizerActionStatus(organizerId, actionId, status)` | ids, target status | updated `Action` | ownership → org gate (with target status) → `canTransition` → dynamic past-date guard on republish | `invalidStatus`, `invalidTransition`, `actionDateInPast`, `organizationSuspended`, `organizationNotApproved` | `organizer.store.js`, `admin/services/actionModeration.service.js` (`changeActionLifecycleStatus` delegates here — "there is only one place those rules live") | `POST /api/v1/organizer/actions/{id}/status` |
| `getOrganizerActionParticipants(organizerId, actionId)` | ids | `Array<{participation fields, firstName, lastName, email, avatarInitials}>` | joins participation records with sanitized user identity (never password) | `notOwner` | `organizer.store.js` | `GET /api/v1/organizer/actions/{id}/participants` |
| `validatePayload(payload)` (exported helper, not itself async) | payload | error code \| `null` | reused verbatim by `admin/services/actionModeration.service.js`'s `updateActionDetails` — "an admin edit can never produce a record the organizer's own form would reject" | — | organizer form, admin edit form | (becomes shared backend validation, e.g. a Bean Validation group or shared DTO validator) |

## Participation — `features/participation/services/participation.service.js`

| Method | Params | Returns | Success | Error codes | Consumers | Recommended HTTP |
|---|---|---|---|---|---|---|
| `getUserParticipations(userId)` | userId | `Array<Participation>`, all statuses, newest-`joinedAt`-first | — | — | `participation.store.js` | `GET /api/v1/participations/me` |
| `getActionParticipants(actionId)` | actionId | `Array<Participation>`, all users | — | — | `organizerActions.service.js` (participant list) | `GET /api/v1/actions/{id}/participants` |
| `getParticipation(userId, actionId)` | ids | "current" record: confirmed wins, else most-recent-cancelled, else `null` | — | — | `attendance.service.js` (QR check-in path), `participation.store.js` | `GET /api/v1/actions/{id}/participation?userId=` (or derived from the authenticated caller) |
| `getParticipationById(participationId)` | id | `Participation` \| `null` | used by **attendance** to reference by participation id rather than duplicating user/action fields | — | `attendance.service.js` (manual check-in path) | `GET /api/v1/participations/{id}` |
| `isParticipating(userId, actionId)` | ids | `boolean` | true only if a CONFIRMED record exists | — | (available, not directly grepped as used outside the store's own `isParticipating`) | derivable client-side from the participation list; may not need its own endpoint |
| `joinAction(userId, actionId)` | ids | new `Participation` | action must exist, not past-dated, no existing confirmed record, capacity check against overlaid count | `invalidRequest`, `actionNotFound`, `actionClosed` (past-date only — **does not check `organizerStatus === closed`, see risks doc**), `alreadyJoined`, `actionFull` | `participation.store.js` | `POST /api/v1/actions/{id}/participate` |
| `cancelParticipation(userId, actionId)` | ids | updated `Participation` (soft-cancel) | must have a currently-confirmed record | `invalidRequest`, `participationNotFound` | `participation.store.js` | `DELETE /api/v1/actions/{id}/participate` (soft-cancel semantics, not a hard delete) |

## Attendance & QR — `features/attendance/services/attendance.service.js`

| Method | Params | Returns | Success | Error codes | Consumers | Recommended HTTP |
|---|---|---|---|---|---|---|
| `checkInByQr({token, userId})` | token, userId | new `Attendance` | decode → expiry check → action/organizer-match check → shared `performCheckIn` gate (published+visible, confirmed participation, no duplicate) | `invalidRequest`, `invalidToken`, `expiredToken`, `notConfirmed`, `alreadyCheckedIn`, `actionNotJoinable` | `attendance.store.js` (`CheckInView.vue`) | `POST /api/v1/attendance/check-in/qr` |
| `checkInManually(organizerId, participationId)` | ids | new `Attendance` | resolves participation → ownership check → shared `performCheckIn` gate | `invalidRequest`, `participationNotFound`, `notOwner`, `notConfirmed`, `alreadyCheckedIn`, `actionNotJoinable` | `OrganizerParticipantsView.vue` | `POST /api/v1/attendance/check-in/manual` |
| `checkOut(organizerId, attendanceId)` | ids | updated `Attendance` | must be currently `CHECKED_IN`, owned by requesting organizer | `invalidRequest`, `notOwner`, `notCheckedIn` | `OrganizerParticipantsView.vue` | `POST /api/v1/attendance/{id}/check-out` |
| `generateCheckInSession(organizerId, actionId)` | ids | new/replacing `QrSession` | ownership + published+visible gate; always supersedes prior session for the action (used for both "generate" and "regenerate") | `invalidRequest`, `notOwner`, `actionNotJoinable` | `attendance.store.js` (`OrganizerCheckInView.vue`) | `POST /api/v1/organizer/actions/{id}/qr-session` |
| `getActiveCheckInSession(organizerId, actionId)` | ids | `QrSession` \| `null` | ownership-checked read; returns `null` if expired/malformed even if a stale row still exists | — | `attendance.store.js` | `GET /api/v1/organizer/actions/{id}/qr-session` |
| `validateCheckInToken(token)` | token | `{action, payload}` \| rejection | decode + expiry + ownership-consistency, **does not perform check-in** — used to show a confirm screen first | `invalidToken`, `expiredToken` | `CheckInView.vue` | `POST /api/v1/attendance/validate-token` |
| `getActionAttendance(actionId)` | actionId | `Array<Attendance>` | — | `invalidRequest` | `OrganizerActionDetailsView.vue`, `OrganizerParticipantsView.vue` | `GET /api/v1/actions/{id}/attendance` |
| `getUserAttendance(userId)` | userId | `Array<Attendance>` | — | `invalidRequest` | `attendance.store.js` (`MyActionsView.vue` via `getByParticipationId`) | `GET /api/v1/attendance/me` |
| `getAttendanceByParticipation(participationId)` | id | `Attendance` \| `null` | — | `invalidRequest` | (internal / store) | `GET /api/v1/participations/{id}/attendance` |

## Reports & moderation — `features/admin/services/reports.service.js`, `actionModeration.service.js`

| Method | Params | Returns | Success | Error codes | Consumers | Recommended HTTP |
|---|---|---|---|---|---|---|
| `createReport(reporterUserId, actionId, reason, description)` | — | new `Report` | reason valid → action exists → not own action → no duplicate **open** report from this reporter on this action | `invalidRequest`, `notFound`, `cannotReportOwnAction`, `duplicateOpenReport` | `ReportActionCard.vue` (direct, volunteer-facing) | `POST /api/v1/actions/{id}/reports` |
| `getReports()` | — | `Array<Report>`, newest-first | — | — | `adminReports.store.js` | `GET /api/v1/admin/reports` |
| `getReportById(reportId)` | id | `Report` \| `null` | — | — | `AdminReportsView.vue` (enrichment) | `GET /api/v1/admin/reports/{id}` |
| `updateReportStatus(adminUserId, reportId, nextStatus, note)` | — | updated `Report` | `canTransitionReport` gate; note only persisted when transitioning to `resolved`/`dismissed` (not cleared on reopen) | `invalidTransition` | `adminReports.store.js` | `POST /api/v1/admin/reports/{id}/status` |
| `getModeratedActions()` / `getModeratedActionById(id)` | — | decorated `Action` (+ moderation + org info) | — | — | `adminActions.store.js` | `GET /api/v1/admin/actions`, `GET /api/v1/admin/actions/{id}` |
| `approveAction(adminUserId, actionId)` | — | updated moderation record | `canTransitionModeration` gate + `logActivity(ACTION_APPROVED)` | `invalidTransition` | `adminActions.store.js` | `POST /api/v1/admin/actions/{id}/approve` |
| `rejectAction(adminUserId, actionId, reason)` | — | updated moderation record | requires reason | `reasonRequired`, `invalidTransition` | `adminActions.store.js` | `POST /api/v1/admin/actions/{id}/reject` |
| `hideAction(adminUserId, actionId)` | — | updated moderation record | | `invalidTransition` | `adminActions.store.js`, **`AdminReportsView.vue` (direct, store-bypassing second entry point)** | `POST /api/v1/admin/actions/{id}/hide` |
| `restoreAction(adminUserId, actionId)` | — | updated moderation record | | `invalidTransition` | `adminActions.store.js` | `POST /api/v1/admin/actions/{id}/restore` |
| `updateActionDetails(adminUserId, actionId, payload)` | — | updated `Action` | reuses organizer's `validatePayload`; capacity floor check; **does not log activity** | `capacityBelowConfirmed`, field codes | `adminActions.store.js` | `PATCH /api/v1/admin/actions/{id}` |
| `changeActionLifecycleStatus(adminUserId, actionId, status)` | — | updated `Action` | delegates to `changeOrganizerActionStatus` | same as organizer's status-change codes | `adminActions.store.js` | `POST /api/v1/admin/actions/{id}/lifecycle-status` |

## Admin activity — `features/admin/services/activityLog.service.js`

| Method | Params | Returns | Success | Error behavior | Consumers | Recommended HTTP |
|---|---|---|---|---|---|---|
| `getActivityLog({limit})` | optional limit | `Array<AdminActivityEntry>`, newest-`timestamp`-first | slices to `limit` if provided | never rejects | `AdminDashboardView.vue` (`limit: 8`), `AdminActivityView.vue` (no limit) | `GET /api/v1/admin/activity?limit=` |

**No write method exists on this service** — every `logActivity()` call is made
directly against `activityLog.storage.js` from five different service files (see
frontend-mock-inventory.md). A real backend should decide deliberately whether to keep
that scattered pattern (each service writes its own audit row) or centralize it (an
event/listener approach) — see `risks-and-open-decisions.md`.

---

## Loading-simulation summary

All services above funnel through `mockResponse`. Default delay is 400ms. Two
deliberate exceptions found: `auth.service.js`'s `logout()` and `getCurrentSession()`
use 150ms (comment: cheaper/faster since these run on every boot and every guarded
navigation, not just at login). No other service overrides the default delay.
