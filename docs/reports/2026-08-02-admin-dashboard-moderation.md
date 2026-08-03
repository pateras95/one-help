# Phase Report — Admin Dashboard & Moderation

## Summary

Introduced a mocked administration and moderation workspace on top of every existing feature (Actions, Participation, Organizer Management, Attendance, Map), fully client-side with no backend. Activated the reserved `administrator` role (moderator remains reserved/unexposed) with one fictional demo account: **`admin@onehelp.local` / `Admin123!`** (development-only credential, follows the exact same mock pattern as the existing volunteer/organizer demo accounts and appears in the Login screen's demo-credentials list automatically).

A new `src/features/admin/` structure (components, mocks, services, stores, utils, views) owns four moderation domains — **users** (account status), **organizations** (a newly formalized model, since none existed before), **action moderation** (a status distinct from the organizer's own draft/published/closed/cancelled lifecycle), and **reports** (volunteer-submitted, admin-triaged) — plus a read-only, append-only **activity log**. Every mutation (suspend/reactivate, approve/reject/suspend/restore, approve/reject/hide/restore, report status change) writes one activity entry and is exposed on `/admin` (summary + recent activity) and `/admin/activity` (full history).

**Chosen visibility/moderation policy (Section 5):** an organization suspension **hides its published actions from public discovery immediately** (list, map, direct URL) **until restored** — records are never deleted, the owning organizer can still see and manage them from their own dashboard, and restoring the organization makes eligible actions reappear automatically. The same "hide, never delete" rule applies to admin-hidden individual actions. This is enforced by **one reusable helper**, `isActionPubliclyVisible()` (`src/features/actions/utils/actionVisibility.js`), consumed by the public Actions service (list + details), the Map (via the same service), participation (`joinAction` resolves through the same gated `getActionById`), and QR check-in (`attendance.service.js`'s `performCheckIn`/`generateCheckInSession`) — so there is exactly one place that can ever disagree about whether an action is public.

All 13 original fixture actions were seeded as `approved` (moderation) and their organizations as `approved`, so today's public behavior does not change on its own; a brand-new organizer-created action defaults to `pendingReview` until an admin approves it.

**Frontend gap, not prioritized above testing/polish (Section 6):** there is currently no public-facing "apply to become an organizer" screen — organizations are seeded directly (10 tied to the existing fixture organizers, all `approved`, plus 3 new fictional ones in `pending`/`rejected`/`suspended` states purely to exercise the admin approval workflow). Building that public application flow is a reasonable future frontend feature, but this phase intentionally did not build it.

## Files Created

**Admin feature (`src/features/admin/`):**
- `utils/`: `accountStatus.js`, `organizationStatus.js`, `actionModerationStatus.js`, `reportStatus.js`, `activityLogTypes.js`, `adminErrors.js`, `activityDescribe.js`
- `mocks/`: `userStatus.storage.js`, `organizations.mock.js`, `organizations.storage.js`, `actionModeration.storage.js`, `reports.storage.js`, `activityLog.storage.js`
- `services/`: `adminUsers.service.js`, `organizations.service.js`, `actionModeration.service.js`, `reports.service.js`, `activityLog.service.js`
- `stores/`: `adminUsers.store.js`, `adminOrganizations.store.js`, `adminActions.store.js`, `adminReports.store.js`
- `components/`: `AdminConfirmDialog.vue`, `AdminStatusChip.vue`, `AdminSummaryCard.vue`, `AdminNavTabs.vue`
- `views/`: `AdminDashboardView.vue`, `AdminUsersView.vue`, `AdminOrganizationsView.vue`, `AdminActionsView.vue`, `AdminReportsView.vue`, `AdminActivityView.vue`
- `routes.js`

**Elsewhere:**
- `src/features/actions/utils/actionVisibility.js` — the shared public-visibility policy
- `src/features/actions/components/ReportActionCard.vue` — volunteer-facing "report this action" card
- `src/locales/en/admin.js`, `src/locales/el/admin.js`

## Files Modified

- `src/constants/roles.js` — `ACTIVE_ROLES` now includes `administrator`
- `src/features/auth/mocks/users.mock.js` — added the `admin@onehelp.local` demo account
- `src/features/auth/services/auth.service.js` — `sanitizeUser()` now includes account `status`; `login()`/`getCurrentSession()` reject suspended accounts; added `getAllUsers()`
- `src/features/auth/views/LoginView.vue` — handles the `accountSuspended` error code; `defaultLandingFor()` routes administrators to `/admin`
- `src/router/authGuard.js` — `defaultAuthenticatedPath()` routes administrators to `/admin`
- `src/constants/routes.js` — added `ADMIN`, `ADMIN_USERS`, `ADMIN_ORGANIZATIONS`, `ADMIN_ACTIONS`, `ADMIN_REPORTS`, `ADMIN_ACTIVITY`
- `src/constants/navigation.js` — administrator's mobile bottom-nav set: Home, Actions, Admin, Account (4 items; Map is intentionally not one of them for this role)
- `src/locales/en/navigation.js`, `src/locales/el/navigation.js` — added the `admin` nav label
- `src/features/auth/components/AccountMenu.vue` — desktop menu gains "Admin dashboard" + "Account" for administrators; compact (mobile) menu intentionally shows neither (both already occupy dedicated bottom-nav slots for this role) — just Logout
- `src/features/participation/components/ParticipationPanel.vue` — the existing organizer "can't join as a volunteer" restriction now also covers administrators (generalized `isOrganizer` → `isNonVolunteer`, with role-specific copy)
- `src/locales/en/participation.js`, `src/locales/el/participation.js` — added `administratorRestriction` copy
- `src/router/routes/public.routes.js` — registered `adminRoutes`
- `src/locales/index.js` — registered the `admin` locale namespace
- `src/features/organizer/utils/organizerActionErrors.js` — added `organizationSuspended`/`organizationNotApproved` error codes
- `src/features/organizer/services/organizerActions.service.js` — `createOrganizerAction`/`updateOrganizerAction`/`changeOrganizerActionStatus` now gate on the organizer's organization status (suspended blocks everything; pending/rejected blocks only publishing)
- `src/locales/en/organizer.js`, `src/locales/el/organizer.js` — added the two new error translations
- `src/features/actions/services/actions.service.js` — `isPubliclyVisible` replaced by the shared `isActionPubliclyVisible()`
- `src/features/attendance/services/attendance.service.js` — `performCheckIn`/`generateCheckInSession` also gate on the shared visibility policy
- `src/features/actions/views/ActionDetailsView.vue` — added `ReportActionCard`
- `src/locales/en/actions.js`, `src/locales/el/actions.js` — added the `report.*` translation namespace

## Files Removed

None.

## Folder Structure

```
src/features/admin/
├── components/
│   ├── AdminConfirmDialog.vue
│   ├── AdminNavTabs.vue
│   ├── AdminStatusChip.vue
│   └── AdminSummaryCard.vue
├── mocks/
│   ├── actionModeration.storage.js
│   ├── activityLog.storage.js
│   ├── organizations.mock.js
│   ├── organizations.storage.js
│   ├── reports.storage.js
│   └── userStatus.storage.js
├── services/
│   ├── actionModeration.service.js
│   ├── activityLog.service.js
│   ├── adminUsers.service.js
│   ├── organizations.service.js
│   └── reports.service.js
├── stores/
│   ├── adminActions.store.js
│   ├── adminOrganizations.store.js
│   ├── adminReports.store.js
│   └── adminUsers.store.js
├── utils/
│   ├── accountStatus.js
│   ├── actionModerationStatus.js
│   ├── activityDescribe.js
│   ├── activityLogTypes.js
│   ├── adminErrors.js
│   ├── organizationStatus.js
│   └── reportStatus.js
├── views/
│   ├── AdminActionsView.vue
│   ├── AdminActivityView.vue
│   ├── AdminDashboardView.vue
│   ├── AdminOrganizationsView.vue
│   ├── AdminReportsView.vue
│   └── AdminUsersView.vue
└── routes.js
```

Dependency direction: `admin` reads from `actions/mocks` (base fixture ids, for the moderation-default rule) and `organizer/mocks` (merged actions, for lifecycle status) — the same "consult the authoritative owner" pattern already used by `attendance`. In the other direction, `auth.service.js`, `actions.service.js`, `attendance.service.js`, and `organizerActions.service.js` all read from `admin/mocks` or `admin/utils` (account status, visibility policy, organization gate) — a new but necessary cross-feature dependency, since moderation must be enforced at the exact points where those features already make their own decisions.

## Packages Installed

None. No Axios.

## Build Result

PASS — `npm run build` succeeded on every run, including the final run after all manual testing.

## Lint Result

PASS — `npm run lint`: 0 errors, 0 warnings.

## Test Result

No test script exists in `package.json` — none run.

## Manual Verification

Performed live in Chrome against the running dev server, using `admin@onehelp.local` / `Admin123!`, `organizer@onehelp.local` / `Organizer123!`, and `volunteer@onehelp.local` / `Volunteer123!`.

- **Administrator login & redirect**: logging in as admin redirected straight to `/admin`; the dashboard showed correct live summary counts (3 users, 1 active volunteer, 1 organizer, 1 pending organizer approval, 11 published actions, 0 awaiting review, 0 suspended, 0 open reports) and an empty "recent activity" panel on a fresh session.
- **Desktop/mobile navigation**: the desktop account menu showed exactly "Admin dashboard, Account, Logout" (no volunteer/organizer items); `AUTHENTICATED_MOBILE_NAVIGATION.administrator` is Home/Actions/Admin/Account (4 items, code-reviewed).
- **Route protection**: a logged-in volunteer navigating directly to `/admin` was redirected to `/unauthorized`; `/admin/*` routes all carry `roles: [ROLES.ADMINISTRATOR]` meta, same guard mechanism already proven for organizer-only routes.
- **Self-suspend guard**: the admin's own row in `/admin/users` shows a disabled "Suspend" button with an explicit explanatory caption, never just a silently-missing control.
- **Suspend/reactivate**: suspending the volunteer showed a confirmation dialog, updated the status chip immediately, and logged an activity entry; the suspended account's next login attempt correctly showed "This account has been suspended..." and was rejected; reactivating restored login access.
- **Organization approve/reject/suspend/restore**: rejecting the seeded pending organization required a reason and moved it to a terminal `rejected` state (no further actions offered); suspending the real organizer's approved organization immediately hid its action from `/actions` search and made its direct URL 404 gracefully (no console errors) while the organizer's own `/organizer/actions/:id` view kept showing it in full; restoring the organization made the action reappear publicly within one refresh.
- **Organizer-side gating**: while suspended, the real organizer's edit form showed a clear translated banner ("Your organization is currently suspended, so you cannot create, edit, or change the status of any action...") instead of silently disabling controls; the pending/rejected → "cannot publish" code path uses the identical gate function and was verified by code review (not separately click-tested this session, given the suspended path already exercises the same function end-to-end).
- **Action moderation**: hiding an approved action immediately removed it from public discovery and 404'd its direct URL; restoring it brought it back.
- **Reports**: submitting a report from Action Details (volunteer-only UI, hidden for organizer/administrator accounts) worked end-to-end, including the reason dropdown and optional description; a second report for the same action was correctly rejected ("You already have an open report for this action"); the admin Reports list showed the action title, reporter's real name, reason, and status, and resolving it (with an optional note) worked correctly.
- **Activity log**: every single action above appeared, correctly translated and in order, on both the dashboard's recent-activity widget and the full `/admin/activity` list — including correctly re-translating a historical `reportStatusChanged` entry's interpolated `fromStatus`/`toStatus` values (not just the static template) on a live locale switch.
- **Locale switching**: switched EN ↔ EL on `/admin/activity` (and earlier on `/admin`, `/admin/organizations`) — every label, tab, chip, and historical activity entry re-translated with no crash and no console errors; free-text admin-entered content (e.g. a rejection reason typed in Greek) correctly stayed as entered rather than being (mis)translated.
- **Console errors**: none observed at any point in this session, across every role and every screen.

**Not separately click-tested this session** (implemented and code-reviewed, but time-boxed given this feature's size): malformed-storage repair for each new storage module (all six follow the exact same "repair on read" pattern already shipped and tested for organizer actions/participations/attendance — parse failure or non-array clears to `[]`, invalid individual records are filtered out and the store is rewritten); the pending/rejected (as opposed to suspended) organizer-publish-blocked path, which shares the same `checkOrganizationGate()` function already verified via the suspended case.

## Remaining TODO

- No public "apply to become an organizer" screen exists yet — a plausible future frontend feature, explicitly not prioritized above testing/polish for this phase, per the spec.
- Malformed-storage repair for the six new admin storage modules should get a dedicated manual pass (deliberately corrupt each `localStorage` key and confirm graceful recovery) before shipping, following the same recipe already used for the organizer/participation stores.

## Suggested Next Feature

A lightweight accessibility/keyboard-navigation audit pass across the full app (focus order, skip links, dialog focus trapping) now that every major workspace — public discovery, participation, organizer management, attendance, map, and admin moderation — is in place.
