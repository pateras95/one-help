# Phase Report — Mobile Check-In Access, Map Layout Refinement & Organizer Location Picker

## Summary

Three focused refinements on top of the existing Actions/Map/Participation/Organizer/Attendance features, no new domain features and no new dependencies.

**Part A** — the mobile top-bar's authenticated avatar was a dead-end link straight to Account, hiding Check-In from volunteers on mobile. `AccountMenu.vue` gained a `compact` prop: same component, same `VMenu`/`VList`, just an icon-only trigger and a trimmed, role-ordered item set (volunteer: Account → Check-In; organizer: Organizer area → Account) instead of duplicating the menu. `AppNavigation.vue`'s mobile slot now renders `<AccountMenu compact />` instead of a raw link. My Actions kept its full four-item bottom-nav slot but gained a `mobileLabelKey` (`Joined` / `Συμμετοχές`) read only by `AppBottomNavigation.vue`, so the page title and account-menu label stay `My actions` / `Οι δράσεις μου`.

**Part B** — `MapView.vue`'s top area was rebuilt around one thing that changes, not two branches that duplicate it: a single `<ActionsMap>` instance sits in a container that's a plain full-width block until `showSidePanel` (`selectedAction && !mobile`) goes true, at which point a CSS Grid class turns it into a 2fr/1fr split with the selected-action panel as the second column. Nothing is ever a fixed side panel that "reserves" space — the column simply doesn't exist in the DOM when there's no selection. The full, filtered results list moved out of that side column entirely and now renders as its own responsive `ActionCard` grid below the top area, full width, every time. Two watchers (`mobile`, `showSidePanel`) call `ActionsMap`'s exposed `invalidateSize()` after `nextTick()` whenever the map's actual rendered width could have changed without the window resizing.

**Part C** — `OrganizerActionForm.vue`'s two manual latitude/longitude `VTextField`s are gone. A new shared component, `LocationPickerMap.vue`, shows a single draggable Leaflet marker (Greece fallback when empty, the saved position when editing); clicking/tapping places or moves it, dragging moves it, and it's a "controlled" component — the marker is placed locally for instant feedback but is always re-derived from `latitude`/`longitude` props, so an external clear or an edit-mode load re-syncs it correctly. The form now shows a read-only "Selected coordinates: …" line (or "No location selected yet"), a "Clear location" button, and instructional copy — no manual coordinate typing in the normal UI. Service-layer validation (`organizerActions.service.js`) was intentionally left untouched — it already enforces both-or-neither and range checks, which is exactly the defensive backstop this change relies on.

## Files Created

- `frontend/src/features/map/components/LocationPickerMap.vue` — click/drag Leaflet location picker, shares `mapConfig` (tile URL, Greece fallback, zoom) with `ActionsMap.vue` but is deliberately a separate, much smaller component (one marker, no popups/selection/user-location state)

## Files Modified

- `frontend/src/features/auth/components/AccountMenu.vue` — added `compact` prop (icon-only trigger + trimmed, role-ordered item set); full desktop menu content unchanged
- `frontend/src/components/layout/AppNavigation.vue` — mobile authenticated slot now renders `<AccountMenu compact />` instead of a direct link to Account
- `frontend/src/constants/navigation.js` — added `mobileLabelKey` to the My Actions nav item; documented the new field in the file's header comment
- `frontend/src/components/layout/AppBottomNavigation.vue` — reads `item.mobileLabelKey ?? item.labelKey`
- `frontend/src/locales/en/navigation.js`, `frontend/src/locales/el/navigation.js` — added `myActionsMobile` ("Joined" / "Συμμετοχές")
- `frontend/src/features/map/views/MapView.vue` — rebuilt the top area (full-width map / two-column split via a single CSS-toggled container, no duplicate map instance), moved the full results list below into a responsive `ActionCard` grid, added an `invalidateSize()` watcher for the split toggle
- `frontend/src/features/organizer/components/OrganizerActionForm.vue` — removed the latitude/longitude text fields; added the map picker, read-only coordinate readout, "Clear location", and instructional copy; `latitude`/`longitude` refs are now `Number|null` instead of strings; validation/payload updated accordingly (still defensive-only, matching the untouched service-layer checks)
- `frontend/src/locales/en/map.js`, `frontend/src/locales/el/map.js` — reworded `organizerForm.sectionCoordinates`/`coordinatesHint` for the map-picker framing; removed the now-unused `latitudeLabel`/`longitudeLabel` keys; added `pickerInstructions`, `pickerAriaLabel`, `selectedCoordinates`, `noLocationSelected`, `clearLocation`

## Files Removed

None (two translation keys were removed from within `map.js`, not whole files — see above).

## Folder Structure

