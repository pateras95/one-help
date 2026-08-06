# Business Rule Catalogue

Consolidated business rules currently enforced by the frontend, with exactly where each
is implemented (UI / store / service / storage / router guard) and what layer must
enforce it in a real backend. The router guard is a UX convenience only — see
`routes-and-authorization.md` and the explicit code comment in `router/authGuard.js`:
"This guard is a UX convenience... NOT real security... A real backend must
independently enforce the same rules."

---

## Authentication

| Rule | Where enforced today | Must become (backend) |
|---|---|---|
| Public self-registration always creates a `volunteer`; organizer registration is not offered | `auth.service.js::register()` hardcodes `role: ROLES.VOLUNTEER` | Controller-level: registration endpoint must never accept a client-supplied role |
| Organizer access is granted only after an approved organization application | `admin/services/organizations.service.js::approveOrganization` calls `setUserRoleOverride(ROLES.ORGANIZER)` — the *only* code path anywhere that grants the organizer role | Service/transaction-level: role grant must be an effect of the approval transaction, never a standalone role-edit endpoint |
| Suspended accounts cannot log in or keep a session alive | `auth.service.js::login()` and `::getCurrentSession()`, both checking `getUserStatus(user.id) === ACCOUNT_STATUS.SUSPENDED` (re-checked on every boot/navigation, not just at login) | Authentication filter / session-validation middleware, re-checked per request or per token-refresh, not just at issuance |
| Admin cannot suspend their own account | `admin/services/adminUsers.service.js::suspendUser`, `adminUserId === targetUserId` guard | Service-level guard, same check |
| An organizer already owns exactly one organization → `/become-organizer` is force-redirected away | `router/authGuard.js`, special-cased after the generic role/auth checks | UX-only; backend enforcement is via the one-to-one organization constraint itself (an organizer role holder cannot submit a second application because they already have one) |

## Organizations

| Rule | Where enforced today | Must become (backend) |
|---|---|---|
| One organizer owns exactly one organization; one organization has exactly one organizer (permanent rule) | Defense-in-depth at three layers: (1) `submitOrganizationApplication` blocks a second submission regardless of existing status (`alreadyHasOrganization`/`suspended`); (2) `organizationMembership.storage.js::createOwnerMembership` drops any other membership the same user held before inserting the new one; (3) dev-only `organizationIntegrity.js` repair pass dedupes membership rows on app boot (development only) | **Must be a database-level unique constraint** on `organizations.organizer_user_id`, not just application-level checks — see `risks-and-open-decisions.md` |
| Application approval flow: `pending → approved` grants org approval, creates the owner membership, and grants the `organizer` role, atomically from the frontend's perspective | `organizations.service.js::approveOrganization` → `applyTransition` → `createOwnerMembership` + `setUserRoleOverride` + `logActivity` | Must be one backend transaction — partial application today (e.g. role granted but membership not created) is possible only if `writeMemberships`/`setUserRoleOverride` throw independently, since they are two separate localStorage writes with no atomicity guarantee |
| Rejection requires a non-empty reason | `organizations.service.js::rejectOrganization`, `reasonRequired` error if blank/whitespace | Request validation |
| Resubmission after rejection preserves the previous rejection reason and clears the current one, moving status back to `pending` — bypasses the normal transition-table gate (`canTransitionOrganization`) entirely, writing `pending` directly | `organizationApplication.service.js::resubmitRejectedApplication` | Should still be modeled as an explicit `rejected → pending` transition in the backend's state machine, even though the mock takes a shortcut |
| Suspension preserves membership and does **not** touch the organizer's role override; restoration is the exact inverse | `organizations.service.js::suspendOrganization`/`restoreOrganization` via `setMembershipStatusForOrganization` | Same semantics — suspending an organization must not silently demote the organizer; that is a distinct, deliberate operation (see Cascade section) |
| Organizer self-demotion ("become a volunteer again") and admin-initiated removal both funnel through the exact same cascade function, differing only in who is logged as the initiator | `organizerDemotion.service.js::demoteOrganizerToVolunteer(userId, initiatedBy)` — activity is logged only when `initiatedBy !== userId` | One backend service method callable by either the resource owner or an admin, with authorization checked per-caller but business logic shared |
| Cascade deletion behavior on demotion | See "Cascade and Referential Integrity" section below | Must run inside a single database transaction |

