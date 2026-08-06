# Risks, Mismatches, and Open Decisions

Every finding below is grounded in a specific file/function cited elsewhere in this
discovery (`frontend-mock-inventory.md`, `domain-models.md`, `service-contracts.md`,
`business-rules.md`, `routes-and-authorization.md`). Nothing here was fixed during this
phase — this is the punch list to work through before/during schema and API design.

Classification:
- **Critical before backend implementation** — a real security or data-integrity gap
  today; must be closed, not just carried forward, before going live.
- **Must decide during architecture** — the mock has ambiguous or inconsistent
  behavior; the backend needs one deliberate, documented answer.
- **Safe to defer** — a real but low-stakes inconsistency; fine to leave for later
  cleanup.
- **Frontend-only concern** — does not affect backend design at all.

---

## Critical before backend implementation

1. **Volunteer-only participation join is not enforced at the service layer at
   all.** `features/participation/services/participation.service.js::joinAction` has
   no role check whatsoever — the restriction exists only in
   `ParticipationPanel.vue`'s `isNonVolunteer` computed, which merely hides the join
   button for organizers/admins. A direct call to the mock service (or, today, direct
   browser console access to the store) bypasses it entirely. **The backend must add a
   real authorization check here that does not exist in the current frontend logic to
   copy from** — this is not a "port the existing check," it is a genuinely new check
   that must be designed. (`business-rules.md` § Participation.)

2. **The organizer-demotion cascade has no atomicity today and must become one
   database transaction.** `organizerDemotion.service.js::demoteOrganizerToVolunteer`
   runs nine sequential, independently-failing localStorage writes (delete
   participations → attendance → QR sessions → reports → moderation records → actions
   → tombstone organization → delete membership → revert role). A failure partway
   through leaves a genuine orphan state (e.g. attendance/QR data gone but the
   organization and actions still present). This must be `@Transactional` (or
   equivalent) in the backend, all-or-nothing. (`business-rules.md` § Cascade Map.)

3. **The QR check-in token is explicitly not cryptographically signed.**
   `features/attendance/utils/qrToken.js`'s own doc comment states this outright — the
   "anti-tamper" check (`organizerId` in the payload must match the action's real
   owner) is only internally consistent, not actually trustworthy against a
   sufficiently motivated forger, since anyone can base64url-decode and re-encode a
   payload with any `organizerId` they like. The backend must issue a real signed
   token (HMAC or JWT) preserving the same payload shape and TTL (10 minutes) and the
   same "no participant PII in the token" property. (`domain-models.md` § QR Token.)

4. **The one-organizer-one-organization rule is only enforced by application code
   today, not a database constraint.** Three independent, non-atomic layers currently
   approximate it (`submitOrganizationApplication`'s existing-application check,
   `createOwnerMembership`'s drop-other-memberships filter, and a **development-only**
   repair pass that only warns on unresolved mismatches, never auto-fixes). None of
   these prevent a genuine race (e.g. two concurrent approvals) in a real multi-request
   backend. **Must become a unique constraint on `organizations.organizer_user_id`**,
   not just service-level checks. (`business-rules.md` § Organizations;
   `domain-models.md` § Organization Ownership.)

5. **Authorization/session transport mechanism is undecided** (cookie session vs.
   `Authorization: Bearer` header) and blocks starting Phase 1 (Authentication) of the
   replacement order cleanly. The existing `httpClient` (`services/http.js`) has no
   interceptor either way today — it is unused entirely. This decision also determines
   whether CORS needs `credentials: true` and whether a Vite dev-server proxy is
   preferable to raw CORS. (`frontend-backend-replacement-map.md` § Local Integration.)

---

## Must decide during architecture

6. **`Membership` (organization ownership) may not need to exist as a distinct backend
   model.** `MEMBERSHIP_STATUS` is defined as `= ORGANIZATION_STATUS` (a literal alias,
   not an independent enum) and `MEMBERSHIP_ROLE` has exactly one possible value
   (`'owner'`), by explicit permanent design (no managers, ever). Everything the
   membership table currently provides — "who owns this organization" — is already
   fully captured by `organizations.organizer_user_id`. Decide explicitly whether to
   carry this table forward (e.g. for future audit/history value) or collapse it
   entirely into the one FK. (`domain-models.md` § Organization Ownership/Membership.)

