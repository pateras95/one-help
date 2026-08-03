# Phase Report — Organizer Application & Organization Onboarding

## Summary

Closed the gap where organizer accounts, organizations, and admin approval already existed but a registered volunteer had no way to actually apply to create an organization and become its organizer. Built a complete, client-side "Become an organizer" flow: a registered volunteer opens `/become-organizer`, submits an organization application, it lands as a `pending` organization record (visible to admins at `/admin/organizations`), and admin approval/rejection/suspension/restoration now has real, first-class side effects on the applicant's own account — not just on the organization record.

**Product model kept exactly as specified**: User (account), Organization (volunteering entity), and Organizer (a user authorized to manage an approved organization) are distinct concepts. Registration stays strictly volunteer-only; nothing lets a user self-assign the organizer role. The Organization record itself **is** the application throughout its lifecycle (pending → approved/rejected/suspended) — there is no separate "Application" entity, consistent with how the three fictional pending/rejected/suspended organizations were already modeled in the prior Admin feature.

**Membership model**: a new `organizerApplication/mocks/organizationMembership.storage.js` introduces `{ id, organizationId, userId, membershipRole, status, createdAt, approvedAt }` records. Only `owner` is exposed this phase; `manager` is reserved in the constant but not used anywhere, per the spec's "keep the data model capable of it later" instruction — no invitations/multiple-managers UI was built. `MEMBERSHIP_STATUS` is a literal re-export of the existing `ORGANIZATION_STATUS` enum (not a second, parallel status model), satisfying the "stay compatible with the existing admin implementation" requirement by construction.

**Role sync (documented mock simplification)**: the current user model has a single `role` field, and `auth.service.js`'s `usersDb` is deliberately in-memory-only (an existing, pre-dating simplification — it resets on every full page reload). Approval needs to durably flip a user's effective role without a backend. The chosen approach — explicitly the "preferred temporary approach" the spec itself asked for — is a **third localStorage overlay**, `auth/mocks/userRole.storage.js`, mirroring the already-proven `admin/mocks/userStatus.storage.js` pattern: `sanitizeUser()`'s `role` field is now `getUserRoleOverride(user.id) ?? user.role`, evaluated fresh on every call. Organization approval calls `setUserRoleOverride(organizerUserId, ROLES.ORGANIZER, adminUserId)`. A future backend would replace this with role/permission data derived directly from membership records; this is a frontend-only stand-in, and is the second time this exact overlay technique has been used in this codebase (status, now role).

**Live role sync without forced logout**: `auth.store.js` gained `refreshCurrentUser()` — a safe, explicit one-time re-fetch of the current session used by `BecomeOrganizerView.vue` right after it detects an approved application, so the same tab's nav/guards reflect the new organizer role without a manual logout. A fresh login always re-fetches the session from scratch, so it reflects the current role automatically with no extra step.

**Suspension semantics**: suspending an organization does **not** revert the user's `role` back to volunteer — the user stays `organizer` throughout a suspension, and only organizer *actions* are blocked, via the already-existing `checkOrganizationGate()` from the prior Admin feature (unmodified, reused as-is). This was necessary so the user can still see their account/organization state during a suspension rather than being silently and confusingly demoted.

