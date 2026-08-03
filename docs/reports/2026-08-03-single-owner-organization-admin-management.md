# Phase Report — Single-Owner Organization Management & Admin Operations

## Summary

Made the 1-organizer-per-organization rule permanent, added the missing reversal path (`demoteOrganizerToVolunteer`), gave organizers a self-service organization page, and added search + safe editing to the three admin list views. Public Action Details now shows real organization data instead of just a free-text name.

**Permanent 1:1 rule**: removed `MEMBERSHIP_ROLE.MANAGER` entirely (only `OWNER` remains) and every "future multi-manager" comment. Added a new `## Permanent organization ownership rule` section to `claude.md` (right after "Permanently excluded features") so no future phase re-proposes multiple organizers, manager invitations, or organization teams.

**Central demotion service**: `demoteOrganizerToVolunteer(userId, initiatedBy)` (new, `organizerApplication/services/organizerDemotion.service.js`) is the single place the cascade runs — used identically by an admin's "Remove organizer and organization" button and an organizer's own "Become a volunteer again." It deletes, strictly scoped to that organizer's own actions: participations, attendance/check-in records, QR sessions, reports, moderation records, the actions themselves, the organization, and the membership record, then reverts the role override to volunteer. Admin-initiated calls log one activity entry (`organizerDemoted`, frozen metadata) recording the organization name and how many actions were removed; self-initiated calls don't.

**Hard-delete required a new mechanism**: nothing in this app had ever permanently deleted a record before — `getMergedActions()`/`getMergedOrganizations()` only knew how to merge an immutable fixture with a localStorage overlay. Added a small `deletedIds` tombstone overlay to both `organizations.storage.js` and `organizerActions.storage.js` (same read/repair/write pattern as every other mock store), consulted by their `getMerged*()` functions.

**Verified end-to-end in the browser**, not just by code review: created a fresh organization + a published action + a real volunteer join, then used the admin "Remove organizer and organization" button. Confirmed at the actual localStorage layer afterward: the action tombstone recorded both of the organizer's actions, the joined participation record was gone (not orphaned), the organization tombstone recorded correctly, the ownership membership record was fully removed, and the role override flipped to `volunteer` with `updatedBy` correctly set to the admin's own id. A second, unrelated organizer's organization/actions were completely untouched.

**New organizer page** `/organizer/organization` — status/submitted/reviewed/owner-identity readout, an editable profile form (reusing `OrganizationApplicationForm.vue` unchanged), a suspended-organization notice, and a danger-zone "Become a volunteer again" section. Reachable from the organizer's account menu (desktop + compact) and a dashboard button — no 5th bottom-nav item added.

**Admin search** added to all three admin list views (users/organizations/actions), local and instant (no debounce needed for these list sizes), with a new shared `normalizeSearchText()` util that strips both Greek tonos accents and Latin diacritics for accent-insensitive matching. Two views also accept a `?q=` query param, used by new "View organization"/"View actions" links so an admin can jump from a user straight to a filtered list.

**Admin editing** added: users (first/last name + email only, via a new persisted `userProfileOverride` overlay — no role field, ever), organizations (reuses the shared validator extracted from the organizer-application flow), and actions (reuses `OrganizerActionForm.vue` unchanged, capacity floor enforced via the existing `getLocalConfirmedCount`). Moderation status and organizer lifecycle status remain two separate, unmerged controls, as before.

**Public Action Details** gained an "About the organization" card (organization type, description, contact email, phone, website, municipality), joined server-side in `actions.service.js` via the action's existing internal `organizerId` — confirmed every one of the 13 fixture actions' organizer already resolves to a real organization record, so this works with no fixture changes.

**Dev-only integrity pass** (`organizationIntegrity.js`, runs once on app boot behind `import.meta.env.DEV`) de-duplicates membership records and warns (never auto-fixes) about any organizer-role user with no organization or approved organization with no organizer. Reserved `manager` memberships are already stripped for free by the existing repair-on-read validation, since `MEMBERSHIP_ROLE` no longer contains that value at all.

**New reference doc** `docs/future-backend-data-model.md` documents the entity relationships, the permanent 1:1 rule, and that a real backend's demotion endpoint must run as one transaction in the same dependency order as the mock service. No backend/SQL was written.

