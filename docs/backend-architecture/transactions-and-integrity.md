# Transactions and Integrity

Every operation below runs inside a single Spring `@Transactional` boundary. **Isolation
level note (ADR-17)**: this design was originally reasoned about under `READ
COMMITTED` isolation, PostgreSQL's default. MySQL's InnoDB storage engine defaults to
`REPEATABLE READ`, not `READ COMMITTED` — this is re-verified here rather than
silently inherited: every race this document prevents is prevented by an explicit
`SELECT ... FOR UPDATE` row lock (or a database-level `UNIQUE` constraint), not by the
isolation level itself, and InnoDB's `REPEATABLE READ` only ever adds *more* locking
(next-key/gap locks alongside the row lock) than `READ COMMITTED` would, never less —
so every guarantee described below holds at InnoDB's default isolation level
unchanged, with no explicit `SET TRANSACTION ISOLATION LEVEL` override required
anywhere in this design. This document is the concrete mechanism behind
`architecture-decisions.md`'s ADR-5, ADR-10, ADR-15, ADR-17, and the cascade rules in
`database-schema.md`.

---

## Organizer application approval

**Method**: `AdminOrganizationService.approve(adminUserId, organizationId)`.

- **Rows read**: `organizations` (by id, locked — see below), `users` (organizer, to
  confirm current role is still `VOLUNTEER`).
- **Rows locked**: `SELECT ... FOR UPDATE` on the `organizations` row — prevents a
  concurrent double-approval (e.g. two admin browser tabs) from both succeeding and
  both writing `reviewedAt`/`reviewedBy`.
- **Rows created/updated**: `organizations.status → APPROVED` (+ `reviewedAt`,
  `reviewedBy`); `users.role → ORGANIZER` for the organizer; `refresh_tokens` for that
  user marked `revoked_at = now()` (ADR-3); `admin_activity_log` row
  (`ORGANIZATION_APPROVED`).