7. **`Action.organization` (the bilingual display name stored directly on the action)
   can drift from the real `Organization.name`.** For the 13 seed fixture actions these
   agree by construction; for organizer-created actions, `organization.el`/`.en` are
   both set to a plain string typed at action-creation time, never re-derived from the
   organization's actual name — if the organizer later edits their organization
   profile, existing actions keep the stale name. Decide whether the backend derives
   this field live via a join (recommended) or accepts the same denormalized/stale-able
   copy. (`domain-models.md` § Action; § Cross-cutting mismatches.)

8. **`registeredCount` on `Action` is a stored, independently-incrementable value in
   the mock, overlaid client-side with a live-computed count from
   `participationCount.js`.** The seed fixture's `registeredCount` values are **not
   backed by real `Participation` rows** — they are just seeded numbers representing
   "phantom" pre-existing signups with no corresponding participation records at all.
   Decide whether the backend (a) computes this value live from a `COUNT(*)` over
   confirmed participations (recommended — removes an entire class of
   overlay/reactivity-forcing frontend code such as the `countVersion` counter in
   `participation.store.js`), or (b) keeps a denormalized counter column updated
   transactionally alongside each join/cancel. If choosing (a), the seed data must
   either drop the phantom counts or generate matching synthetic participation rows so
   the numbers stay consistent after migration. (`domain-models.md` § Action;
   `frontend-mock-inventory.md` § localStorage inventory.)

9. **QR session storage is a poor long-term fit for a relational table.**
   `qrSession.storage.js` holds exactly one row per action, always fully superseded on
   regeneration, with a 10-minute TTL. A cache (Redis, or equivalent short-TTL store)
   or a purely stateless signed token (no server-side row at all) is architecturally a
   better match than a durable `qr_sessions` table. Decide before schema design.
   (`domain-models.md` § QR Token / QR Session; `frontend-backend-replacement-map.md`.)

10. **Action moderation records are lazily synthesized, not eagerly created.**
    `getModerationRecord(actionId)` invents a default (`approved` for the 13 original
    seed ids, `pendingReview` for anything else) when no record exists yet — there is
    no code path that inserts a moderation row at action-creation time for organizer-
    created actions. Decide whether the backend creates an explicit `action_moderation`
    row (or a `moderation_status` column with a `DEFAULT 'pending_review'`) at action
    creation, versus continuing a lazy-default pattern in application code.
    (`domain-models.md` § Action Moderation; `frontend-backend-replacement-map.md` §
    implementation order caveat.)

