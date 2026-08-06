# Frontend Mock Inventory

Complete inventory of every mock fixture, localStorage-backed storage module, service,
and Pinia store in `frontend/src`, plus the cross-domain dependency map. All paths are
relative to `frontend/src` unless stated otherwise.

---

## 1. localStorage key inventory

**16 distinct keys** are used. Every key was found by tracing every `STORAGE_KEY`/
`*_STORAGE_KEY` constant and its `window.localStorage.getItem/setItem/removeItem` call
sites; no other keys exist anywhere in the codebase.

| Key | Owning file | Feature | Source-of-truth or cache? | Shape |
|---|---|---|---|---|
| `onehelp.auth.session` | `features/auth/stores/auth.store.js` | auth | Session/cache (re-validated against mock DB on every read) | `{ userId: string, issuedAt: string(ISO) }` |
| `onehelp.auth.userRoleOverride` | `features/auth/mocks/userRole.storage.js` | auth | Source of truth for role changes (overlays in-memory `MOCK_USERS`) | `Array<{userId, role, updatedAt, updatedBy}>` |
| `onehelp.auth.userProfileOverride` | `features/auth/mocks/userProfileOverride.storage.js` | auth | Source of truth for admin-edited profile fields | `Array<{userId, firstName, lastName, email, updatedAt, updatedBy}>` |
| `onehelp.admin.organizations` | `features/admin/mocks/organizations.storage.js` | admin/organizations | Source of truth (overlay + newly created) | `Array<Organization>` (see domain-models.md) |
| `onehelp.admin.organizations.deletedIds` | `features/admin/mocks/organizations.storage.js` | admin/organizations | Tombstone list | `Array<string>` (organization ids) |
| `onehelp.organizerApplication.memberships` | `features/organizerApplication/mocks/organizationMembership.storage.js` | organizerApplication | Source of truth for owner↔organization linkage | `Array<{id, organizationId, userId, membershipRole:'owner', status, createdAt, approvedAt}>` |
| `onehelp.organizer.actions` | `features/organizer/mocks/organizerActions.storage.js` | organizer/actions | Source of truth (override + newly created actions) | `Array<Action>` (see domain-models.md) |
| `onehelp.organizer.actions.deletedIds` | `features/organizer/mocks/organizerActions.storage.js` | organizer/actions | Tombstone list | `Array<string>` (action ids) |
| `onehelp.participations` | `features/participation/mocks/participations.storage.js` | participation | Source of truth (soft-delete/append-only) | `Array<Participation>` |
| `onehelp.attendance` | `features/attendance/mocks/attendance.storage.js` | attendance | Source of truth | `Array<AttendanceRecord>` |
| `onehelp.attendance.qrSession` | `features/attendance/mocks/qrSession.storage.js` | attendance/QR | Session/cache (one active session per action) | `Array<QrSession>` |
| `onehelp.admin.actionModeration` | `features/admin/mocks/actionModeration.storage.js` | admin/moderation | Source of truth (overlay; default derived if absent) | `Array<{actionId, status, reason, reviewedAt, reviewedBy}>` |
| `onehelp.admin.userStatus` | `features/admin/mocks/userStatus.storage.js` | admin/users | Source of truth (defaults to `active` if absent) | `Array<{userId, status, updatedAt, updatedBy}>` |
| `onehelp.admin.reports` | `features/admin/mocks/reports.storage.js` | admin/reports | Source of truth | `Array<Report>` |
| `onehelp.admin.activityLog` | `features/admin/mocks/activityLog.storage.js` | admin/activity | Source of truth (append-only) | `Array<AdminActivityEntry>` |
| `onehelp.locale` | `constants/locales.js` (`LOCALE_STORAGE_KEY`), used by `stores/locale.store.js` | i18n (frontend-only) | Frontend-only preference | `string` (`'el'` \| `'en'`) |

No other feature uses in-memory-only fixtures for anything that needs persistence.
`features/actions/mocks/actions.mock.js` (the 13 seed actions) is a pure in-memory,
never-mutated fixture — organizer edits/creates are layered on top of it via
`organizerActions.storage.js`'s merge logic (`getMergedActions()`), never by mutating
the fixture itself. Likewise `features/admin/mocks/organizations.mock.js` (13 seed
organizations) is immutable in memory; overrides live only in
`onehelp.admin.organizations`.

### Common storage-module behavior (applies to every `*.storage.js` file above)