- **Race prevented**: double-approval (via the row lock above); the `organizations.
  organizer_user_id` unique constraint additionally guarantees that even if two
  *different* pending applications from the same user somehow existed (which
  `submitOrganizationApplication`'s own check already prevents — see below), only one
  could ever reach `APPROVED`.
- **Activity records written**: one `ORGANIZATION_APPROVED` entry.

## Organization application submission (duplicate-application race)

**Method**: `OrganizationApplicationService.submit(userId, payload)`.

- **Rows read**: `organizations` by `organizer_user_id` (existence check).
- **Race prevented**: two concurrent submissions from the same user racing past an
  application-level "does one already exist" check is prevented by the **database**
  constraint (`UNIQUE (organizer_user_id)`), not just the pre-check — the pre-check
  gives a clean `alreadyHasOrganization` error in the common case, but if a race
  somehow slips past it, the `INSERT` itself fails the unique constraint and the
  transaction rolls back, translated to the same error code (`error-contract.md`)
  rather than surfacing a raw constraint-violation message.

## Organizer demotion cascade

**Method**: `OrganizerDemotionService.demote(userId, initiatedBy)` — the single most
important transaction in the system (`docs/backend-discovery/risks-and-open-decisions.md`
item 2, "Critical before backend implementation").

- **Rows read**: `organizations` (by `organizer_user_id`, locked `FOR UPDATE`),
  `actions` (all rows for that organization, ids collected).
- **Rows locked**: the `organizations` row (`FOR UPDATE`) for the duration of the
  transaction — prevents a concurrent action-creation or organization-edit request
  from racing against the demotion (either the demotion commits first and the other
  request then correctly fails with "organization not found"/"not an organizer," or
  the other request commits first and is then correctly included in what the demotion
  removes; InnoDB's row lock (`SELECT ... FOR UPDATE`) plus the transaction boundary
  guarantees one of these two orderings, never a partial/inconsistent third outcome).
- **Rows deleted** (via the modules' own `*CascadeDeletionService` interfaces, called
  in this order — order matters only for readability/debugging here, not for
  correctness, since all of it commits or rolls back atomically as one transaction,
  unlike the mock's nine independent writes):
  1. `ParticipationCascadeDeletionService.deleteAllForActionIds(actionIds)` →
     deletes all `participations` rows for those actions.
  2. `AttendanceCascadeDeletionService.deleteAllForActionIds(actionIds)` → deletes all
     `attendance` rows for those actions (cascades automatically from the
     participation delete above too, via `ON DELETE CASCADE` — the explicit call is
     kept for clarity/testability and to also delete any `qr_check_in_tokens` rows,
     which do **not** reference `participations`).
  3. `ReportCascadeDeletionService.deleteAllForActionIds(actionIds)` → deletes all
     `action_reports` rows for those actions (see § policy note below — chosen:
     delete, not archive, matching the mock exactly).
  4. `ActionModerationLookupService`'s own cascade (via the `ON DELETE CASCADE` FK from
     `action_moderation`/`action_moderation_history` to `actions` — no explicit service
     call needed, the database cascade alone is correct here since moderation history
     has no meaning independent of its action).
  5. `ActionCascadeDeletionService.deleteAllForOrganization(organizationId)` → deletes
     the `actions` rows themselves (which, via `ON DELETE CASCADE` FKs, would also
     clean up any of the above not already explicitly handled — the explicit calls
     above are kept anyway so each module's own business logic, e.g. any
     module-specific pre-deletion validation, runs rather than relying purely on a
     silent database cascade for a business-significant operation).
  6. `organizations` row itself deleted (a real `DELETE`, not the mock's tombstone
     pattern — once a real database exists, there is no reason to keep a deleted
     organization's row around at all, and no other table's FK needs it to remain for
     historical reference, since `admin_activity_log.target_id` is a bare UUID with no
     FK, per `database-schema.md`).
- **Rows updated**: `users.role → VOLUNTEER` for the demoted user; `refresh_tokens`
  revoked (ADR-3).
- **Rows preserved**: the `users` row itself (never deleted); any participations/
  attendance/reports the demoted user made **as a volunteer** in *other* organizers'
  actions (untouched — the cascade is scoped entirely to `actionIds`, computed once at
  the top of the transaction from this organization's own actions only).
- **Activity records written**: exactly one `ORGANIZER_DEMOTED` entry, **only when
  `initiatedBy != userId`** (admin-initiated) — matching the mock's own conditional
  logging exactly (self-service demotion is not logged as an admin activity, since no
  admin acted).
- **Transaction boundary**: the entire operation above — six-plus deletes/cascades,
  one role update, one token-revocation update, one conditional activity-log insert —
  is one `@Transactional` method. Any failure at any step rolls back everything,
  closing the mock's own critical gap (`docs/backend-discovery/risks-and-open-decisions.md`
  item 2) where nine independent localStorage writes could partially fail and leave an
  orphaned state.

### Policy note: reports are deleted, not archived, on demotion

**Decision**: reports tied to the demoted organizer's actions are hard-deleted along
with everything else, matching the mock's `deleteReportsByActionIds` exactly. **Reason
for not archiving instead**: a report's entire purpose is "flag a concern about this
specific action to an admin" — once the action itself no longer exists (deleted in the
same transaction), there is nothing left to act on, and the admin activity log already
retains a durable record that a demotion happened (`ORGANIZER_DEMOTED`, with
`actionsRemoved` count in its `metadata`) even though the individual report contents
are gone. This is recorded here as a deliberate choice (Part 5 explicitly asks
"remove or archive reports related to those actions according to the selected
policy") rather than an unexamined carryover of mock behavior.

## Participation join (capacity race)

**Method**: `ParticipationService.join(userId, actionId)`.

- **Rows read**: `actions` (by id), `action_moderation`, `organizations` (eligibility
  check, ADR-10), `participations` (count of `CONFIRMED` rows for this action).
- **Rows locked**: `SELECT ... FOR UPDATE` on the `actions` row for the duration of
  the count-then-insert — this, not the count query alone, is what prevents the
  classic "read count, see capacity available, two concurrent requests both insert"
  race. An alternative considered and rejected: relying solely on re-checking the
  count inside the same transaction without a lock — rejected because without the
  lock, two concurrent transactions could both read the same pre-insert count before
  either commits, both conclude capacity is available, and both insert, exceeding
  capacity (true regardless of isolation level — `READ COMMITTED` or InnoDB's default
  `REPEATABLE READ`, see § header note above). The row lock on `actions` serializes
  join attempts for the *same action* (fine-grained — joins on other actions are
  unaffected).
- **Rows created**: one `participations` row, `status = CONFIRMED`.
- **Race prevented**: capacity overflow (row lock, above); duplicate-confirmed-join
  (the generated-column `UNIQUE` index `ux_participations_active_confirmation` on
  `active_confirmation_key`, ADR-15/ADR-17 — MySQL's replacement for what would have
  been a PostgreSQL partial index — is a second, independent line of defense — even if
  the row-lock discipline were ever accidentally bypassed by a future code path, the
  database constraint alone still prevents two `CONFIRMED` rows for the same
  user/action).
- **Activity records written**: none (participation is a volunteer-initiated action,
  not an admin-facing one; not part of the required logging scope in Part 1 item 11).

## Participation cancellation

**Method**: `ParticipationService.cancel(userId, actionId)`.

- **Rows read/locked**: the specific `participations` row (`SELECT ... FOR UPDATE`,
  guards against a concurrent duplicate-cancel double-processing, though the
  operation is naturally idempotent-safe since the second attempt would find no
  `CONFIRMED` row left to cancel).
- **Rows updated**: `status → CANCELLED`, `cancelled_at = now()`.
- **Race prevented**: double-cancellation is harmless even without the lock (the
  second attempt's `WHERE status = 'CONFIRMED'` predicate simply matches zero rows),
  but the lock is retained for clarity and to avoid a lost-update anomaly if a future
  change adds more fields to the cancel path.

## QR / manual check-in

**Method**: `AttendanceService.checkInByQr(...)` / `checkInManually(...)`.

- **Rows read**: `qr_check_in_tokens` (QR path only, to confirm the token's `jti`
  matches the currently-active one, ADR-6), `participations` (confirmed-status
  check), `actions`/`action_moderation`/`organizations` (eligibility/ownership),
  `attendance` (existing-row check).
- **Rows locked**: `SELECT ... FOR UPDATE` on the `participations` row being checked
  in — prevents two concurrent check-in attempts for the same participation (e.g. a
  double-tap on "scan" or a race between an organizer's manual check-in and the
  volunteer's own QR scan for the same person) from both passing the "no existing
  attendance row" check and both inserting.
- **Rows created**: one `attendance` row.
- **Race prevented**: duplicate check-in for the same participation — belt-and-braces
  with the `UNIQUE (participation_id)` constraint on `attendance` (ADR-15), which is
  the actual final guarantee even if the row lock were somehow bypassed.
- **Activity records written**: `ATTENDANCE_MANUAL_RECORDED` for the manual path only
  (matching the newly-expanded logging scope, Part 1 item 11 — the mock did not log
  this at all; QR check-in, being volunteer-self-service, is not logged as an admin
  activity, consistent with participation join above).

## Check-out

**Method**: `AttendanceService.checkOut(organizerId, attendanceId)`.

- **Rows read/locked**: the `attendance` row (`SELECT ... FOR UPDATE`).
- **Rows updated**: `status → CHECKED_OUT`, `checked_out_at = now()`.
- **Race prevented**: double-check-out (lock + the state check `status =
  'CHECKED_IN'` required before transitioning).
- **Activity records written**: `ATTENDANCE_MANUAL_RECORDED` (metadata distinguishes
  check-out from check-in).

## Organization suspension / restoration

**Method**: `AdminOrganizationService.suspend()`/`restore()`.

- **Rows read/locked**: `organizations` row (`FOR UPDATE`).
- **Rows updated**: `status` flip; **no** cascade into `actions`/`participations`/
  `attendance` (matches the mock's own deliberately non-cascading suspension
  behavior, `docs/backend-discovery/business-rules.md` § Cascade Map) — existing
  published actions simply stop appearing in `v_public_actions` immediately (since the
  view joins live organization status), without any row in `actions` itself changing.
- **Activity records written**: `ORGANIZATION_SUSPENDED`/`ORGANIZATION_RESTORED`.
- **No refresh-token revocation** on organization suspension (distinct from user
  suspension, ADR-3 — the *organizer's own account* is not suspended by this
  operation, only their organization's visibility).

## Action moderation transition (approve/reject/hide/restore)

**Method**: `AdminActionModerationService.transition(adminUserId, actionId,
nextStatus, reason)`.

- **Rows read/locked**: `action_moderation` row (`FOR UPDATE`).
- **Rows updated**: `status`, `reason`, `reviewedAt`, `reviewedBy`; **row inserted**
  into `action_moderation_history`.
- **Race prevented**: two concurrent moderation decisions on the same action (lock
  ensures the second one re-reads the just-updated status and is correctly evaluated
  against the transition table, rather than both proceeding from a stale "from"
  state).
- **Activity records written**: one of `ACTION_APPROVED`/`ACTION_REJECTED`/
  `ACTION_HIDDEN`/`ACTION_RESTORED`.

## Action lifecycle transition (organizer- or admin-initiated)

**Method**: `OrganizerActionService.changeStatus(...)` (also the single
implementation `AdminActionModerationService` delegates into for admin-initiated
lifecycle changes, matching the mock's own "there is only one place those rules live"
design, `docs/backend-discovery/service-contracts.md`).

- **Rows read/locked**: `actions` row (`FOR UPDATE`).
- **Rows updated**: `lifecycle_status`.
- **Race prevented**: concurrent conflicting transitions (e.g. cancel racing publish).
- **Activity records written**: `ACTION_LIFECYCLE_CHANGED` (both organizer- and
  admin-initiated changes log this — a new addition versus the mock, which logged
  this only for the admin-initiated path; see `error-contract.md`/domain-model doc for
  the full corrected logging scope).

## Report resolution (optionally paired with hiding the action)

**Method**: `AdminReportService.updateStatus(adminUserId, reportId, nextStatus,
note)`, optionally followed by `AdminActionModerationService.hide(...)` if the admin
also chooses to hide the reported action from the same review screen.

- **Rows read/locked**: `action_reports` row (`FOR UPDATE`).
- **Rows updated**: `status`, and (only on resolve/dismiss) `resolvedAt`/`resolvedBy`/
  `resolutionNote`.
- **Transaction boundary decision**: the report-status update and the optional
  action-hide are **two separate transactions**, not one combined transaction — a
  deliberate choice: hiding the action is a distinct, independently meaningful
  operation (with its own moderation-history row and its own activity-log entry) that
  an admin can perform on its own from the actions-moderation screen too; forcing them
  into one atomic unit would mean a failure to hide the action (e.g. an invalid
  transition, already hidden) would incorrectly roll back an otherwise-valid report
  resolution. Each is transactional on its own, and the calling controller/service
  orchestrates them as two sequential calls, surfacing either's failure independently.
- **Activity records written**: `REPORT_STATUS_CHANGED`, and separately
  `ACTION_HIDDEN` if that follow-up action is taken.

## Refresh-token rotation

Covered in detail in `security-and-authentication.md` § Token refresh; transactional
summary: read-and-lock the presented token row, conditionally revoke-the-whole-chain
(reuse detected) or rotate (normal case) — one transaction, one row inserted, one row
updated.

## User suspension plus token revocation

**Method**: `AdminUserService.suspend(adminUserId, targetUserId)`.

- **Rows read/locked**: `users` row (`FOR UPDATE`).
- **Rows updated**: `status → SUSPENDED`; **all** of that user's `refresh_tokens` rows
  with `revoked_at IS NULL` set to `revoked_at = now()` (ADR-3) — all in the same
  transaction, so a suspension can never commit without also invalidating existing
  refresh tokens.
- **Race prevented**: self-suspension (application-level id-equality check, not a
  race condition per se, but validated before the lock is even acquired).
- **Activity records written**: `USER_SUSPENDED`.

---

## Summary: locking strategy used throughout

**Pessimistic row locks (`SELECT ... FOR UPDATE`)** are used for every read-then-write
sequence where a concurrent request against the *same row* could otherwise both
observe a pre-write state and both proceed incorrectly (capacity checks, duplicate
check-in, duplicate moderation/report transitions, the demotion cascade's organization
row). This is preferred over optimistic locking (`@Version`) for these specific
sequences because the conflicting-write scenarios here are expected to be genuinely
concurrent in normal operation (two organizers' browser tabs, a volunteer double-
tapping "join") rather than rare — pessimistic locking avoids the retry-loop
complexity optimistic locking would otherwise require at each of these call sites.

**Optimistic locking (`version` column, JPA `@Version`)** is retained on every table
that has one (per `database-schema.md`) as a second line of defense against any
read-then-write sequence *not* explicitly listed above (e.g. two admins editing the
same organization's profile fields concurrently) — a `version` mismatch on `UPDATE`
raises `OptimisticLockException`, translated to a `409 Conflict` with a
`common.staleWrite` error code (`error-contract.md`), asking the caller to reload and
retry. This is a broad safety net, not a substitute for the targeted pessimistic locks
above, which exist specifically because a generic "please retry" response would be a
poor user experience for a capacity race a volunteer is actively waiting on.

**No atomic single-statement (`UPDATE ... WHERE count < capacity`) approach was
chosen** for the capacity check, even though it is a lighter-weight alternative to a
row lock for that one specific case — rejected because the join operation also needs
to run several *other* checks (eligibility, duplicate-confirmed) in the same logical
step, and a single UPDATE statement cannot express "insert a new related row only if
this condition on a different table holds" as cleanly as an application-level
transaction with an explicit lock; the row-lock approach is more readable and
maintainable for a check this involved, at a concurrency scale (a few hundred
participants joining one action) where the lock's brief hold time is not a performance
concern.