11. **Participation's "closed action" gate does not check the organizer's lifecycle
    status.** `joinAction` only checks `isPastDate(action.date)`; it does **not** check
    `action.organizerStatus === 'closed'`. Today this gap is papered over by the UI
    (`ParticipationPanel.vue`'s `isOrganizerClosed` branch hides the join CTA), but a
    direct API call for a `closed`-but-future-dated action would not be rejected by the
    service itself. Decide explicitly whether the backend's join endpoint should also
    reject `closed` actions (recommended) before porting this logic forward as-is.
    (`business-rules.md` § Participation.)

12. **The QR check-in time window (30 min before start, 180 min after) is
    UI-informational only, never a hard gate.** `checkInWindow.js`'s own doc comment
    confirms this explicitly. Decide whether the real backend should enforce it as a
    hard rule at check-in time, given a real system may have stronger incentives
    against arbitrarily-early/late check-ins than a demo. (`business-rules.md` §
    Attendance and QR.)

13. **Admin activity logging is scattered across five separate service files with no
    enforced write-path, and several state-changing admin operations are not logged at
    all** (confirmed: action content edits, user profile edits, report creation).
    Decide (a) whether every admin mutation should be logged going forward (recommend
    yes, for a real audit trail) and (b) how to centralize the write path (an
    application-level audit service, an event listener, or a DB trigger) rather than
    reproducing today's "any service can call `logActivity` directly" pattern.
    (`frontend-mock-inventory.md` § Scattered activity logging.)

14. **Duplicate-open-report prevention only checks `status === 'open'`, not
    `'investigating'`.** A report already under active investigation from the same
    reporter on the same action does not block a second submission. Decide whether
    this is intentional (allow follow-up reports while investigating) or an oversight
    to fix in the backend's validation. (`business-rules.md` § Reports.)

15. **`resolutionNote` is not cleared when a resolved/dismissed report is reopened to
    `investigating`.** The stale note persists even though the report is no longer in a
    resolved state. Decide whether the backend should clear it on reopen or preserve it
    as historical context (in which case, consider modeling report resolution notes as
    an append-only history rather than a single mutable field).
    (`business-rules.md` § Reports; `domain-models.md` § Action Report.)

16. **`isActionPubliclyVisible` is duplicated, not reused, inside
    `AdminDashboardView.vue`**, which recomputes the identical three-gate policy inline
    with a comment acknowledging the duplication "to avoid redundant storage lookups."
    In the backend, this must become **one** authoritative query/view — decide the
    mechanism (a SQL view, a single service method, a materialized count) before
    building the admin dashboard's summary endpoint, so this duplication is not carried
    into the API layer. (`frontend-mock-inventory.md` § Public Action Visibility;
    `business-rules.md` § Actions.)

17. **The organizer ↔ admin ↔ actions feature triangle is genuinely entangled at the
    service/util layer** (organizer's service needs admin's organization-status util
    to gate publishing; admin's service/views need organizer's action service and
    actions' visibility util to manage/count actions; actions' service needs both
    organizer and admin). No literal circular ES-module import was found, but none of
    these three "features" are independently extractable in the current code
    structure. This is not necessarily wrong for a monolithic backend (a single
    `actions` domain module naturally owns all three concerns), but it means the
    frontend's feature-folder boundaries should **not** be assumed to map 1:1 onto
    backend bounded contexts. Decide the backend's actual module boundaries
    independently, informed by this coupling rather than mirroring it.
    (`frontend-mock-inventory.md` § Domain Dependency Map — Actions;
    `domain-models.md` cross-cutting notes.)

18. **`auth` and `admin` are mutually dependent at the mock-storage layer**: `auth`'s
    login/session logic reads admin's `userStatus.storage.js`/`accountStatus.js`
    directly (to enforce suspension), while `admin`'s user-management service reads/
    writes auth's `auth.service.js`/`userProfileOverride.storage.js` directly. "Who
    owns account status" is genuinely split between the two features today. Decide
    explicitly in the backend: recommend a single `User` aggregate/table owning
    `role`, `status`, and profile fields together, with "admin user management" as a
    set of operations on that one aggregate rather than a separate feature with its own
    storage. (`frontend-mock-inventory.md` § Authentication.)

19. **API/schema versioning strategy is undecided.** None of the 16 localStorage keys
    carry any version field; malformed records are simply dropped by the repair-on-read
    validators rather than migrated. This "silently drop what doesn't parse" pattern is
    acceptable for a browser mock but must not carry into a real backend's approach to
    schema evolution — decide a real migration strategy (Flyway versioned migrations)
    before the first schema is written. (`frontend-mock-inventory.md` § localStorage
    inventory — common storage-module behavior.)

20. **Cross-tab / real-time synchronization is explicitly not attempted today.**
    `auth.store.js::refreshCurrentUser()`'s own doc comment states it is "NOT live
    cross-tab sync" — e.g. an admin approving an organizer application in one tab does
    not automatically update a volunteer's session open in another tab; it only
    resolves on the next explicit `refreshCurrentUser()` call or full session
    re-validation. Decide whether the real product needs live updates (WebSocket/SSE/
    polling) for role changes, organization status changes, etc., or whether the
    current "resolves eventually, not live" behavior is acceptable to preserve.
    (`frontend-mock-inventory.md` § Authentication; agent research on `auth.store.js`.)

21. **Destructive-operation non-cascades leave dangling references intentionally
    tolerated by the UI today.** Action cancellation, hiding, and rejection do **not**
    cascade into existing participations/attendance for that action — a volunteer can
    have a confirmed participation (and even a completed attendance record) for an
    action that is now cancelled/hidden/rejected, with no reconciliation step anywhere.
    Separately, `MyActionsView.vue` has a **confirmed UI-level bug/asymmetry**: a
    confirmed participation whose action can no longer be resolved (e.g. deleted) is
    always classified as "Upcoming" (`!entry.action` short-circuits true in that
    filter) and can never move to "Past," even after the fact — it is permanently
    stuck showing `MyActionCard`'s "unknown action" fallback in the wrong tab. Decide,
    for the backend: whether cancelling/hiding/rejecting an action should notify or
    auto-cancel affected participations (recommended for cancellation, at minimum), and
    fix the classification asymmetry when the equivalent view logic is rebuilt against
    real data. (`frontend-mock-inventory.md` § Domain Dependency Map — Participations;
    agent research on `MyActionsView.vue`.)

---

## Safe to defer

22. **Mixed id-generation schemes.** Seed fixtures use human-readable sequential ids
    (`'act-001'`, `'org-001'`, `'user-volunteer-001'`); anything created at runtime
    uses `crypto.randomUUID()`. Both schemes disappear once a real database assigns
    primary keys, but worth noting so seed/demo data migration doesn't assume one
    format. (`domain-models.md`, multiple sections.)

23. **Duplicated validation constants/regex across client and "service" layers.**
    `EMAIL_PATTERN` (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) is independently redeclared in at
    least `auth`, `adminUsers.service.js`, `AdminUsersView.vue`, and
    `OrganizationApplicationForm.vue`; `organizationValidation.js` and
    `OrganizationApplicationForm.vue` also independently redeclare the same
    `TEXT_MIN_LENGTH`/`TEXT_MAX_LENGTH`/website-regex constants rather than sharing
    them. Not a backend risk per se (the backend will have its own single validation
    layer, e.g. Bean Validation), but worth knowing so the frontend's client-side
    validation isn't assumed to be the single source of truth for validation rules
    during API/DTO design — it should be treated as a UX nicety mirroring, not
    defining, the backend's actual rules. (Agent research across auth/admin/
    organizerApplication.)

