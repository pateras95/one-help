# Phase Report — Organizer Action Management

## Summary

Built a full mocked organizer workspace on top of the existing Actions Discovery and Participation features: a feature-oriented `src/features/organizer/` structure (mocks, service, Pinia store, utils, components, views, routes), a stable `ORGANIZER_ACTION_STATUS` lifecycle (`draft`/`published`/`closed`/`cancelled`) kept distinct from `PARTICIPATION_STATUS`, and `localStorage`-backed persistence under `onehelp.organizer.actions` for organizer-created and organizer-edited actions, merged non-destructively over the immutable `actions.mock.js` fixture. Organizers can now see a real dashboard (summary cards + action cards with quick actions), create/edit actions through one shared bilingual form, move actions through a validated status-transition graph with confirmation dialogs, and view a read-only, identity-safe participant list per action. The public Actions feature was extended with a fourth visibility state (`closed`) and now reads through the same merged action set, so organizer creates/edits/status-changes are reflected publicly immediately, following one explicit visibility policy (see below). No backend, image upload, maps, QR, attendance, or admin moderation was touched.

**Chosen visibility policy:** `draft` → hidden from public discovery and direct-URL access (reads as "not found", same UX as a genuinely missing action). `published` → visible and joinable if capacity allows. `closed` → visible, but never joinable, with its own distinct "the organizer has closed participation" message (not conflated with "this action already took place"). `cancelled` → hidden from public discovery and direct-URL access, same as draft. This matches the spec's recommended policy exactly.

**Chosen create/edit flow:** one shared `OrganizerActionFormView.vue` handles both `/organizer/actions/new` and `/organizer/actions/:actionId/edit` (mode inferred from the presence of `:actionId`), rendering the same `OrganizerActionForm.vue` component either empty or preloaded. Both create and edit redirect to the organizer's action **details** page on success (not back to the dashboard), so the organizer immediately sees the saved result, including its current public-visibility state, in one place.

**Ownership model:** actions gained a stable `organizerId` field (never an embedded organizer object, never a name string) plus an `organizerStatus` lifecycle field. The demo organizer (`user-organizer-001`) owns exactly 4 actions, one per lifecycle status (`act-001` published, `act-008` draft, `act-012` closed, `act-013` cancelled); the remaining 9 mock actions keep their original visible organization names but are assigned to distinct fictional `org-ext-*` ids (not all the same one) representing organizations that use the platform without a demo login of their own.

## Files Created

- `frontend/src/features/organizer/utils/organizerActionStatus.js` — `ORGANIZER_ACTION_STATUS`, `PUBLIC_VISIBLE_STATUSES`, `canTransition()`, `allowedNextStatuses()`
- `frontend/src/features/organizer/utils/organizerActionErrors.js` — `ORGANIZER_ACTION_ERROR` codes + `organizerActionErrorKey()`
- `frontend/src/features/organizer/utils/localizeField.js` — picks the active locale's text from a bilingual `{el, en}` field (organizer views keep raw bilingual records, unlike the public feature)
- `frontend/src/features/organizer/mocks/organizerActions.storage.js` — `readOrganizerActions`/`writeOrganizerActions`/`upsertOrganizerAction` (validates + repairs `onehelp.organizer.actions`), `getMergedActions()` (base fixture + persisted overrides/creates, never mutates the fixture)
- `frontend/src/features/organizer/services/organizerActions.service.js` — `getOrganizerActions`, `getOrganizerActionById`, `createOrganizerAction`, `updateOrganizerAction`, `changeOrganizerActionStatus`, `getOrganizerActionParticipants`
- `frontend/src/features/organizer/stores/organizer.store.js` — organizer's actions/selected action/participants, reload-on-user-change, stale-write guards (logout mid-save)
- `frontend/src/features/organizer/components/StatusTransitionDialog.vue` — shared publish/close/cancel/republish confirmation dialog
- `frontend/src/features/organizer/components/OrganizerActionCard.vue` — dashboard card (status chip, capacity/confirmed, date, quick-actions menu)
- `frontend/src/features/organizer/components/OrganizerActionForm.vue` — shared create/edit bilingual form with client-side validation
- `frontend/src/features/organizer/views/OrganizerDashboardView.vue`, `OrganizerActionFormView.vue`, `OrganizerActionDetailsView.vue`, `OrganizerParticipantsView.vue`
- `frontend/src/features/organizer/routes.js`
- `frontend/src/locales/el/organizer.js`, `frontend/src/locales/en/organizer.js`

## Files Modified