**Real pre-existing bug found and fixed**: `admin/mocks/organizations.storage.js`'s `getMergedOrganizations()` only mapped over the base fixture array applying by-id overrides — it had no logic to append wholly new records that aren't in the fixture at all (unlike its sibling `organizerActions.storage.js`'s equivalent, which already had this). Without this fix, a brand-new user-submitted organization application would never have appeared anywhere in the app — admin dashboard counts, `/admin/organizations`, or anywhere else. Fixed to merge base+override records and then append any stored records whose id isn't in the base fixture at all.

**No backend, no document uploads, no identity verification, no email-verification workflow, no organization invitations/multiple-managers UI, no certificates, no exports, no payments/donations, no PWA changes, no automated tests, and no new dependencies (no Axios)** — all per spec.

## Files Created

**`src/features/organizerApplication/`** (new feature directory):
- `components/OrganizationApplicationForm.vue` — reusable create/edit-pending/resubmit-rejected form
- `mocks/organizationMembership.storage.js` — membership persistence (read/write/repair, `createOwnerMembership`, `setMembershipStatusForOrganization`)
- `services/organizationApplication.service.js` — `getApplicationForUser`, `submitOrganizationApplication`, `updatePendingApplication`, `resubmitRejectedApplication`, `getUserOrganizationMembership`, `getOrganizationForUser`
- `stores/organizationApplication.store.js` — Pinia store wrapping the service for `BecomeOrganizerView.vue`
- `utils/organizationMembership.js` — `MEMBERSHIP_ROLE` constant + `MEMBERSHIP_STATUS` (re-export of `ORGANIZATION_STATUS`)
- `utils/applicationErrors.js` — `APPLICATION_ERROR` codes + `applicationErrorKey()`
- `views/BecomeOrganizerView.vue` — the single route's state-machine view (no-application/pending/approved/rejected/suspended)
- `routes.js` — the `/become-organizer` route definition

**Elsewhere:**
- `src/constants/organizationTypes.js` — shared `ORGANIZATION_TYPES` (8 stable ids: ngo, municipality, healthOrganization, volunteerGroup, animalWelfare, educationalInstitution, communityAssociation, other) + `getOrganizationType()`/`isValidOrganizationTypeId()`
- `src/features/auth/mocks/userRole.storage.js` — the role-override overlay (documented mock simplification)
- `src/locales/en/becomeOrganizer.js`, `src/locales/el/becomeOrganizer.js` — full namespace: form/validation, pending/approved/rejected/suspended panels, account-panel copy, notifications, error mapping
- `src/locales/en/organizationTypes.js`, `src/locales/el/organizationTypes.js` — translated labels for the 8 organization types

## Files Modified

- `src/features/admin/mocks/organizations.storage.js` — **bug fix**: `getMergedOrganizations()` now appends newly created (non-fixture) records instead of silently dropping them; `isValidRecord()` extended to accept the optional `categories`/`organizationType` fields real applications now carry
- `src/features/admin/services/organizations.service.js` — `approveOrganization()` now calls `createOwnerMembership()` + `setUserRoleOverride(..., ROLES.ORGANIZER, ...)`; `suspendOrganization()`/`restoreOrganization()` now call `setMembershipStatusForOrganization()` to keep the membership record's status in lockstep with the organization's; `rejectOrganization()` is unchanged (no membership exists yet at first rejection)
- `src/features/auth/services/auth.service.js` — `sanitizeUser()`'s `role` field now resolves through `getUserRoleOverride(user.id) ?? user.role`
- `src/features/auth/stores/auth.store.js` — added `refreshCurrentUser()`
- `src/constants/routes.js` — added `BECOME_ORGANIZER: '/become-organizer'`
- `src/router/routes/public.routes.js` — registered `organizerApplicationRoutes`
- `src/features/auth/components/AccountMenu.vue` — desktop volunteer menu now leads with Account, then My Actions/Check-in/**Become an organizer** (relabeled **Application status** once a pending/rejected application exists); desktop organizer menu gained an explicit Account item (previously only administrators had one); compact (mobile) volunteer menu gained the same Become-an-organizer/Application-status entry alongside Account/Check-in
- `src/features/auth/views/AccountView.vue` — added a lightweight, summary-only organization panel below the existing account card: no-application/pending/rejected/approved/suspended, each with its own heading, message, and a link into `/become-organizer` or `/organizer` where relevant
- `src/features/auth/views/RegisterView.vue` — added translated copy clarifying that standard registration creates a volunteer account and that organization representatives can apply after registering, with a link to `/become-organizer` (which correctly bounces a logged-out visitor through Login with a safe redirect — satisfying "link to explanatory organizer information" without a separate info page)
- `src/locales/en/navigation.js`, `src/locales/el/navigation.js` — added `becomeOrganizer`/`applicationStatus` nav labels
- `src/locales/en/auth.js`, `src/locales/el/auth.js` — added `register.organizerNote`/`register.organizerNoteLink`
- `src/locales/index.js` — registered the new `becomeOrganizer` and `organizationTypes` locale namespaces

## Files Removed

None.

## Folder Structure

```
src/features/organizerApplication/
├── components/
│   └── OrganizationApplicationForm.vue
├── mocks/
│   └── organizationMembership.storage.js
├── services/
│   └── organizationApplication.service.js
├── stores/
│   └── organizationApplication.store.js
├── utils/
│   ├── applicationErrors.js
│   └── organizationMembership.js
├── views/
│   └── BecomeOrganizerView.vue
└── routes.js
```

Dependency direction: `organizerApplication` reads from `admin/mocks` (organizations storage — the Organization record IS the application) and `admin/utils` (`ORGANIZATION_STATUS`), and writes back into `auth/mocks/userRole.storage.js` indirectly via `admin/services/organizations.service.js`. In the other direction, `admin/services/organizations.service.js` now reads from `organizerApplication/mocks` (membership) and `auth/mocks` (role override) — the same "consult/mutate the authoritative owner across a feature boundary" pattern already established between `admin` and `auth`/`organizer` in the prior phase.

## Packages Installed

None. No Axios.

## Build Result

PASS — `npm run build` succeeded (592 modules transformed, no errors).

## Lint Result

PASS — `npm run lint`: 0 errors, 0 warnings.

## Test Result

No test script exists in `package.json` — none run.

## Manual Verification

Performed live in Chrome against the running dev server (`npm run dev`), jointly by me and the user, using `volunteer@onehelp.local` / `Volunteer123!`, `admin@onehelp.local` / `Admin123!`, and a freshly self-registered volunteer.

- **Registration stays volunteer-only**: `/register` shows no role selector; new explanatory copy ("Standard registration creates a volunteer account. Organization representatives can apply after registering:") renders correctly in Greek and English, with a working "Learn how to become an organizer" link.
- **Logged-out CTA redirect**: clicking that link while logged out correctly lands on `/login?redirect=/become-organizer`; logging in from there lands directly back on `/become-organizer` with the application form.
- **Submit a full application**: filled every field (name, type via `VSelect`, description, contact email, address, municipality, multi-select categories with closable chips, supporting message, confirmation checkbox) as `volunteer@onehelp.local` — submitted successfully, immediately showed the pending panel with the submitted date and a read-back summary; success notification and focus-to-heading (visible focus outline on the `tabindex="-1"` heading) both worked.
- **Pending survives refresh**: hard-reloading `/become-organizer` showed the identical pending panel and summary.
- **Appears in admin**: `/admin/organizations` correctly listed the new application card alongside all pre-existing seeded organizations, with the correct "Εκκρεμεί έγκριση"/pending badge, approve/reject actions, and the new organization's real categories/type rendered correctly — this is the exact code path the `getMergedOrganizations()` bug fix was required for.
- **Approve → organizer access**: approving as admin showed a success notification and flipped the card to Approved; a **fresh login** as that same volunteer immediately reflected the new `organizer` role (account menu reordered to Organizer area/Create action/Account/Logout; `/account` showed the organization summary + Organizer dashboard CTA; `/become-organizer` itself showed a distinct "approved" panel with a dashboard link) — no manual workaround needed since a fresh login always re-fetches the session.
- **Organizer functionality works**: created a real action end-to-end from `/organizer/actions/new` as the newly-approved organizer — succeeded and rendered the action's details page correctly.
- **Suspend blocks, doesn't demote**: admin-suspending the approved organization kept the user's role as `organizer` (no demotion) but blocked action creation with a clear, correctly translated inline alert from the existing `checkOrganizationGate()`; both `/account` and `/become-organizer` showed a distinct "suspended" explanation with no bypass path offered.
- **Restore fully recovers functionality**: admin-restoring the organization immediately let the same organizer create a new action successfully — verified end-to-end, not just by inspecting the flag.
- **Second real applicant (rejection/status-label path)**: registered a brand-new volunteer, submitted a second independent organization application via the compact account-menu entry point (confirmed the English nav label reads "Become an organizer" pre-submission and flips to "Application status" immediately after, in both the full and compact menus), confirming the label-swap logic reacts correctly to a just-created pending application. The admin-side reject dialog (required free-text reason field) was confirmed to open and function correctly on a seeded pending organization; the reason is stored and surfaced back on the application view via `rejectionReason`, and resubmission reuses the same record (`previousRejectionReason` preserved, `rejectionReason` cleared, status back to `pending`) — this path was verified in the applicant/admin's own end-to-end pass following the automation session.
- **Locale switching**: switched EL ⇄ EN mid-session on `/register`, `/become-organizer` (approved-panel state), and the account menu — every string translated correctly with no raw `t(...)` keys visible anywhere.
- **Console errors**: none observed across every flow exercised in this session.

**Not separately click-tested this session** (implemented and code-reviewed, exercised only in the applicant's own follow-up pass): the "edit while pending" in-place update path (`updatePendingApplication`) and the duplicate-active-application block (`ALREADY_HAS_ORGANIZATION`/`SUSPENDED` error codes) — both are single, well-isolated checks in `organizationApplication.service.js` (`findOwnedApplication`/`getOrganizationByOrganizerId`) shared by every entry point, so the already-verified submit/approve/reject/suspend/restore passes exercise the same underlying code.

## Remaining TODO

- Mobile-viewport rendering (bottom nav stays exactly 4 items; compact account menu layout) was verified by source inspection only in this session — the browser-automation tool's window resize did not visibly change the captured viewport, so an actual narrow-viewport screenshot pass is still worth doing by hand.
- No organization invitations or multiple-managers UI (intentionally out of scope this phase, per spec — the `manager` membership role is reserved in the constant for later).
- No document upload, identity verification, or email-verification workflow for applicants (intentionally out of scope, per spec).

## Suggested Next Feature

Organization invitations / multiple managers: the `MEMBERSHIP_ROLE.MANAGER` value already exists in the shared constant and the membership storage schema (`organizationId`, `userId`, `membershipRole`, `status`) was deliberately kept capable of more than one membership row per organization — a natural next phase would let an approved organization's owner invite additional users as managers with a scoped subset of organizer permissions, without changing the underlying data model.
