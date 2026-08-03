# Phase Report — Layout, Action Cards, Directions & Admin Display Polish

## Summary

A focused stabilization pass with no new domain feature and no backend changes, split into six parts:

**Part A — Sticky footer.** `DefaultLayout.vue` now wraps its content in an `.oh-app-shell` flex column (`min-height: 100%`) with the routed content given `flex: 1 0 auto` and the footer left in normal document flow after it. This resolves against Vuetify's own `VMain` (`flex: 1 0 auto` inside the app's `min-height: 100dvh` column), which already stretches to fill the remaining viewport height on short pages — confirmed by reading the compiled `vuetify.css` before implementing, rather than guessing. `PageContainer.vue`'s now-redundant `min-height: 100%` rule was removed. No fixed-position footer, no route-specific min-heights were added.

**Part B — Consistent action cards.** `ActionCard.vue` and `OrganizerActionCard.vue` already used the `h-100 d-flex flex-column` + `mt-auto` pattern; both gained a 2-line title clamp to bound row-height variance further. `MyActionCard.vue` was the one component with a genuine gap (no stretch, no bottom anchoring) and was brought in line with the same pattern. `ActionsListView.vue` and `MapView.vue`'s results grid already reuse `ActionCard.vue` directly, so no separate markup needed fixing there.

**Part C — Google Maps directions.** New `src/features/map/utils/externalDirections.js` exports the single `buildDirectionsUrl(lat, lng)` used everywhere a "Directions" link is rendered — the key-less `https://www.google.com/maps/dir/?api=1&destination=...` scheme, `target="_blank"` + `rel="noopener noreferrer"`, translated accessible label, gated behind the existing `hasValidCoordinates()` check. Wired into `ActionDetailsView.vue`'s location card and `ActionMapMarkerPopup.vue`'s selected-action panel (used both in the full Map view and Map results). Deliberately not added to the public `ActionCard.vue` grid card, to avoid a second button undermining Part B's single-anchored-button consistency. No API key, no embedded map, no geolocation request, no internal route calculation — only the action's own coordinates are ever used.

**Part D — Admin owner display fallback.** `AdminOrganizationsView.vue` and `AdminActionsView.vue` no longer render empty `()`/blank strings for seeded records whose `organizerId` doesn't resolve to a registered mock account; they now show a neutral translated fallback (`admin.organizations.noLinkedOwner`, `admin.actions.noLinkedOwner`, `admin.actions.noLinkedOrganization`), with a warning icon/color distinguishing it from a normally-resolved owner. No identity is ever invented or auto-assigned.

**Part E — Admin action lifecycle editing.** Added a dedicated, activity-logged lifecycle-status transition control to `AdminActionsView.vue`, kept strictly separate from moderation status. The existing incomplete `organizerStatus`-handling branch inside `actionModeration.service.js`'s `updateActionDetails` (which skipped the organization gate and the past-date guard, and never logged) was removed — it was dead code in practice, since `OrganizerActionForm.vue` only emits `organizerStatus` in create mode, never in the admin's edit mode. A new `changeActionLifecycleStatus(adminUserId, actionId, status)` reuses the organizer's own `changeOrganizerActionStatus` (passing the action's own `organizerId`) so the transition graph, the organization approval/suspension gate, and the closed→published past-date guard are enforced identically to the organizer path, adding only the activity-log entry (new `ACTION_LIFECYCLE_CHANGED` type). The UI mirrors `OrganizerActionCard.vue`'s transition menu (`allowedNextStatuses`, filtered for past-date republish) and reuses `StatusTransitionDialog.vue` as-is — its copy is already generic ("Do you want to publish...") and needed no admin-specific variant.

**Part F — Visual consistency.** Vuetify's global `VBtn` default (`rounded: 'lg'`) already gives every button consistent corner radius app-wide, so no change was needed there. The single/dual primary-CTA buttons on public-facing surfaces (`ParticipationPanel.vue`'s sign-in/join/cancel, `ActionCard.vue`'s "View details", `MyActionCard.vue`'s "View details"/"Cancel participation", `ActionMapMarkerPopup.vue`'s "View details"/"Directions") were bumped to `size="large"` (44px) for touch-target compliance, since they have room as `block` or paired buttons. Dense multi-action rows (`OrganizerActionCard.vue`, `AdminActionsView.vue`, `ActionDetailsView.vue`'s map/directions links) were deliberately left at `size="small"`/default — enlarging those would overcrowd rows that already carry 4–6 actions, consistent with the "not overcrowd" judgment call already made in Part C.

**i18n.** Added all locale keys this feature's code referenced: `map.selected.directions`/`directionsAriaLabel`, `map.actionDetails.directions`/`directionsAriaLabel`, `admin.organizations.noLinkedOwner`, `admin.actions.noLinkedOwner`/`noLinkedOrganization`, `admin.actions.lifecycleMenuLabel`/`lifecycleMenuAriaLabel`, `admin.activity.entries.actionLifecycleChanged` — in both `el` and `en`. A scripted sweep of every static `t('...')` call site in `src/features`, `src/components`, and `src/layouts` against both locale trees confirmed 0 missing keys before finalizing (this caught that Part D's fallback keys had been referenced in code but never actually added to the locale files — fixed as part of this pass).

## Files Created

- `src/features/map/utils/externalDirections.js` — single shared Google Maps directions URL builder

## Files Modified

