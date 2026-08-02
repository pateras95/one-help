# Phase Report — Mock Action Participation & My Actions

## Summary

Built a full mocked participation flow on top of the existing Actions Discovery and Mock Authentication features: a feature-oriented `src/features/participation/` structure (mocks, service, Pinia store, utils, components, views), a stable `PARTICIPATION_STATUS` source of truth (`confirmed`/`cancelled` only), and `localStorage`-backed persistence under `onehelp.participations` with self-healing repair of malformed data (mirroring the fix already applied to auth sessions in the previous feature). Volunteers can now join or cancel an action from Action Details (Vuetify confirmation dialogs, no browser `confirm()`), see their own participation state reflected as a subtle indicator on Actions list cards, and manage their history on a real `/my-actions` page with Upcoming/Past/Cancelled tabs. Organizers see a clear, translated restriction message instead of a join flow. Guests get a "sign in to join" CTA that round-trips through `/login?redirect=...` back to the same action, reusing the redirect mechanism already built for auth. Participant counts are computed via a non-mutating "overlay" (base mock `registeredCount` + local confirmed records, capped at capacity) applied identically in `ActionCard.vue` and `ActionDetailsView.vue` so the two screens can never disagree. Mock action dates were converted from hardcoded absolute dates to a relative-date strategy (see below) so the fixture data doesn't silently go stale. No backend, JWT, real capacity locking, waiting lists, or organizer/admin tooling was touched.

**Chosen relative-date mock strategy:** all 13 actions in `actions.mock.js` now compute their `date` via a new `relativeDateString(days)` helper (`src/utils/date.js`) evaluated at module load time, instead of hardcoded ISO strings. Each action kept its original day-spacing relative to the date the mock data was originally authored (2026-08-01) — e.g. an action that was "9 days out" is now `relativeDateString(9)`, always 9 days from *today*, whenever "today" is. One action (`act-011`) is deliberately kept at `relativeDateString(-12)` so a "completed" action always exists to exercise that status. This means the fixture data never silently drifts into "everything is in the past" and needs no manual updates as real time passes.

## Files Created

- `frontend/src/utils/date.js` — `startOfDay`, `isPastDate`, `relativeDateString`; centralizes date-comparison logic previously duplicated inside `actions.service.js`
- `frontend/src/features/participation/utils/participationStatus.js` — `PARTICIPATION_STATUS` (`confirmed`/`cancelled`)
- `frontend/src/features/participation/utils/participationErrors.js` — `PARTICIPATION_ERROR` codes + `participationErrorKey()` fallback-safe i18n key mapper
- `frontend/src/features/participation/utils/participationCount.js` — `getLocalConfirmedCount()`, `withOverlaidCount()`
- `frontend/src/features/participation/mocks/participations.storage.js` — `readParticipations`/`writeParticipations`, validates and repairs `localStorage['onehelp.participations']`
- `frontend/src/features/participation/services/participation.service.js` — `getUserParticipations`, `getParticipation`, `isParticipating`, `joinAction`, `cancelParticipation`
- `frontend/src/features/participation/stores/participation.store.js` — in-memory participation state, reload-on-user-change via `watch`, `join`/`cancel`, `countVersion` cache-buster
- `frontend/src/features/participation/components/ParticipationPanel.vue` — Action Details sidebar panel (guest/organizer/confirmed/full/closed/join states, join & cancel dialogs)
- `frontend/src/features/participation/components/MyActionCard.vue` — per-participation card for the My Actions page
- `frontend/src/features/participation/views/MyActionsView.vue` — real My Actions page (Upcoming/Past/Cancelled tabs, loading/empty/error states, cancel dialog)
- `frontend/src/locales/el/participation.js`, `frontend/src/locales/en/participation.js` — full `participation.*` translation namespace

## Files Modified