Every storage module follows the same pattern, confirmed identically across all of
them:
- **Repair-on-read**: `read*()` parses the JSON; if the top-level value is missing,
  unparsable, or not an array, it is treated as empty and rewritten as `[]`. If some
  individual records fail their local `isValidRecord()` shape check, those records are
  silently dropped and the cleaned array is written back.
- **Silent write failures**: `write*()` wraps `localStorage.setItem` in try/catch and
  swallows any error (e.g. quota exceeded, private-mode restrictions) — "persistence is
  a nice-to-have," per the participation storage module's own comment.
- **No schema versioning**: none of the 16 keys carry a version field. A future
  incompatible shape change would rely entirely on the repair-on-read validator to drop
  malformed records rather than migrate them.
- **Cross-references by id only, never embedded objects**: e.g.
  `organizationMembership.storage.js` explicitly documents that it stores only
  `organizationId`/`userId`, "not a duplicate source of truth for identity/organization
  data." The same discipline holds for `participations.storage.js` (`userId`/`actionId`
  only) and `attendance.storage.js` (`participationId`/`actionId`/`userId` only, "never
  any health information").

### Records that reference ids from another storage key (cross-key relationships)

- `onehelp.participations` records reference `userId` (→ auth mock users) and `actionId`
  (→ `onehelp.organizer.actions` / the actions fixture).
- `onehelp.attendance` records reference `participationId` (→ `onehelp.participations`),
  `actionId`, `userId`, and optionally `recordedByOrganizerId`.
- `onehelp.attendance.qrSession` references `actionId` and `organizerId`.
- `onehelp.admin.actionModeration` references `actionId`.
- `onehelp.admin.reports` references `actionId` and `reporterUserId`, plus optional
  `resolvedBy` (admin user id).
- `onehelp.admin.activityLog` references `adminUserId` and a polymorphic `targetId`
  (interpreted per `targetType`: user/organization/action/report).
- `onehelp.organizerApplication.memberships` references `organizationId` and `userId`.
- `onehelp.admin.organizations` references `organizerUserId`.
- `onehelp.auth.userRoleOverride` / `onehelp.auth.userProfileOverride` reference
  `userId`.

None of these are enforced as real foreign keys today — every "join" is a linear
`Array.find`/`filter` performed at read time in JavaScript. This is expanded on in
`risks-and-open-decisions.md`.

---

## 2. Mock fixtures and storage modules — full file inventory

### Auth (`features/auth/`)

| Path | Responsibility | Reads | Writes | Consumers |
|---|---|---|---|---|
| `mocks/users.mock.js` | Static fixture: 3 mock users (volunteer/organizer/administrator) + derived `DEMO_CREDENTIALS` for the login screen's dev helper. Passwords exist only here, never returned by the service. | — | — | `auth.service.js`, `LoginView.vue` (credentials only) |
| `mocks/userRole.storage.js` | Persisted overlay for `role`, since the in-memory `usersDb` resets on reload. | `onehelp.auth.userRoleOverride` | same | `auth.service.js`, `features/admin/services/organizations.service.js`, `features/organizerApplication/services/organizerDemotion.service.js` |
| `mocks/userProfileOverride.storage.js` | Persisted overlay for `firstName`/`lastName`/`email` edited by an admin. | `onehelp.auth.userProfileOverride` | same | `auth.service.js`, `features/admin/services/adminUsers.service.js` |

**Backend classification**: `users.mock.js` → becomes the seed/demo data for a `users`
table (passwords must be hashed, never shipped to the client). `userRole.storage.js` and
`userProfileOverride.storage.js` → both collapse into ordinary mutable columns
(`role`, `first_name`, `last_name`, `email`) on the same `users` table; the
"override" split is a mock-only artifact of `MOCK_USERS` being immutable in memory.

### Organizations & organizer application (`features/admin/`, `features/organizerApplication/`)

| Path | Responsibility | Reads | Writes | Consumers |
|---|---|---|---|---|
| `admin/mocks/organizations.mock.js` | Static fixture: 13 organizations covering every `ORGANIZATION_STATUS`. Immutable in memory. | — | — | `admin/mocks/organizations.storage.js` |
| `admin/mocks/organizations.storage.js` | Merge layer (fixture ⊕ overrides ⊕ new records − tombstones) + lookup helpers (`getOrganizationByOrganizerId`, `getOrganizationStatus` — fails closed to `null`, `isOrganizationNameTaken`). **Widest fan-out module in the codebase** — imported directly by `organizer`, `actions`, `admin`, and `organizerApplication` features. | `onehelp.admin.organizations`, `onehelp.admin.organizations.deletedIds` | same | `organizer/services/organizerActions.service.js`, `actions/utils/actionVisibility.js`, `actions/services/actions.service.js`, `admin/services/actionModeration.service.js`, `admin/services/organizations.service.js`, `organizerApplication/services/organizationApplication.service.js`, `organizerApplication/services/organizerDemotion.service.js`, `organizerApplication/utils/organizationValidation.js`, `organizerApplication/utils/organizationIntegrity.js` |
| `organizerApplication/mocks/organizationMembership.storage.js` | Owner↔organization linkage (id-only, no embedded objects). `createOwnerMembership()` enforces the 1:1 rule defense-in-depth by dropping any other membership the same user held before inserting the new one. | `onehelp.organizerApplication.memberships` | same | `admin/services/organizations.service.js`, `organizerApplication/services/organizationApplication.service.js`, `organizerApplication/services/organizerDemotion.service.js`, `organizerApplication/utils/organizationIntegrity.js` |

**Backend classification**: `organizations.mock.js`/`organizations.storage.js` → an
`organizations` table with a unique constraint on `organizer_user_id`.
`organizationMembership.storage.js` → in a real backend this whole concept likely
collapses into the same unique FK on `organizations.organizer_user_id` — a separate
membership table only makes sense if the product ever needs a status-of-the-relationship
distinct from the organization's own status, which today it does not (`MEMBERSHIP_STATUS
= ORGANIZATION_STATUS`, i.e. it is literally an alias). See
`risks-and-open-decisions.md`.

### Actions & organizer actions (`features/actions/`, `features/organizer/`)

| Path | Responsibility | Reads | Writes | Consumers |
|---|---|---|---|---|
| `actions/mocks/actions.mock.js` | Static fixture: 13 volunteering actions, deliberately covering every `ORGANIZER_ACTION_STATUS`. Dates generated relative to "now" via `relativeDateString(days)` at load time. Never mutated. | — | — | `organizer/mocks/organizerActions.storage.js` (via `getMergedActions`) |
| `organizer/mocks/organizerActions.storage.js` | Merge layer identical in shape to the organizations one: base fixture (shallow-merged with any per-id override) + brand-new organizer-created records (ids not in the base set) − tombstones. `upsertOrganizerAction`, `deleteActionsByIds` (cascade-only). | `onehelp.organizer.actions`, `onehelp.organizer.actions.deletedIds` | same | `actions/services/actions.service.js`, `attendance/services/attendance.service.js`, `organizer/services/organizerActions.service.js`, `admin/services/reports.service.js`, `admin/services/actionModeration.service.js`, `organizerApplication/services/organizerDemotion.service.js` |

**Backend classification**: both collapse into one `actions` table. The
base-fixture/override split disappears entirely once there is a real database — there is
no future need for a "merged" read path.

### Participation (`features/participation/`)

| Path | Responsibility | Reads | Writes | Consumers |
|---|---|---|---|---|
| `mocks/participations.storage.js` | Append-only records; `status` flips `confirmed → cancelled` in place, a new record is created on rejoin (history is preserved, not overwritten). `deleteParticipationsByActionIds` used only by the organizer-demotion cascade. | `onehelp.participations` | same | `participation.service.js`, `participationCount.js` (intra-feature); **`organizerApplication/services/organizerDemotion.service.js` imports `deleteParticipationsByActionIds` directly**, bypassing the service/store — a confirmed cross-feature direct-storage access, used only for the cascade delete. |

**Backend classification**: a `participations` table, FK to `users` and `actions`,
`status` enum column, `joined_at`/`cancelled_at` timestamps.

### Attendance & QR (`features/attendance/`)

| Path | Responsibility | Reads | Writes | Consumers |
|---|---|---|---|---|
| `mocks/attendance.storage.js` | Attendance record CRUD. `checkedInAt`/`checkInMethod`/core FKs are validated on read; `checkedOutAt`/`recordedByOrganizerId` are not (may be absent without invalidating a record). | `onehelp.attendance` | same | `attendance.service.js` (intra-feature); `organizerApplication/services/organizerDemotion.service.js` (`deleteAttendanceByActionIds`, cascade-only) |
| `mocks/qrSession.storage.js` | Exactly one active QR session per action — `upsertQrSession` always supersedes any prior session for that `actionId`. | `onehelp.attendance.qrSession` | same | `attendance.service.js` (intra-feature); `organizerApplication/services/organizerDemotion.service.js` (`deleteQrSessionsByActionIds`, cascade-only) |

**Backend classification**: `attendance` → an `attendance` table (FK to
`participations`, `actions`, `users`). `qrSession.storage.js` → this is the one storage
module that likely should **not** become a plain database table long-term — a real
backend would want a short-TTL cache (Redis or equivalent) or a signed/stateless token
scheme instead of a row per action, since its entire purpose is "one live token that
expires in ~10 minutes." Flagged in `risks-and-open-decisions.md`.

### Admin moderation, reports, activity, users (`features/admin/`)

| Path | Responsibility | Reads | Writes | Consumers |
|---|---|---|---|---|
| `mocks/actionModeration.storage.js` | Admin's moderation decision per action, independent of the organizer's own lifecycle status. Defaults to `approved` for the 13 original seed actions and `pendingReview` for anything created afterward (`getModerationRecord` synthesizes this default when no record exists). | `onehelp.admin.actionModeration` | same | `admin/services/actionModeration.service.js`; `actions/utils/actionVisibility.js` (read-only visibility gate — cross-feature); `organizerApplication/services/organizerDemotion.service.js` (`deleteModerationRecordsByActionIds`, cascade-only) |
| `mocks/reports.storage.js` | Volunteer-submitted action reports. | `onehelp.admin.reports` | same | `admin/services/reports.service.js`; `organizerApplication/services/organizerDemotion.service.js` (cascade-only) |
| `mocks/userStatus.storage.js` | Account suspension standing, independent of role. Defaults to `active` if no record exists. | `onehelp.admin.userStatus` | same | `admin/services/adminUsers.service.js` (write); **`auth/services/auth.service.js`** (`getUserStatus`, read-only — this is what makes suspension actually block login/session; a cross-feature read from `auth` into `admin`'s mock storage) |
| `mocks/activityLog.storage.js` | Append-only mocked admin audit trail. Explicitly not a legally compliant audit log; never stores passwords/tokens. **`logActivity()` is called directly by five different service files across two features** (see "Scattered activity logging" below), not through any single write-path abstraction. | `onehelp.admin.activityLog` | same | `admin/services/activityLog.service.js` (read-only façade — has no write function at all); direct `logActivity` callers: `admin/services/actionModeration.service.js`, `admin/services/adminUsers.service.js`, `admin/services/reports.service.js`, `admin/services/organizations.service.js`, `organizerApplication/services/organizerDemotion.service.js` |

**Backend classification**: `actionModeration.storage.js` → a `moderation_status`
column (+ `reason`/`reviewed_at`/`reviewed_by`) directly on the `actions` table, or a
1:1 `action_moderation` table — there is no case in the mock where an action has more
than one moderation record. `reports.storage.js` → a `reports` table. `userStatus.storage.js`
→ a `status` column directly on `users` (same collapsing argument as role/profile
overrides above). `activityLog.storage.js` → an `admin_activity_log` table; a real
backend should centralize the write path (e.g. an application-level audit service or a
DB trigger/event listener) rather than reproduce the scattered call-site pattern.

**Scattered activity logging — architecturally notable.** Because
`activityLog.service.js` is read-only, there is no enforced contract ensuring every
admin action gets logged consistently. Confirmed **not logged** today: admin content
edits to an action (`updateActionDetails`), admin edits to a user profile
(`updateUserProfile`), and report submission (`createReport`). This is carried into
`risks-and-open-decisions.md` as a design decision to make explicitly, not silently
carry forward.

### Shared / frontend-only (no localStorage)

| Path | Responsibility | Frontend-only forever? |
|---|---|---|
| `utils/mockResponse.js` | The single async-delay/success-or-failure wrapper every mock service call uses (`mockResponse(data, {delay=400, shouldFail, errorMessage})`, `setTimeout`-based). | Frontend-only (an Axios call replaces this pattern; no backend equivalent). |
| `utils/date.js` | `startOfDay`, `isPastDate`, `relativeDateString` (fixture-generation only). | Frontend-only utility; `isPastDate` logic must be duplicated server-side wherever "past-date" gating matters (see business-rules.md). |
| `utils/normalizeSearchText.js` | `normalizeSearchText`, `matchesSearchQuery` — diacritic-insensitive client-side search matching. | Frontend-only today; a real backend doing full-text search server-side would need an equivalent normalization strategy (e.g. a collation or a search index), see risks doc. |
| `services/http.js` | A correctly configured Axios instance (`baseURL` from `VITE_API_BASE_URL`, 10s timeout). **Currently unused** — no other file imports it or calls `axios` directly. | Becomes load-bearing on day one of backend integration; currently dead code. |
| `stores/locale.store.js` | Frontend-only locale preference (`onehelp.locale`), plus a side-effect on `i18n`/`document.title`. | Frontend-only forever. |
| `stores/notifications.store.js` | Transient in-memory toast/snackbar state, no persistence. | Frontend-only forever. |

---

## 3. Pinia store inventory

All 12 stores use the Composition-API "setup store" style (`defineStore(id, () => {...})`).

| Store id | File | State | Key actions | Persists via | Depends on other stores |
|---|---|---|---|---|---|
| `auth` | `features/auth/stores/auth.store.js` | `currentUser`, `isInitialized`, `loading`, `error`; computed `isAuthenticated` | `login`, `register`, `logout`, `initializeSession` (memoized singleton promise), `refreshCurrentUser`, `hasRole(...roles)` | `onehelp.auth.session` (`{userId, issuedAt}` only — never credentials) | none (leaf store; everything else depends on it) |
| `locale` | `stores/locale.store.js` | `locale`, `supportedLocales` | `init()`, `setLocale()` | `onehelp.locale` | none |
| `notifications` | `stores/notifications.store.js` | `notifications` (array) | `notify`, `dismiss`, `clear` | none (transient) | none |
| `actions` | `features/actions/stores/actions.store.js` | `actions`, `loading`, `error`, filter refs (`category`, `search` debounced 300ms, `datePreset`, `sort`), `currentAction` + loading/error | `fetchActions`, `fetchActionById`, `setSearch` | none directly (delegates to service) | watches `i18n.global.locale.value` to re-fetch on language change |
| `organizer` | `features/organizer/stores/organizer.store.js` | `actions`, `selectedAction`, `participants` (+ loading/error triples) | `loadActions`, `loadActionById`, `loadParticipants`, `create`, `update`, `changeStatus`, `clear` | none directly | watches `authStore.currentUser?.id` (auto-load/clear); guards stale responses via `currentOrganizerId()` re-check |
| `organizationApplication` | `features/organizerApplication/stores/organizationApplication.store.js` | `application`, `membership`, `loading`, `error` | `fetchApplication`, `submit`, `updatePending`, `resubmit`, `updateProfile`, `clear` | none directly | reads `authStore.currentUser?.id` |
| `adminOrganizations` | `features/admin/stores/adminOrganizations.store.js` | `organizations`, `loading`, `error` | `fetchOrganizations`, `approveOrganization`, `rejectOrganization`, `suspendOrganization`, `restoreOrganization`, `updateOrganizationDetails`, `remove(id)` (post-demotion list cleanup) | none directly | reads `authStore.currentUser?.id` for the acting admin id |
| `participation` | `features/participation/stores/participation.store.js` | `participations` (current user only), `loading`, `error`, `isInitialized`, `countVersion` (reactivity-forcing counter, bumped on join/cancel) | `loadForCurrentUser`, `join`, `cancel`, `getByActionId`, `isParticipating`, `clear` | none directly | watches `authStore.currentUser?.id` (auto-load/clear) |
| `attendance` | `features/attendance/stores/attendance.store.js` | Two independent slices: `userAttendance` (+loading/error/`isInitialized`) and `actionAttendance`/`qrSession` (+their own loading/error) | `loadUserAttendance`, `loadActionAttendance`, `loadQrSession`, `regenerateQrSession`, `checkInByQr`, `checkInManually`, `checkOut`, `validateToken`, `getByParticipationId`, `clear` | none directly | watches `authStore.currentUser?.id` for the volunteer slice; reads `authStore.hasRole(ROLES.ORGANIZER)` for the organizer slice |
| `adminActions` | `features/admin/stores/adminActions.store.js` | `actions`, `loading`, `error` | `fetchActions`, `approveAction`, `rejectAction`, `hideAction`, `restoreAction`, `updateActionDetails`, `changeLifecycleStatus` | none directly | reads `authStore.currentUser?.id` |
| `adminReports` | `features/admin/stores/adminReports.store.js` | `reports`, `loading`, `error` | `fetchReports`, `updateReportStatus` | none directly | reads `authStore.currentUser?.id` |
| `adminUsers` | `features/admin/stores/adminUsers.store.js` | `users`, `loading`, `error` | `fetchUsers`, `suspendUser`, `reactivateUser`, `updateUserProfile` | none directly | reads `authStore.currentUser?.id` |

### Store-layer classification

- **Server-state candidates (should become API-backed, cache invalidated by the
  backend's own responses)**: `actions`, `organizer`, `organizationApplication`,
  `adminOrganizations`, `participation`, `attendance`, `adminActions`, `adminReports`,
  `adminUsers` — i.e. every domain store. All are already structured as thin
  fetch/mutate wrappers around a service call with no store-local business logic beyond
  in-place array splicing (`replace(updated)` pattern, repeated identically across
  `adminOrganizations`, `adminActions`, `organizer`), which makes them a clean fit for
  swapping the underlying service call for an Axios request without touching the store
  shape.
- **Session-state candidates (must stay Pinia-managed on the frontend even after a real
  backend exists, but backed by a real session/JWT instead of a mocked one)**: `auth`.
- **Frontend-only forever**: `locale`, `notifications`.
- **Duplicated domain state**: none found. Every store that could plausibly overlap
  another (`organizer` vs `organizationApplication` vs `adminOrganizations`) was
  confirmed to hold non-overlapping slices of the same underlying storage-backed data —
  see the Organizations section of the domain dependency map below.
- **Derived/transient UI state kept correctly out of Pinia**: dialog visibility, form
  drafts, tab selection — confirmed local-component `ref`s throughout (e.g.
  `AdminConfirmDialog.vue`'s `reason`, `CheckInView.vue`'s `phase` state machine), never
  hoisted into a store.

---

## 4. Domain dependency map

For each domain: source of truth, related stores/services/storage, upstream/downstream
dependencies, and public visibility/authorization pointers. Full lifecycle/cascade rules
are in `business-rules.md`; the full route/role matrix is in
`routes-and-authorization.md`.

### Authentication
- **Source of truth**: `features/auth/mocks/users.mock.js` (`MOCK_USERS`, copied into a
  mutable in-memory `usersDb` at module load) + two localStorage overlays (role,
  profile).
- **Stores**: `auth`. **Services**: `auth.service.js`. **Storage**: `userRole.storage.js`,
  `userProfileOverride.storage.js`.
- **Views**: `LoginView.vue`, `RegisterView.vue`, `AccountView.vue`, `AccountMenu.vue`.
- **Downstream dependents**: every other domain reads `useAuthStore()` for
  `currentUser`/`hasRole`; the router guard depends on it directly.
- **Upstream dependency (notable)**: `auth.service.js` itself imports `getUserStatus`
  (from **admin**'s `userStatus.storage.js`) and `ACCOUNT_STATUS` (from **admin**'s
  `accountStatus.js`) to enforce the suspended-account check at login and session
  restore. This is a real `auth → admin` dependency at the mock-storage/util layer.
- **Circular/fragile import**: yes — `admin/services/adminUsers.service.js` imports
  `getAllUsers`/`getUserById` from `auth.service.js` and writes
  `userProfileOverride.storage.js`; `admin/services/organizations.service.js` writes
  `userRole.storage.js`. Combined with auth's own dependency on admin's storage/util
  layer above, "who owns account status" is genuinely split between the two features.

### Users & Roles
- **Source of truth**: `MOCK_USERS` + `userRoleOverride`/`userProfileOverride` overlays
  (role/profile) + `userStatus.storage.js` (suspension, owned by **admin**, not auth).
- **Roles**: `constants/roles.js` — `volunteer`, `organizer`, `moderator` (reserved,
  never exposed in any UI or route today), `administrator`.
- **Downstream**: router guard, nav visibility (`constants/navigation.js`), every
  role-gated view.

### Organizer Applications
- **Source of truth**: `onehelp.admin.organizations` (the application *is* the
  organization record, `status: pending` until reviewed) + `onehelp.organizerApplication.memberships`.
- **Stores**: `organizationApplication`. **Services**:
  `organizationApplication.service.js`, `organizerDemotion.service.js`.
- **Views**: `BecomeOrganizerView.vue`, `OrganizationApplicationForm.vue`.
- **Upstream**: reads/writes admin's `organizations.storage.js` directly.
- **Downstream**: `auth/views/AccountView.vue` and `AccountMenu.vue` read
  `organizationApplication` store state to swap navigation labels.
- **Circular/fragile import**: yes, with **admin/organizations** — see below; the two
  features' service/mock/util layers are mutually dependent even though no literal
  same-file ESM cycle exists.

### Organizations & Organizer Ownership
- **Source of truth**: `onehelp.admin.organizations` (base fixture ⊕ overrides ⊕ new
  minus tombstones), enforced 1:1 via `organizationMembership.storage.js`'s
  `createOwnerMembership` (drops any other membership the same user held) and the
  dev-only `organizationIntegrity.js` repair pass (dedupes membership rows, only warns —
  never auto-fixes — on unresolved organizer/organization mismatches).
- **Stores**: `adminOrganizations` (admin-wide list), `organizer` (actions only, **not**
  organization data — confirmed no overlap), `organizationApplication` (current user's
  own application/membership).
- **Services**: `admin/services/organizations.service.js` (approve/reject/suspend/
  restore/update — delegates validation to `organizerApplication/utils/organizationValidation.js`),
  `organizerApplication/services/organizerDemotion.service.js` (the central cascade,
  `demoteOrganizerToVolunteer`).
- **Downstream**: `actions` (visibility gate needs `getOrganizationStatus`), `organizer`
  (publish gate needs `getOrganizationStatus`), `admin/actionModeration` (same).
- **Deletion/cascade**: see `business-rules.md` / `risks-and-open-decisions.md` — full
  cascade order is participations → attendance → QR sessions → reports → moderation
  records → actions → organization tombstone → membership deleted → role reverted to
  volunteer. Never deletes the user account.
- **Circular/fragile import**: `admin` → `organizerApplication` (mocks/utils: membership
  storage, application errors, organization validation) **and**
  `organizerApplication` → `admin` (mocks/utils: organizations storage, organization
  status). Fragile in the sense that admin's own organization service is not
  self-contained — it delegates core validation/membership logic to a different
  feature — but not a literal circular ES-module import (no file imports itself
  transitively).

### Actions
- **Source of truth**: `features/actions/mocks/actions.mock.js` (immutable base) merged
  with `features/organizer/mocks/organizerActions.storage.js` overrides/new records,
  minus tombstones — via `getMergedActions()`.
- **Stores**: `actions` (public/read-only view), `organizer` (owner's CRUD view).
- **Services**: `actions/services/actions.service.js` (public query/filter/sort/
  localize), `organizer/services/organizerActions.service.js` (CRUD + lifecycle
  transitions).
- **Upstream**: both action-facing services import from **organizer** (merged action
  read), **admin** (organization status for the publish gate; moderation status for
  visibility), and **participation** (`getLocalConfirmedCount` for capacity checks).
- **Downstream**: `attendance` (needs `isActionPubliclyVisible`, `getMergedActions`),
  `admin/actionModeration` (needs `getMergedActions`, `getOrganizerActions`),
  `map` feature (reads `useActionsStore().actions` directly for map markers).
- **Circular/fragile import**: a genuine three-way entanglement between `actions`,
  `organizer`, and `admin` at the service/util layer (each needs at least one of the
  other two to compute visibility, gate publishing, or manage/count actions). No literal
  file-level cycle was found, but none of these three features can be extracted or
  lazy-loaded independently of the others today.

### Public Action Visibility
- **Single policy function**: `features/actions/utils/actionVisibility.js`,
  `isActionPubliclyVisible(action)` — three ANDed gates: organizer lifecycle status ∈
  `{published, closed}`, admin moderation status === `approved`, organization status ===
  `approved`. Fails closed on any missing/unresolved dependency.
- **Duplicated, not reused**: `AdminDashboardView.vue` recomputes the identical
  three-way policy inline (as a `computed()`) instead of calling
  `isActionPubliclyVisible` directly, with a code comment acknowledging the duplication
  "to avoid redundant storage lookups." Flagged in `risks-and-open-decisions.md`.

### Action Moderation
- **Source of truth**: `onehelp.admin.actionModeration`, one record per action id
  (default synthesized as `approved` for the 13 seed actions, `pendingReview` for
  anything created afterward).
- **Stores**: `adminActions`. **Services**: `actionModeration.service.js`.
- **Downstream**: `actionVisibility.js` (public gate), `AdminReportsView.vue` (a second,
  store-bypassing entry point — `handleHideAction` calls `hideAction` from the service
  directly rather than through `adminActions` store).

### Participations
- **Source of truth**: `onehelp.participations`, append-only, soft-cancel only.
- **Stores**: `participation` (current user's own records only).
- **Services**: `participation.service.js`.
- **Upstream**: the service imports `getActionById` from **actions** (to check
  past-date/closed status and capacity at join time) — the one outbound dependency of
  the participation feature besides generic utils and `auth`.
- **Downstream**: `actions` (`ActionCard.vue`/`ActionDetailsView.vue` read
  `participationStore`/`participationCount.js` for the join CTA and count overlay),
  `organizer` (capacity validation, participant lists), `attendance` (confirmed-
  participant requirement, participation-id-based lookup), `organizerApplication`
  (`organizerDemotion.service.js` bypasses the service/store to call
  `deleteParticipationsByActionIds` directly on the storage module — cascade-only).
- **Circular/fragile import**: `actions ⇄ participation` two-way coupling — actions'
  own components read participation's store/utils for the count overlay, while
  participation's service reads actions' service for join-time validation. Both
  documented as intentional ("so list and details can never disagree"), but it means
  neither feature is independently extractable.

### Attendance
- **Source of truth**: `onehelp.attendance` (one record per check-in, referencing a
  participation) and `onehelp.attendance.qrSession` (one live session per action).
- **Stores**: `attendance`. **Services**: `attendance.service.js`.
- **Upstream**: imports from **organizer** (merged actions, lifecycle status), **actions**
  (`isActionPubliclyVisible`), **participation** (`getParticipation`,
  `getParticipationById`).
- **Downstream**: `organizer` (participant list check-in/out UI), `participation`
  (`MyActionsView.vue` reads `attendanceStore.getByParticipationId`),
  `organizerApplication` (cascade-only delete).
- **No circular import found** — attendance depends on three other features at the
  service level; none of those three import back from attendance's own service/store/
  mock layer (only from views, which is a different call graph).

### QR Check-In
- Same file group as Attendance (`qrSession.storage.js`, `qrToken.js`,
  `checkInWindow.js`). Token payload is `{tokenId, actionId, organizerId, issuedAt,
  expiresAt, nonce}` — **no participant identity is ever encoded**, confirmed by direct
  inspection of `createQrTokenPayload`. TTL is 10 minutes
  (`QR_TOKEN_TTL_MINUTES`). The check-in *time window* (30 min before start, 180 min
  after) is informational/UI-only, not enforced by the service.

### Reports
- **Source of truth**: `onehelp.admin.reports`.
- **Services**: `reports.service.js` (`createReport` is the volunteer-facing entry
  point, called directly from `ReportActionCard.vue` in the **actions** feature).
- **Downstream**: `organizerApplication` (cascade-only delete by action id).
- **Upstream**: reads `getMergedActions()` (organizer) to validate the action exists
  and to check the own-action-reporting restriction.

### Admin Activity
- **Source of truth**: `onehelp.admin.activityLog`, append-only.
- **Write path is scattered**, not centralized — see "Scattered activity logging" above.
  `activityLog.service.js` provides read-only `getActivityLog({limit})`.
- Confirmed **not logged**: admin action-content edits, admin user-profile edits, report
  creation.

---

## 5. Consumers summary — widest fan-out modules

These modules are imported directly (bypassing their owning feature's own
service/store) by three or more other features, and are therefore the highest-risk
seams when introducing a real backend one domain at a time (see
`frontend-backend-replacement-map.md`):

1. **`admin/mocks/organizations.storage.js`** — 9 external importers across `organizer`,
   `actions`, `admin` (moderation/reports), `organizerApplication` (service, demotion,
   validation, integrity).
2. **`organizer/mocks/organizerActions.storage.js`** — 6 external importers across
   `actions`, `attendance`, `admin` (reports, moderation), `organizerApplication`
   (demotion).
3. **`participation/mocks/participations.storage.js`** — 1 direct external bypass
   (`organizerDemotion.service.js`), everything else goes through
   `participation.service.js` or `participationCount.js`.
4. **`admin/mocks/actionModeration.storage.js`** — read by `actions/utils/actionVisibility.js`
   directly (cross-feature), plus the demotion cascade.
5. **`admin/mocks/userStatus.storage.js`** — read directly by `auth/services/auth.service.js`.