- `src/layouts/DefaultLayout.vue` — sticky-footer flex shell
- `src/components/layout/PageContainer.vue` — removed now-redundant sizing style
- `src/features/actions/components/ActionCard.vue` — title clamp, large primary button
- `src/features/participation/components/MyActionCard.vue` — stretch/anchor pattern, title clamp, large buttons
- `src/features/organizer/components/OrganizerActionCard.vue` — title clamp
- `src/features/map/components/ActionMapMarkerPopup.vue` — Directions button, large buttons
- `src/features/actions/views/ActionDetailsView.vue` — Directions button alongside "open full map"
- `src/features/admin/views/AdminOrganizationsView.vue` — neutral owner fallback display
- `src/features/admin/views/AdminActionsView.vue` — organization/owner fallback display, lifecycle-status transition menu + dialog wiring
- `src/features/admin/services/actionModeration.service.js` — removed incomplete lifecycle branch from `updateActionDetails`; added `changeActionLifecycleStatus`
- `src/features/admin/utils/activityLogTypes.js` — added `ACTION_LIFECYCLE_CHANGED`
- `src/features/admin/utils/activityDescribe.js` — translates the new entry's `status` metadata at render time
- `src/features/admin/stores/adminActions.store.js` — added `changeLifecycleStatus` action
- `src/features/participation/components/ParticipationPanel.vue` — large primary/destructive CTA buttons
- `src/locales/el/map.js`, `src/locales/en/map.js` — Directions copy
- `src/locales/el/admin.js`, `src/locales/en/admin.js` — owner-fallback copy, lifecycle-menu copy, activity-log entry copy

## Files Removed

None.

## Folder Structure

No new folders — `externalDirections.js` was added to the existing `src/features/map/utils/` directory.

## Packages Installed

None.

## Build Result

`npm run build` — succeeded, no errors.

## Lint Result

`npm run lint` (`eslint . --ext .js,.vue`) — clean, no errors or warnings.

## Test Result

No test script exists in `package.json` (Vitest is permanently excluded per project rules) — none run.

## Manual Verification

Performed in Chrome against the dev server (`localhost:5173`):

- **Footer:** verified sticks to the viewport bottom on short-content pages — Home, Unauthorized, Not Found, empty My Actions — with no route-specific overrides; confirmed no horizontal overflow (`scrollWidth === clientWidth`) on Home.
- **Action cards:** Actions list and Map results grid (both reuse `ActionCard.vue`) show equal-height cards with the enlarged "View details" button anchored to the bottom of every card in a row, regardless of description length. Joined a live action as a volunteer and confirmed `MyActionCard.vue` renders both the "View details" and "Cancel participation" buttons at the same enlarged height with correct tonal-primary/outlined-destructive hierarchy.
- **Directions:** on Action Details (`/actions/act-001`, has valid coordinates), the Directions link resolves to `https://www.google.com/maps/dir/?api=1&destination=...`, with `target="_blank"`, `rel="noopener noreferrer"`, and a populated `aria-label` — confirmed programmatically. Same confirmed in the Map page's selected-action panel (both "View details" and "Directions" render stacked at matching enlarged heights). No geolocation prompt is triggered anywhere in this flow.
- **Admin owner fallback:** `/admin/actions` and `/admin/organizations` now show "No linked account" / "No linked organization" (EL: «Χωρίς συνδεδεμένο λογαριασμό» / «Χωρίς συνδεδεμένη οργάνωση») for seeded records with no resolvable user, instead of empty parentheses; real organizer names still resolve correctly where the fixture data supports it.
- **Admin lifecycle transitions:** logged in as `admin@onehelp.local` and, on `/admin/actions`, opened the new "Status" menu on a `closed` action — only "Republish" was offered (correctly filtered — the action's date was still in the future); confirmed via the reused `StatusTransitionDialog`, then confirmed the transition. The action's chip updated to "Published" immediately, a success toast appeared, and it correctly reappeared in the public `/actions` list. Checked `/admin/activity` and confirmed a new entry: "Changed the status of the action «...» to Published", with a real, non-fabricated timestamp. Verified a `draft` action's menu offers exactly Publish/Cancel, and that a `cancelled` action has no Status menu at all (no allowed transitions), matching the transition graph. Could not exercise the organization-suspended gate live — the one suspended fixture organization ("Παλιά Ομάδα Εθελοντών Σερρών") has zero actions in the fixture data — but the gate logic itself is not new code; it is the exact `checkOrganizationGate` already exercised and verified in the organizer's own flow in a prior phase, only reused here.
- **Locale switching:** switched EL ⇄ EN on the Map page and Actions list — all new strings translate correctly, no raw i18n keys rendered. A scripted static-key audit against both locale trees (`el`/`en`) confirmed 0 missing keys across `src/features`, `src/components`, and `src/layouts`.
- **Console:** no console errors observed across any of the above navigation and interaction sequences.
- Not separately re-verified this session: an explicit narrow-viewport (mobile) resize of the browser window — the browser automation tool's window resize did not change the effective viewport in this environment. This is a low-risk gap: Part F's changes are limited to Vuetify's `size` prop, which is not breakpoint-dependent, and the underlying equal-height/mobile-card-layout behavior (Part B) was unchanged by this pass and was already verified on mobile in an earlier phase of this same feature.

## Remaining TODO

None outstanding for this feature.

## Suggested Next Feature

A lightweight "certificates/exports/payments/donations" area was previously and remains permanently excluded (see `CLAUDE.md`). A reasonable next step would be a **notifications/reminders pass** (e.g. an in-app reminder banner for an upcoming joined action, or a "capacity almost full" indicator on organizer's own dashboard) — a small, self-contained UX improvement that doesn't touch backend, payments, or the excluded feature list.