- `frontend/src/features/actions/services/actions.service.js` — removed the private duplicated `startOfDay`, now imports date helpers from `@/utils/date`
- `frontend/src/features/actions/mocks/actions.mock.js` — all 13 `date` fields converted from hardcoded strings to `relativeDateString(N)`; header comment extended to document the strategy
- `frontend/src/features/actions/components/ActionCard.vue` — computes an overlaid `displayAction` (count + re-derived status) and a subtle "already joined" indicator for the current volunteer
- `frontend/src/features/actions/views/ActionDetailsView.vue` — computes the same overlaid `displayAction`; renders `<ParticipationPanel>` in the sidebar
- `frontend/src/locales/index.js` — registered the `participation` namespace (el/en)
- `frontend/src/features/auth/routes.js` — `/my-actions` route now points at `@/features/participation/views/MyActionsView.vue`

## Files Removed

- `frontend/src/features/auth/views/MyActionsView.vue` — superseded placeholder (the "coming soon" empty state), replaced by the real participation-feature view above

## Folder Structure

```
frontend/src/features/participation/
├── components/
│   ├── ParticipationPanel.vue
│   └── MyActionCard.vue
├── mocks/
│   └── participations.storage.js
├── services/
│   └── participation.service.js
├── stores/
│   └── participation.store.js
├── utils/
│   ├── participationStatus.js
│   ├── participationCount.js
│   └── participationErrors.js
└── views/
    └── MyActionsView.vue
```

`participation` imports from `actions` (`getActionById`) where needed; `actions` never imports from `participation` — overlay/count logic lives in the presentation layer (`ActionCard.vue`, `ActionDetailsView.vue`), not inside `actions.store.js`/`actions.service.js`.

## Packages Installed

None. No Axios, no new dependencies.

## Build Result

PASS — `npm run build` (`vite build`) succeeded, 425 modules transformed, no errors. `dist/` removed afterward per this project's convention of not leaving build artifacts around.

## Lint Result

PASS — `npm run lint` (`eslint . --ext .js,.vue`): 0 errors, 0 warnings.

## Test Result

No test script exists in `package.json` (`dev`, `build`, `preview`, `lint` only) — none run, consistent with every prior feature in this session.

## Manual Verification

**Not yet performed.** The dev server was started (`npm run dev`, `http://localhost:8082/`) and Chrome browser automation was about to begin when the user asked to defer manual testing to a later session and have the report finished now instead. The dev server has since been stopped.

Checklist still outstanding for the next verification pass:

- Logged-out visitor sees the "sign in to join" CTA on Action Details; login redirects back to the same action via `/login?redirect=/actions/<id>`.
- Volunteer join succeeds via the confirmation dialog; participant count increases on both Action Details and the Actions list card; the confirmed state persists across a refresh.
- Duplicate join attempt is rejected with the correct translated error.
- Volunteer cancel succeeds via its confirmation dialog; participant count decreases; the cancelled record appears under the My Actions "Cancelled" tab.
- A full action cannot be joined (shows the "full" state); an already-completed action shows the "unavailable" state instead of a join button.
- An organizer account sees the restriction message and never a join button.
- Logout clears participation state from memory immediately (no flash of the previous user's data), while `localStorage` still has the records for next login; switching between the two demo users shows only the active user's own records.
- Malformed `onehelp.participations` data is repaired rather than crashing the app.
- My Actions Upcoming/Past/Cancelled tabs filter correctly, including their distinct empty states; "View details" links navigate correctly; direct load and a hard refresh of `/my-actions` both work.
- Locale switching (and persistence after refresh) shows no untranslated `participation.*` keys anywhere touched by this feature.
- Mobile navigation still works; no console errors appear during any of the above.

## Remaining TODO

- The full manual verification checklist above — deferred to the next session at the user's request.
- No real capacity locking (two browser tabs joining the last spot simultaneously can both "succeed" locally, since this is a mock, single-client localStorage store) — explicitly out of scope for this phase.
- `checkedInAt` is reserved on the domain model shape in the task description but intentionally not implemented anywhere (no attendance/check-in flow yet).
- No waiting list, no organizer-side view of who joined their actions — both explicitly out of scope for this phase.

## Suggested Next Feature

Organizer Action Management: organizers currently only have a placeholder "coming soon" area (`OrganizerView.vue`). Now that volunteers can join/cancel actions, organizers viewing (and eventually creating/editing) their own actions — including a read-only participant list sourced from the same participation mock data — is the natural next step, and would exercise the `participation` feature's data from a second, still-mocked angle without needing any new persistence layer.