- `frontend/src/features/actions/mocks/actions.mock.js` — added `organizerId` + `organizerStatus` to all 13 actions; extended header doc comment
- `frontend/src/features/actions/services/actions.service.js` — reads `getMergedActions()` instead of `MOCK_ACTIONS` directly; filters to `PUBLIC_VISIBLE_STATUSES`; `computeStatus` now returns `closed` when `organizerStatus === 'closed'`, independent of date/capacity
- `frontend/src/features/actions/components/ActionCard.vue` — `closed` status color; local status recomputation now preserves `closed` (previously only preserved `completed`)
- `frontend/src/features/actions/views/ActionDetailsView.vue` — same `closed`-preservation fix as `ActionCard.vue`
- `frontend/src/features/participation/components/ParticipationPanel.vue` — split the old single `isClosed` branch into `isCompleted` (date passed) and `isOrganizerClosed` (organizer closed it), each with distinct copy — **bug found and fixed during manual verification**: a closed-but-still-future action was showing "this action has already taken place," which is factually wrong
- `frontend/src/features/participation/services/participation.service.js` — added `getActionParticipants(actionId)` (all records for one action, across users; used by the organizer participant list)
- `frontend/src/features/auth/services/auth.service.js` — added `getUserById(userId)` (sanitized lookup, never a password; used to resolve participant identity)
- `frontend/src/features/auth/routes.js` — removed the old `/organizer` placeholder route (superseded by `organizerRoutes`)
- `frontend/src/features/auth/components/AccountMenu.vue` — added "Create action" item for organizers
- `frontend/src/router/routes/public.routes.js` — registered `organizerRoutes`
- `frontend/src/constants/routes.js` — `ORGANIZER_NEW_ACTION`; `organizerActionDetailsPath`/`organizerActionEditPath`/`organizerActionParticipantsPath` helpers
- `frontend/src/locales/index.js` — registered the `organizer` namespace
- `frontend/src/locales/el/navigation.js`, `en/navigation.js` — added `createAction` label
- `frontend/src/locales/el/actions.js`, `en/actions.js` — added `status.closed`
- `frontend/src/locales/el/participation.js`, `en/participation.js` — added `cta.closedTitle`/`cta.closedMessage`

## Files Removed

- `frontend/src/features/auth/views/OrganizerView.vue` — superseded "coming soon" placeholder, replaced by `OrganizerDashboardView.vue`

## Folder Structure

```
frontend/src/features/organizer/
├── components/
│   ├── OrganizerActionCard.vue
│   ├── OrganizerActionForm.vue
│   └── StatusTransitionDialog.vue
├── mocks/
│   └── organizerActions.storage.js
├── services/
│   └── organizerActions.service.js
├── stores/
│   └── organizer.store.js
├── utils/
│   ├── organizerActionStatus.js
│   ├── organizerActionErrors.js
│   └── localizeField.js
├── views/
│   ├── OrganizerDashboardView.vue
│   ├── OrganizerActionFormView.vue
│   ├── OrganizerActionDetailsView.vue
│   └── OrganizerParticipantsView.vue
└── routes.js
```

Dependency direction: `organizer` imports from `actions` (base fixture + merge target), `participation` (`getActionParticipants`, `getLocalConfirmedCount`) and `auth` (`getUserById`) — all read-only compositions of existing services, mirroring how `participation` already composes `actions`. The one deliberate exception to the earlier one-way-dependency convention is `actions.service.js` importing `getMergedActions` from `organizer/mocks` — required so organizer creates/edits are reflected in the public list/details; this is a pure data-merge function with no organizer business logic (validation, transition rules) attached, so `actions` still never depends on organizer's service or store.

## Packages Installed

None. No Axios, no new dependencies.

## Build Result

PASS — `npm run build` (`vite build`) succeeded, 450 modules transformed, no errors. `dist/` removed afterward.

## Lint Result

PASS — `npm run lint` (`eslint . --ext .js,.vue`): 0 errors, 0 warnings (one unused-import error was caught and fixed during development).

## Test Result

No test script exists in `package.json` — none run, consistent with every prior feature in this session.

## Manual Verification

Performed live in Chrome against the running dev server, using `organizer@onehelp.local` / `Organizer123!` and `volunteer@onehelp.local` / `Volunteer123!`.