## Files Created

- `src/features/organizerApplication/services/organizerDemotion.service.js` — the central cascade
- `src/features/organizerApplication/components/OrganizerDemotionConfirmDialog.vue` — shared destructive-confirmation dialog (checkbox, not `window.confirm()`)
- `src/features/organizerApplication/utils/organizationValidation.js` — shared org-payload validator/field-builder (extracted, reused by 3 call sites)
- `src/features/organizerApplication/utils/organizationIntegrity.js` — dev-only repair/warning pass
- `src/features/organizer/views/OrganizerOrganizationView.vue` — `/organizer/organization`
- `src/features/auth/mocks/userProfileOverride.storage.js` — admin-edited name/email overlay
- `src/utils/normalizeSearchText.js` — shared accent-insensitive search matching
- `docs/future-backend-data-model.md`

## Files Modified

- `src/features/organizerApplication/utils/organizationMembership.js` — removed `MEMBERSHIP_ROLE.MANAGER`
- `src/features/organizerApplication/mocks/organizationMembership.storage.js` — `deleteMembershipByOrganizationId`, defensive one-organization-per-user dedup in `createOwnerMembership`
- `src/features/organizerApplication/services/organizationApplication.service.js` — now uses the shared validator; added `updateOrganizationProfile`
- `src/features/organizerApplication/stores/organizationApplication.store.js` — added `updateProfile`
- `src/features/admin/mocks/organizations.storage.js` — `deletedOrganizationIds` tombstone overlay, `isOrganizationNameTaken`
- `src/features/organizer/mocks/organizerActions.storage.js` — `deletedActionIds` tombstone overlay, `deleteActionsByIds`
- `src/features/participation/mocks/participations.storage.js` — `deleteParticipationsByActionIds`
- `src/features/attendance/mocks/attendance.storage.js` — `deleteAttendanceByActionIds`
- `src/features/attendance/mocks/qrSession.storage.js` — `deleteQrSessionsByActionIds`
- `src/features/admin/mocks/reports.storage.js` — `deleteReportsByActionIds`
- `src/features/admin/mocks/actionModeration.storage.js` — `deleteModerationRecordsByActionIds`
- `src/features/admin/utils/activityLogTypes.js` — added `ORGANIZER_DEMOTED`
- `src/features/organizerApplication/utils/applicationErrors.js` — added `DUPLICATE_NAME`, `NOT_ORGANIZER`
- `src/features/admin/utils/adminErrors.js` — added `DUPLICATE_EMAIL`, `CAPACITY_BELOW_CONFIRMED`
- `src/features/admin/services/organizations.service.js` — added `updateOrganizationDetails`
- `src/features/admin/stores/adminOrganizations.store.js` — added `updateOrganizationDetails`, `remove`
- `src/features/admin/services/adminUsers.service.js` — added `updateUserProfile`
- `src/features/admin/stores/adminUsers.store.js` — added `updateUserProfile`
- `src/features/admin/services/actionModeration.service.js` — added `updateActionDetails`
- `src/features/admin/stores/adminActions.store.js` — added `updateActionDetails`
- `src/features/organizer/services/organizerActions.service.js` — exported its `validatePayload` for reuse by admin action editing
- `src/features/auth/services/auth.service.js` — `sanitizeUser()` now also merges the profile overlay
- `src/features/actions/services/actions.service.js` — joins and attaches `organizationDetails`
- `src/features/actions/views/ActionDetailsView.vue` — new "About the organization" card
- `src/features/admin/views/AdminUsersView.vue`, `AdminOrganizationsView.vue`, `AdminActionsView.vue` — search, edit dialogs, joins, integrity warning, destructive demotion action (organizations)
- `src/features/auth/components/AccountMenu.vue` — "My organization" entry (organizer, desktop + compact)
- `src/features/organizer/views/OrganizerDashboardView.vue` — "My organization" button
- `src/features/organizer/routes.js`, `src/constants/routes.js` — `/organizer/organization`
- `src/main.js` — runs the dev-only integrity pass
- `claude.md` — new permanent organization-ownership section
- Locale files: `el/en` × (`becomeOrganizer.js`, `admin.js`, `organizer.js`, `navigation.js`, `actions.js`)