## Actions

| Rule | Where enforced today | Must become (backend) |
|---|---|---|
| Ownership: only the owning organizer can view/edit/change-status/see-participants for their own actions | `organizerActions.service.js`, every method starts with a `findOwned`/ownership check → `notOwner` | Authorization check at the service/controller layer, keyed off the authenticated principal, never a client-supplied organizer id |
| Publishing is blocked while the owning organization is not approved | `checkOrganizationGate()`: `organizationSuspended` blocks *any* mutation; `organizationNotApproved` (pending/rejected/absent) blocks only the `published` target status — drafts can still be created/edited | Same gate, re-derived server-side from the organization's live status at request time, not cached |
| Lifecycle transitions are restricted to a fixed graph (`draft→published/cancelled`, `published→closed/cancelled`, `closed→published`, `cancelled` terminal) | `organizer/utils/organizerActionStatus.js::canTransition` | State-machine enforcement server-side, ideally as a single authoritative implementation shared between the organizer-initiated and admin-initiated code paths (already true in the mock — `admin`'s `changeActionLifecycleStatus` delegates to the organizer service) |
| Republishing a closed action is blocked if its date is already in the past | `organizerActions.service.js::changeOrganizerActionStatus`, dynamic check alongside the static transition table | Same dynamic check, computed server-side using the server's clock, not the client's |
| Capacity can never be lowered below the current confirmed-participant count | `organizerActions.service.js::updateOrganizerAction`, `admin/services/actionModeration.service.js::updateActionDetails` (both call `getLocalConfirmedCount`) | A `CHECK` at the application layer (or a DB constraint comparing against a live count) before accepting a capacity decrease |
| Publication requires: organizer lifecycle ∈ {published, closed} **and** admin moderation === approved **and** organization status === approved (all three ANDed) | `features/actions/utils/actionVisibility.js::isActionPubliclyVisible` — the single reusable policy function | Must become one authoritative query/view (e.g. a SQL view or a single service method) — **not duplicated**; the mock already has one duplication of this exact policy (`AdminDashboardView.vue`, flagged in risks doc) that must not be repeated in the backend |
| Public visibility: a non-visible action (draft/cancelled/unapproved/wrong-org-status) reads as "not found," not "forbidden," to an anonymous or non-owning caller | `actions.service.js::getActionById` returns `null` rather than rejecting | A real API should likewise return 404 rather than 403 for actions the caller has no ownership/admin relationship to, to avoid leaking existence |

## Participation

| Rule | Where enforced today | Must become (backend) |
|---|---|---|
| Volunteer-only join | **Not enforced in the service at all** — `participation.service.js::joinAction` has no role check. Enforcement is entirely UI-level, in `ParticipationPanel.vue`'s `isNonVolunteer` computed hiding the join CTA for organizers/admins | **Must be added as a real server-side authorization check** — this is a genuine gap the mock leaves open (a direct service call bypassing the UI is not blocked today); see risks-and-open-decisions.md |
| Duplicate-join prevention | `participation.service.js::joinAction`, `findConfirmed()` blocks only if a **currently-confirmed** record exists; a prior cancelled record does not block rejoining, and rejoining creates a brand-new record (history preserved) | Unique-ish constraint scoped to `(user_id, action_id)` where `status = 'confirmed'` — a partial/filtered unique index, not a blanket unique constraint on `(user_id, action_id)` |
| Capacity enforcement at join time | `joinAction`, checked against the **overlaid** count (`action.registeredCount + getLocalConfirmedCount(actionId)`), not just the base fixture figure | Must be computed from a live count query at write time inside the same transaction as the insert, to avoid a race between the check and the insert |
| Cancellation is a soft-delete (`status → cancelled`, record retained forever, `cancelledAt` stamped) | `cancelParticipation()` | Same semantics — do not hard-delete participation rows; they are needed for attendance history and reporting |
| Closed/full/cancelled action handling | **Ambiguity flagged**: `joinAction`'s only "closed" check is `isPastDate(action.date)` — it does **not** check `action.organizerStatus === 'closed'`. A `closed`-but-future-dated action could theoretically still be joined via a direct service call, even though the UI (`ParticipationPanel.vue`) separately blocks it via `isOrganizerClosed`. Also: `action.status === 'full'` is derived from the (overlaid) `registeredCount >= capacity` comparison at read time, not stored | Backend must decide and explicitly enforce whether `closed` organizer status should also block new joins at the write layer (recommended: yes) — currently an open decision, see risks-and-open-decisions.md |

## Attendance and QR

| Rule | Where enforced today | Must become (backend) |
|---|---|---|
| Confirmed-participant requirement before check-in | `attendance.service.js::performCheckIn` (shared by both QR and manual paths): `participation.status !== PARTICIPATION_STATUS.CONFIRMED` → `notConfirmed` | Same check, server-side, as part of the check-in transaction |
| Organizer ownership requirement | `checkInManually`/`checkOut`/`generateCheckInSession`/`getActiveCheckInSession`: `action.organizerId !== organizerId` → `notOwner` | Authorization check keyed off the authenticated principal |
| QR anti-tamper: a token whose embedded `organizerId` doesn't match the action's real owner is treated as invalid, identically to any other malformed/expired token | `checkInByQr`, explicit doc comment: "this is what prevents a forged token from bypassing organizer ownership" | Must be preserved — but see risks doc: the mock token is documented as "NOT cryptographically signed," a real backend must use a signed (HMAC/JWT) token so this check is actually trustworthy rather than just internally consistent |
| Duplicate check-in prevention | `performCheckIn`, `findAttendanceByParticipation(participation.id)` — one attendance record per participation, ever | A unique constraint on `attendance.participation_id` |
| Expiry handling | `qrToken.js::isTokenExpired`, TTL = 10 minutes (`QR_TOKEN_TTL_MINUTES`); a new session generation always supersedes the previous one (`upsertQrSession`) | Same TTL semantics; consider a cache/TTL store rather than a durable table row, see risks doc |
| Check-out rules | `checkOut()`: only a currently `CHECKED_IN` record owned by the requesting organizer can be checked out; `checkedIn → checkedOut` is terminal (no re-entry supported) | Same state machine |
| No personal information inside QR | Confirmed by direct inspection of `createQrTokenPayload` — payload is `{tokenId, actionId, organizerId, issuedAt, expiresAt, nonce}`; the scanning volunteer's `userId` is supplied separately, out of band, at check-in time, never embedded in the token | Preserve this property explicitly in backend token design — do not add participant PII to the token payload for convenience |
| Check-in time window (30 min before start, 180 min after) | `checkInWindow.js::isWithinCheckInWindow` — **explicitly informational only**, drives a UI notice (`showWindowNotice`), never blocks the service call. The service's only time-adjacent gate is `organizerStatus === PUBLISHED` | Open decision: should the backend make this window a hard gate? Not enforced today; flagged in risks-and-open-decisions.md |

## Reports

| Rule | Where enforced today | Must become (backend) |
|---|---|---|
| Duplicate open-report prevention | `reports.service.js::createReport`, scoped to `(reporterUserId, actionId, status === 'open')` only — a report already `investigating` from the same reporter does **not** block a new submission (ambiguous, flagged) | Decide explicitly whether `investigating` should also count as blocking; enforce via a partial unique index or application check |
| Own-action reporting restriction | `createReport`: `action.organizerId === reporterUserId` → `cannotReportOwnAction` | Same check, server-side |
| Moderation workflow (report status transitions) | `reportStatus.js::canTransitionReport` — fully bidirectional except `resolved`/`dismissed` can only route back through `investigating`, never directly to each other or to `open` | Same state machine server-side |
| Resolution note handling | `updateReportStatus`: `resolutionNote` set only when transitioning to `resolved`/`dismissed`; **not cleared** when later reopened to `investigating` — stale note persists | Decide explicitly whether to clear `resolutionNote` on reopen; currently retained, flagged as possibly unintended in risks-and-open-decisions.md |

## Admin restrictions

| Rule | Where enforced today | Must become (backend) |
|---|---|---|
| Admin cannot suspend self | `adminUsers.service.js::suspendUser` | Service-level guard |
| Admin content edits to actions do not require re-approval / do not reset moderation status | `actionModeration.service.js::updateActionDetails` leaves the moderation record untouched | Decide explicitly whether admin edits should be exempt from re-review (currently yes, implicitly, since only organizer-authored edits interact with moderation status transitions at all — moderation status changes only via the dedicated approve/reject/hide/restore endpoints) |
| Not every admin mutation is audit-logged | Confirmed gaps: `updateActionDetails`, `updateUserProfile`, `createReport` do not call `logActivity` | Decide explicitly which admin/user actions must be audited before backend design (see risks-and-open-decisions.md) |

---

## Cascade and Referential Integrity Map

### Organizer demotion → `demoteOrganizerToVolunteer(userId, initiatedBy)`

**This is the one fully-specified, centrally-implemented destructive cascade in the
codebase** (`features/organizerApplication/services/organizerDemotion.service.js`),
used identically by organizer self-service ("become a volunteer again",
`OrganizerOrganizationView.vue`) and admin-initiated removal
(`AdminOrganizationsView.vue`).

**Exact current implementation order** (quoted from the service):

```js
const actionIds = getMergedActions()
  .filter((action) => action.organizerId === userId)
  .map((action) => action.id)

deleteParticipationsByActionIds(actionIds)
deleteAttendanceByActionIds(actionIds)
deleteQrSessionsByActionIds(actionIds)
deleteReportsByActionIds(actionIds)
deleteModerationRecordsByActionIds(actionIds)
deleteActionsByIds(actionIds)

markOrganizationDeleted(organization.id)
deleteMembershipByOrganizationId(organization.id)
setUserRoleOverride(userId, ROLES.VOLUNTEER, initiatedBy)
```

| Step | Records removed | Records retained | Records updated | Storage module touched |
|---|---|---|---|---|
| 1 | All `Participation` rows for the organizer's actions | — | — | `participations.storage.js` (direct cross-feature bypass, not via `participation.service.js`) |
| 2 | All `Attendance` rows for those actions | — | — | `attendance.storage.js` |
| 3 | All `QrSession` rows for those actions | — | — | `qrSession.storage.js` |
| 4 | All `Report` rows for those actions | — | — | `reports.storage.js` |
| 5 | All `ActionModeration` records for those actions | — | — | `actionModeration.storage.js` |
| 6 | The `Action` rows themselves | — | — | `organizerActions.storage.js` (tombstoned into `deletedIds` + overrides stripped) |
| 7 | — | — | `Organization` tombstoned (`markOrganizationDeleted`) | `organizations.storage.js` |
| 8 | The `Membership` row for that organization | — | — | `organizationMembership.storage.js` |
| 9 | — | **User account preserved** | `role → volunteer` | `userRole.storage.js` |

**What is explicitly preserved**: the user account itself, its `firstName`/
`lastName`/`email`, its `createdAt`, and any participations/attendance/reports the
*user* made as a volunteer in *other organizers'* actions (only records scoped to this
organizer's own action ids are touched).

**Activity logging**: only when `initiatedBy !== userId` (admin-initiated) — logs
`ACTIVITY_ACTION_TYPE.ORGANIZER_DEMOTED`, `targetType: USER`, `targetId: userId`,
metadata `{name: organizationName.en, actionsRemoved: actionIds.length}`.

**Orphan risk today**: none observed within this single function — every delete is
scoped consistently by the same `actionIds`/`organization.id` computed once at the top.
The risk is **atomicity**, not ordering: this runs as 9 sequential, independently-
failing localStorage writes with no rollback. If, say, step 4 (`deleteReportsByActionIds`)
threw, steps 1–3 would already be persisted and steps 5–9 would never run, leaving
actions/organization/membership/role all still present while participations/attendance/
QR-sessions for those same actions are gone — a real orphan state. **This must become a
single database transaction** (`@Transactional` or equivalent) in the backend, with all
nine effects (six deletes, one tombstone/delete, one membership delete, one role update)
committed or rolled back together.

**Recommended `ON DELETE` behavior** for the eventual schema: `ON DELETE CASCADE` from
`organizations` → `actions` → {`participations`, `attendance`, `reports`,
`action_moderation`} would let the database perform this cascade automatically once the
organization row is deleted, rather than the application issuing nine separate
statements — worth evaluating during schema design, though the `users.role` revert
still needs an explicit application-level step (it is not a delete).

### Organization removal (as a consequence of demotion, not a standalone operation)

There is no separate "delete an organization while keeping its organizer" operation in
the frontend — an organization is only ever removed as part of the demotion cascade
above. `markOrganizationDeleted` is a tombstone (adds the id to a `deletedIds` list and
strips any stored override), not a hard delete of the base fixture — mock-only
mechanics that disappear once organizations live in a real table with real deletes.

### Action cancellation / hiding / rejection (non-cascading)

| Operation | Effect | Cascades? |
|---|---|---|
| Organizer cancels an action (`organizerStatus → cancelled`) | Status flip only | **No** — existing participations/attendance/reports for that action are left untouched; there is no auto-cancellation of participations when an action is cancelled |
| Admin hides an action (`moderationStatus → hidden`) | Status flip only, action becomes non-public | **No** — same, no cascade into participation/attendance |
| Admin rejects an action (`moderationStatus → rejected`, terminal) | Status flip only | **No** cascade |

**Orphan risk here**: a cancelled/hidden/rejected action can still have confirmed
participations and even attendance records pointing at it, with no code path that
reconciles them (e.g. no automatic cancellation-notice or refund-equivalent flow — none
is expected, since there is no payment feature, but there is also no
notification/cleanup of the volunteer's now-moot participation). This is flagged as a
"Must decide during architecture" item in risks-and-open-decisions.md, not a bug to fix
during this documentation phase.

### User suspension (deliberately non-cascading)

`adminUsers.service.js::suspendUser` calls **only** `setUserStatus(SUSPENDED)` +
`logActivity`. Confirmed by direct code inspection: no cascade into the user's
participations, attendance, or (if they are an organizer) their organization/actions.
The only effect anywhere else in the codebase is `auth.service.js` blocking future
login/session-restore for that user. This is architecturally distinct from organizer
demotion (which does cascade) — the two must not be conflated when designing backend
endpoints; suspension is a pure account-status flag, demotion is a full data-removal
operation.

### Organization suspension (deliberately non-cascading, membership preserved)

`suspendOrganization`/`restoreOrganization` only ever touch `Organization.status` and
`Membership.status` (via `setMembershipStatusForOrganization`) — the organizer's role
override is explicitly left untouched, and no actions/participations/attendance are
modified. A suspended organization's existing published actions simply stop being
publicly visible (via the `isActionPubliclyVisible` organization-status gate) without
their own `organizerStatus` changing — i.e. an action can be `published` at the
organizer level while invisible at the public level purely because its parent
organization is suspended. This "visible at one layer, hidden at another" interaction is
intentional per the gate design but worth calling out explicitly for backend query
design (a public actions query must always join through live organization status, never
cache it).

---

## Database uniqueness constraints implied by the above (for schema design, not decided here)

- `organizations.organizer_user_id` — unique (the permanent 1:1 rule).
- `attendance.participation_id` — unique (one attendance record per participation ever).
- `action_moderation.action_id` — unique or 1:1-merge into `actions` (never more than
  one moderation record per action observed).
- `participations (user_id, action_id) WHERE status = 'confirmed'` — partial/filtered
  unique index (a user may have multiple *cancelled* rows for the same action, but only
  one *confirmed* one at a time).
- `users.email` — unique, case-insensitive (already checked application-side at
  register and admin-edit time).