- **Dashboard**: loads correctly for the organizer; summary cards (4 total / 1 published / 1 draft / 34 confirmed) matched the seeded data exactly (sum of each owned action's `registeredCount`); all 4 lifecycle statuses rendered with correct chips and quick-action menus (draft → Publish/Cancel only; published → Close/Cancel; closed → Republish only, and only because its date was still in the future; cancelled → no transitions, matching "no automatic restoration").
- **Ownership isolation**: only the 4 demo-organizer-owned actions appeared on the dashboard; navigating directly to another organizer's action (`/organizer/actions/act-002`) correctly showed the "not found or not yours" empty state rather than leaking data.
- **Create flow**: created a published action end-to-end (all fields, category dropdown, native date/time inputs, comma-separated equipment) — success notification shown, redirected to the new action's organizer details page, and the action appeared correctly on the public `/actions` list under search. Also created a second action as **draft** and confirmed it did *not* appear in public search results.
- **Edit flow**: opened an existing action's edit form and confirmed every field preloaded correctly (including the bilingual equipment lists rendered back as comma-joined text); the "initial status" section was correctly absent in edit mode.
- **Capacity validation**: setting capacity to `0` was rejected client-side ("must be greater than zero"); setting capacity below the actual confirmed-participant count (14, on an action with real confirmed participants) was rejected with the exact count interpolated into the message, both before and after actually saving.
- **Status transitions**: Publish (draft → published), Close (published → closed), Republish (closed → published, date-gated), and Cancel (published → cancelled, with an existing confirmed participant present) all worked — each showed its confirmation dialog with the correct action title, a translated success notification, and an immediately updated status chip / summary counts / public visibility.
- **Public integration**: a published action appears on the public list with the correct count; a closed action is publicly visible with a **distinct** "closed" chip and, on Action Details, a distinct "the organizer has closed participation" message (this is the bug found and fixed — see below); a cancelled action returns the standard "not found" empty state on direct URL access, identical to a truly nonexistent id.
- **Participant list**: correctly distinguishes the base mock `registeredCount` (no identity, not real records) from actual `localStorage`-backed participation records — an action with "14 confirmed" showed **0** rows until a real join happened, then showed exactly one row with correct initials, full name, email, status chip, and joined-date, with no password field anywhere.
- **Role boundaries**: organizer visiting `/my-actions` (and vice versa, volunteer visiting `/organizer`) both correctly redirect to `/unauthorized`.
- **Storage safety**: set `onehelp.organizer.actions` to invalid JSON, reloaded — the app did not crash, the dashboard fell back cleanly to the base fixture data, and the corrupted value was confirmed rewritten to `[]`. (Side effect, expected and not a bug: this also reverted the test edits/creates made earlier in the same session, since they only ever lived in that one now-repaired key — consistent with how the same repair-on-read pattern behaves in the auth and participation features.)
- **Locale switching**: switched to English and back — dashboard, create form, and participant list all fully translated with no raw keys spotted; locale persisted correctly across logout/login and navigation.
- **Mobile navigation**: verified via source inspection (`constants/navigation.js`'s `AUTHENTICATED_MOBILE_NAVIGATION[ROLES.ORGANIZER]`, unchanged by this feature) rather than a physical narrow viewport — same sandbox resize-floor limitation noted in every prior feature report in this session; the array still contains exactly 4 items (Home/Actions/Organizer/Account), and "Create action" was deliberately kept out of it, reachable only from the dashboard's own button and the desktop account menu.
- **Console errors**: none observed across the full session (checked via `read_console_messages`, only Vite HMR debug logs present).

### Bug found and fixed

`ParticipationPanel.vue`'s "action unavailable" branch originally treated organizer-`closed` actions identically to date-`completed` ones, showing "this action has already taken place" for an action that was closed early but whose date was still weeks in the future. Split into two branches (`isCompleted` / `isOrganizerClosed`) with distinct, accurate copy in both locales.

## Remaining TODO

- Editing an existing action whose `municipality` genuinely differs between Greek and English (a handful of the original 13 fixture actions have distinct `el`/`en` city names) will collapse both to the single value typed into the edit form's one "City / municipality" field — this follows the spec's literal form-field list (which asks for one municipality field, unlike the explicitly bilingual location-name fields), but is worth knowing if an organizer edits one of those specific actions.
- No real concurrent-capacity locking or organizer-vs-organizer race protection — accepted limitation of the single-client mock architecture, same as the participation feature.
- Physical narrow-viewport confirmation of the mobile bottom nav is still only source-verified, per the sandbox limitation above.

## Suggested Next Feature

QR Check-In / Attendance: `CLAUDE.md` already describes this as a planned frontend milestone, and organizers now have real actions with real participant lists to check in against — the participant list built here (`OrganizerParticipantsView.vue`) is a natural foundation for a future "mark attended" flow, without needing any new persistence layer beyond what already exists.