24. **`AdminReportsView.vue` bypasses the `adminActions` Pinia store** when hiding an
    action from the report-detail dialog (`handleHideAction` calls
    `actionModeration.service.js::hideAction` directly). Functionally consistent (same
    underlying service/transition rules), but means the `adminActions` store's local
    cache is not updated by this path — masked today only because each admin view
    re-fetches on mount. Not a data-integrity issue once a real backend is the source
    of truth (any view can always re-fetch fresh state), but worth knowing if
    optimistic-UI patterns are introduced later. (Agent research on
    `AdminReportsView.vue`.)

25. **`services/http.js`'s `httpClient` (a correctly configured Axios instance) is
    currently dead code** — confirmed unused by a full-tree grep. It becomes load-
    bearing on day one of real backend integration; no action needed now beyond being
    aware it already exists and is correctly configured (`VITE_API_BASE_URL`, 10s
    timeout). (`frontend-mock-inventory.md` § Shared / frontend-only.)

26. **Vite dev server URL is not explicitly pinned anywhere** (relies on Vite's
    default `http://localhost:5173`, no `vite.config.js` override found). Pin it
    explicitly when backend integration begins, so CORS/proxy configuration on the
    backend side has a stable target. (`frontend-backend-replacement-map.md` § Local
    Integration.)

27. **Category "accent" color doubles as a general theme-role token**
    (`constants/actionCategories.js` maps categories onto the app's five *semantic*
    Vuetify theme colors, e.g. `emergency → error`), which the app's own design-review
    document (`docs/proposition-analysis.md`) already flags as causing a visual
    collision between an "urgent" priority badge and an unrelated category chip. This
    is a pure visual-design concern, already tracked elsewhere, and has no bearing on
    backend data modeling — `categoryId` itself is a clean, stable enum regardless of
    which color it's rendered with. (Cross-referenced, not re-litigated here.)

---

## Frontend-only concerns (no backend action needed)

28. **`stores/locale.store.js` / `onehelp.locale`** — purely a UI language preference,
    never a backend concern.

29. **`stores/notifications.store.js`** — transient toast/snackbar state, never
    persisted, never a backend concern.

30. **The map feature (`features/map/**`)** — purely presentational/computational
    (distance calculation, external map deep-links, Leaflet rendering); reads action
    data exclusively from the `actions` Pinia store, never localStorage directly, and
    has no domain data of its own to migrate.

31. **`normalizeSearchText.js`'s diacritic-insensitive matching** — a frontend
    convenience for client-side filtering today. If the backend takes over search
    (recommended once actions are server-backed, for consistency across paginated
    results), it will need its own equivalent normalization/collation strategy — noted
    here for awareness, but the frontend utility itself requires no changes and is not
    "wrong" in any way.

---

## Fields that need database uniqueness constraints (recap, see `business-rules.md` for detail)

- `organizations.organizer_user_id` — unique.
- `attendance.participation_id` — unique.
- `action_moderation.action_id` — unique (or 1:1-merge into `actions`).
- `participations (user_id, action_id) WHERE status = 'confirmed'` — partial/filtered
  unique index.
- `users.email` — unique, case-insensitive.

## Frontend values that should become server-calculated (recap)

- `Action.registeredCount` (see item 8 above).
- `Action.status` (`open`/`full`/`closed`/`completed` — currently derived client-side
  in `actions.service.js::computeStatus` and re-derived again ad hoc in several
  components after the participation-count overlay is applied; should be one
  server-computed value, not recomputed in multiple places).
- `Action.organizationDetails` (currently resolved server-side already, in the mock
  sense — `actions.service.js` builds it from the admin organizations storage; this
  pattern is correct and should carry forward as a real join/DTO composition, not a
  stored field).