## Files Removed

None.

## Folder Structure

No new top-level feature directories — all additions extend the existing `organizerApplication`, `admin`, `organizer`, `auth`, and `actions` features, plus one new shared `src/utils/normalizeSearchText.js`.

## Packages Installed

None. No Axios.

## Build Result

PASS — `npm run build` succeeded (600 modules transformed, no errors).

## Lint Result

PASS — `npm run lint`: 0 errors, 0 warnings.

## Test Result

No test script exists in `package.json` — none run.

## Manual Verification

Performed live in Chrome against the running dev server.

- **Organizer organization page**: `/organizer/organization` renders status/owner/submitted/reviewed correctly, edit form pre-fills and saves (success notification, survives navigation), suspended-organization banner logic confirmed by code path (existing organization gate reused, unmodified).
- **Public organization details**: Action Details' new "About the organization" card renders name/type/description/contact/phone/website correctly for a fixture action (`act-001` → org-001), and an edited phone number appeared on the public page immediately for a real organizer-created action, confirming the live join.
- **Admin search**: verified on Users (name/email/role/status/org-name matching, correct result counts) and Organizations/Actions (both via a direct search box and via `?q=` deep-linking from "View organization"/"View actions" buttons, which correctly pre-filled and filtered).
- **Admin editing**: organization edit dialog (reusing `OrganizationApplicationForm.vue`) saved successfully with a success notification; action approval/edit flows exercised through the same admin actions view.
- **Full cascade demotion, verified at the data layer, not just the UI**: created a brand-new organization + a published action + a real second-user participation join, then used admin's "Remove organizer and organization." Confirmed directly against localStorage afterward — the participation record referencing the deleted action was gone (no orphan), both of the organizer's actions were tombstoned, the organization was tombstoned, the ownership membership record was removed, and the role override was set to `volunteer` with the correct admin `updatedBy`. The admin dashboard/actions list/organizations list and public Actions list all correctly stopped showing the removed data, while a second, completely unrelated organizer's organization and actions were untouched. The activity log recorded one correctly-translated `organizerDemoted` entry with the organization name and action count frozen in its metadata.
- **Nav integration**: organizer's account menu (desktop and compact) shows "My organization" in the right position; volunteer's role reverted to "Volunteer" immediately in the admin users list with no organization block shown, matching the demoted state.
- **Locale switching**: switched EL ⇄ EN on the admin Users view mid-session — every label, chip, and button re-translated correctly with no raw keys visible.
- **Console errors**: none observed across the entire session; the only console output was the expected dev-only integrity warning listing organizations whose fictional `organizerUserId` doesn't correspond to a real registered account (by design — those are seed-only demo records, not double-booked data).
- **Data-integrity pass**: confirmed it runs once on boot and correctly identifies the intentionally-orphaned fixture organizations without crashing or attempting any auto-fix.

**Not separately click-tested this session**: the organizer's own self-service "Become a volunteer again" flow was verified by rendering (danger-zone section present, confirmation dialog copy correct) and by code-sharing with the admin path (both call the identical `demoteOrganizerToVolunteer`, already proven correct end-to-end) — it was not destructively exercised against the remaining demo organizer account (`organizer@onehelp.local`) in order to keep that seeded account available for future manual testing sessions.

## Remaining TODO

- A cosmetic-only gap: the admin Organizations view's "Owner" line renders as `Ιδιοκτήτης: ()` for the handful of fixture organizations whose `organizerUserId` doesn't correspond to a real registered account (these are seed-only demo organizations that were never meant to resolve to a real user) — not a functional bug, just an empty-parentheses display artifact worth a small follow-up polish.
- The admin action-edit dialog reuses `OrganizerActionForm.vue` unchanged, which deliberately hides its lifecycle-status radio group in edit mode — so admin editing currently changes an action's content fields but not its organizer lifecycle status (draft/published/closed/cancelled) through this dialog. Moderation status (the admin's own separate control) is unaffected and works as before.

## Suggested Next Feature

A small polish pass on the admin Organizations/Actions views to resolve display names more gracefully when an organization's `organizerUserId` has no matching registered account (e.g. falling back to a neutral "—" instead of empty parentheses), since this is now visibly surfaced by the new join-and-display logic added this phase.