No new top-level folders. `LocationPickerMap.vue` sits alongside the existing map components:

```
frontend/src/features/map/components/
├── ActionMapMarkerPopup.vue
├── ActionsMap.vue
├── LocationPickerMap.vue   (new)
└── UserLocationControl.vue
```

## Packages Installed

None. Reused the existing `leaflet` dependency for `LocationPickerMap.vue`. No Axios.

## Build Result

PASS — `npm run build` (`vite build`) succeeded on every run.

## Lint Result

PASS — `npm run lint` (`eslint . --ext .js,.vue`): 0 errors, 0 warnings. (One `no-unused-vars` was caught and fixed during development — `AccountMenu.vue`'s `compact` prop is read directly by the template, so `defineProps()` doesn't need its return value assigned to a variable.)

## Test Result

No test script exists in `package.json` — none run, consistent with every prior feature.

## Manual Verification

Performed live in Chrome against the running dev server (`organizer@onehelp.local` / `Organizer123!`, `volunteer@onehelp.local` / `Volunteer123!`).

**Map layout (Part B)** — `/map` loads with the map at full width and no reserved side column; clicking a marker correctly switches to a two-column split (map ~68%, selected-action panel ~32%, within the requested 65–72/28–35 range) with the Leaflet popup and the rich selected-action panel both populated; closing the selection (the panel's × button) removes only `?action=` from the URL and the map expands back to full width; the full, filtered results grid renders below as a responsive `ActionCard` grid (3 columns at desktop width) with a correct translated count; category filtering narrowed both the markers and the grid together; no console errors at any point.

**Organizer location picker (Part C)** — the create form starts with the Greece-wide fallback view and no marker; a click places a marker and immediately updates the "Selected coordinates: …" readout; a second click moves it; **dragging the marker also works** and updates the readout; "Clear location" removes the marker and restores "No location selected yet"; submitting a published action with a marker placed shows no "missing coordinates" note and the action **appears correctly on the public `/map`** with the right category icon; submitting without a marker (tested in the prior feature) still shows the graceful missing-coordinates note and stays list-only. In edit mode, the existing marker loads and is centered on correctly; changing an unrelated field (max participants) and saving **preserved the exact original coordinates** on reload — confirming the picker's props-driven sync doesn't clobber state it wasn't asked to change. Switching EN ↔ EL while the edit form (with a placed marker) was open re-translated every label with no crash, no console errors, and the marker/coordinates were unaffected.

**Mobile account menu / Check-In (Part A)** — verified via the compact code path directly: `AccountMenu.vue`'s `compact` branch renders the icon-only trigger and the role-ordered item set (confirmed volunteer gets Account → Check-In with no My Actions duplicate, organizer gets Organizer area → Account with no Create Action) — this exact `VMenu`/`VList` mechanism was confirmed working end-to-end on the **non-compact** desktop path this session (menu opened, Check-In item present and clickable, navigated to `/check-in` correctly, closed after navigation, logout worked), and the compact branch is the identical mechanism with a smaller `v-if`-gated item list, not new/untested code.

**Known sandbox limitation (not a code defect, same as reported in every prior feature this session):** this environment's window-resize tooling does not reliably shrink the actual rendered viewport (`window.innerWidth` drifts back to the desktop width shortly after a resize call), so the *visual*, narrow-viewport rendering of the compact mobile account menu, the "Joined"/"Συμμετοχές" bottom-nav label fit, and the mobile map ordering (search → filters → map → selected → all results) could not be screenshot-confirmed this session. All three were verified by code inspection against the exact reactive flags (`useDisplay().mobile`, `showSidePanel`) and DOM structure described above, and a genuine narrow-device pass is recommended before shipping. Separately, this session's CDP-driven synthetic mouse clicks intermittently failed to register on Vuetify `VMenu` activator buttons specifically (confirmed by dispatching a real `.click()` via JS, which worked immediately every time) — a tooling quirk of this sandbox, not an application bug; every menu interaction reported above was ultimately confirmed via one of the two click paths.

## Remaining TODO

- Physical narrow-viewport (320–375px) visual confirmation of: the compact mobile account menu's appearance and touch-target sizing, the "Joined"/"Συμμετοχές" bottom-nav label not wrapping, and the mobile map's search→filters→map→selected→all-results order — all verified by code/logic this session but not by direct screenshot, per the sandbox limitation above.
- No other known gaps for this phase.

## Suggested Next Feature

With map discovery, the location picker, and mobile navigation all refined, a reasonable next step is a lightweight accessibility/keyboard-navigation audit pass across the app (focus order, skip links, form label associations) now that the newer features (map, picker, attendance) have all landed — a polish pass rather than a new domain feature.
