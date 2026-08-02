# Phase Report — Actions Map & Nearby Discovery

## Summary

Built a public Actions Map feature on top of the existing Actions Discovery/Details, Organizer Action Management, and mock-auth features, following `docs/frontend/map-strategy.md`: Leaflet + configurable OpenStreetMap raster tiles (no Google Maps, no geocoding, no paid provider), a new `src/features/map/{components,composables,utils,views}` structure, and a `src/config/map.js` config object (tile URL from `VITE_MAP_TILE_URL`, zoom/center defaults, Greece fallback, and a documented-but-unused `clusteringThreshold`). A new public `/map` route reuses the existing `useActionsStore()` and its category/search/date filters directly (no parallel filtering system, no second mock dataset) and adds a client-side-only "status" filter and Haversine-based "near me" distance sort. Query-param sync (`?category=`, `?search=`, `?action=`) makes marker selections and filters shareable/back-forward-safe. Leaflet's own marker popup stays minimal (title + category, plain escaped HTML) while the full rich, accessible "selected action" content lives in a genuine Vue component (`ActionMapMarkerPopup.vue`) rendered outside Leaflet's DOM — this doubles as the required textual accessibility fallback. A compact (180px) mini-map was added to Action Details, replacing the old "map coming later" placeholder note, with a graceful textual-only fallback for actions without coordinates. Organizers can now set optional `latitude`/`longitude` on the create/edit form, with both-or-neither + range validation on both the form and the service layer; a bug in the existing `organizerActions.service.js` (edits could never actually change coordinates, and create silently discarded them) was found and fixed as part of this work. No backend, geocoding, clustering, driving directions, continuous location tracking, or any of the permanently excluded features (certificates, exports, payments, donations) were implemented or suggested.

**Chosen navigation configuration** (Section 3): Map was added to `NAVIGATION_ITEMS` (desktop/tablet nav, between Actions and About) and to every role's mobile bottom-nav set, each kept at exactly 4 items:
- **Guest (mobile):** Home, Actions, Map, About — Contact moved to desktop-only to make room.
- **Volunteer (mobile):** Home, Actions, Map, My Actions.
- **Organizer (mobile):** Home, Actions, Map, Organizer.
- **Account** was dropped from every mobile set but remains reachable via the top app bar's account menu on all breakpoints (`AppNavigation.vue` was not changed).

**Bug found and fixed during verification:** `ActionsMap.vue`'s scoped style hardcoded `min-height: 320px` on its map container. This is harmless for the full `/map` page (whose wrapper is always ≥560px), but it silently overrode the Action Details mini-map's intended 180px height, rendering a 320px map instead. Removed the hardcoded `min-height` so every consumer's own wrapper fully controls height; re-verified the mini-map now renders at exactly 180px.

## Files Created

- `frontend/src/config/map.js` — tile URL (env-driven), attribution, zoom/center defaults, Greece fallback, reserved clustering threshold
- `frontend/src/features/map/routes.js` — public `/map` route
- `frontend/src/features/map/utils/mapCoordinates.js` — `hasValidCoordinates()`, `withValidCoordinates()` (dev-only warning on drop)
- `frontend/src/features/map/utils/distance.js` — `haversineDistanceKm()`, `formatDistance()`
- `frontend/src/features/map/composables/useUserLocation.js` — one-time, click-triggered Geolocation lookup with a stable state enum
- `frontend/src/features/map/components/ActionsMap.vue` — the only Leaflet-DOM-touching component (markers, user-location marker, popups, tile-error signal, lifecycle-safe mount/unmount)
- `frontend/src/features/map/components/ActionMapMarkerPopup.vue` — rich, accessible "selected action" panel (outside Leaflet's DOM)
- `frontend/src/features/map/components/UserLocationControl.vue` — "Near me" button + translated feedback for every geolocation state
- `frontend/src/features/map/views/MapView.vue` — the `/map` page: filters, results panel, query sync, responsive layout
- `frontend/src/locales/el/map.js`, `frontend/src/locales/en/map.js` — full Greek/English translations for the feature

## Files Modified

- `frontend/.env.example` — added `VITE_MAP_TILE_URL` with a documented dev/MVP-only OSM default
- `frontend/package.json`, `frontend/package-lock.json` — added `leaflet`
- `frontend/src/constants/routes.js` — added `ROUTES.MAP`
- `frontend/src/constants/navigation.js` — added Map to desktop nav and every role's mobile bottom-nav set (see navigation configuration above)
- `frontend/src/locales/el/navigation.js`, `frontend/src/locales/en/navigation.js` — added the `map` nav label
- `frontend/src/locales/index.js` — registered the `map` locale namespace
- `frontend/src/router/routes/public.routes.js` — registered `mapRoutes`
- `frontend/src/features/actions/views/ActionDetailsView.vue` — replaced the old map placeholder note with a real mini-map section (or graceful textual fallback), plus an "Open full map" link to `/map?action=<id>`
- `frontend/src/locales/el/actions.js`, `frontend/src/locales/en/actions.js` — removed the now-obsolete `details.mapPlaceholder` key
- `frontend/src/features/organizer/components/OrganizerActionForm.vue` — added optional latitude/longitude fields (prefill, both-or-neither + range validation, included in submit payload)
- `frontend/src/features/organizer/services/organizerActions.service.js` — added coordinate validation to `validatePayload()`; fixed `createOrganizerAction()` (previously hardcoded `latitude`/`longitude` to `null`) and `updateOrganizerAction()` (previously omitted coordinates entirely, so edits could never change them)
- `frontend/src/features/organizer/utils/organizerActionErrors.js` — added `INVALID_COORDINATES` error code
- `frontend/src/locales/el/organizer.js`, `frontend/src/locales/en/organizer.js` — added the `invalidCoordinates` error translation
- `frontend/src/features/organizer/views/OrganizerActionDetailsView.vue` — added a "map placement unavailable" note for published actions without coordinates

## Files Removed

None.

## Folder Structure

```
frontend/src/features/map/
├── components/
│   ├── ActionsMap.vue
│   ├── ActionMapMarkerPopup.vue
│   └── UserLocationControl.vue
├── composables/
│   └── useUserLocation.js
├── utils/
│   ├── distance.js
│   └── mapCoordinates.js
├── views/
│   └── MapView.vue
└── routes.js
```

Dependency direction: `map` reuses `actions/stores/actions.store.js` and `actions/components/ActionCard.vue` directly (no parallel store or dataset), plus `constants/actionCategories.js` and `constants/routes.js`. `actions/views/ActionDetailsView.vue` and `organizer/views/OrganizerActionDetailsView.vue` now import from `map/utils` and `map/components` (the mini-map); `map` itself has no reverse dependency on `organizer` or `actions/views`.

## Packages Installed

- `leaflet` (^1.9.4) — zero-dependency map library, confirmed via `npm install` ("0 vulnerabilities")

No other dependencies added. No Axios. No geocoding, clustering, or paid map provider libraries.

## Build Result

PASS — `npm run build` (`vite build`) succeeded on every run, including the final run after the mini-map height fix. No errors.

## Lint Result

PASS — `npm run lint` (`eslint . --ext .js,.vue`): 0 errors, 0 warnings, on every run.

## Test Result

No test script exists in `package.json` — none run, consistent with every prior feature in this session.

## Manual Verification

Performed live in Chrome against the running dev server (`organizer@onehelp.local` / `Organizer123!` for organizer flows).

- **Map loads & markers**: `/map` renders 11 category-colored pin markers (teardrop `div` icons with an MDI glyph, never color-only) over an OSM tile layer with visible attribution; results panel shows all matching actions with a translated count.
- **Marker selection**: clicking a marker opens Leaflet's minimal popup (title + category) *and* populates the rich `ActionMapMarkerPopup.vue` panel with description, date, location, organizer, participants, and a "View details" link; the URL updates to `?action=act-XXX`.
- **Closing selection**: the panel's close button clears only the `action` query param, leaving category/search intact; the Leaflet popup itself closes independently (its own native `×`), as expected.
- **Category filter**: selecting "Environment" correctly narrowed to 2 actions, updated `?category=environment`, refit the map bounds, and showed a working "Reset filters" button.
- **Query sync — direct deep link**: loading `/map?action=act-002` directly opens with the marker's popup already open and the panel already populated (data-not-yet-loaded-at-mount case handled correctly).
- **Invalid query values**: `?category=not-a-real-category&action=nonexistent-id` — the invalid category was silently ignored (same behavior as the existing Actions list page for an invalid category), and the invalid `action` id was automatically stripped from the URL once data loaded, with no console errors.
- **Browser back/forward**: selecting marker A, then marker B, then navigating back correctly restored `?action=` to marker A and reopened its popup/panel.
- **Locale switch with popup open**: switched EN → EL while a marker's popup and panel were open — nav, filters, result count, marker popup, and the selected-action panel all re-translated correctly with no crash or stale text (Leaflet popups are rebuilt on locale change since their HTML is baked in at build time).
- **No-coordinates edge case**: created a new organizer action with blank latitude/longitude, published it — confirmed it appears fully in the public Actions list and in the Map's results panel, but produces **zero** map markers; the map correctly falls back to the Greece-wide view, and a clear "no actions with a map location yet" empty-state note appears (distinct from the generic "no results" state) instead of a broken/blank map.
- **Action Details mini-map**: `/actions/act-002` shows a compact (180px) map with a single marker, the location text, and an "Open full map" link to `/map?action=act-002`, which correctly deep-links into the full map with the same action selected.
- **Organizer coordinate fields — prefill**: editing an existing action showed its real latitude/longitude prefilled in the new fields.
- **Organizer coordinate fields — both-or-neither validation**: clearing only longitude and saving correctly blocked the submit with a translated error on both fields.
- **Organizer coordinate fields — range validation**: entering `200` for longitude correctly showed "Longitude must be between -180 and 180" (Greek: "μεταξύ -180 και 180").
- **Organizer coordinate fields — persistence**: changed a valid latitude, saved, reloaded the edit form — the new value was actually persisted (this directly exercises the `updateOrganizerAction()` fix; before the fix, saved edits would have silently reverted to the original coordinates on next load).
- **Organizer "missing coordinates" note**: the newly created, published, coordinate-less action showed the translated "this action has no coordinates, so it won't appear on the map" note on its organizer details page.
- **Console errors**: none observed at any point in this session (`read_console_messages`, filtered for errors, after every major interaction).

**Known sandbox limitations (not code defects):**
- **Geolocation permission prompt**: clicking "Near me" correctly enters the loading state and calls `navigator.geolocation.getCurrentPosition`, but Chrome's native permission prompt is outside the page DOM and this automated browser session has no way to click "Allow"/"Block" on it, so the `success`/`denied`/`timeout` branches could not be click-tested end-to-end in this session. All four states (`loading`, `denied`, `timeout`, `unavailable`) were code-reviewed against the documented Geolocation API error contract (`PERMISSION_DENIED`, `TIMEOUT`, other → `unavailable`) and each renders its own translated message via `role="status"`.
- **Mobile viewport**: as in every prior feature report this session, this sandbox's window-resize tooling does not reliably shrink the actual rendered viewport the screenshot tool captures (confirmed via `window.innerWidth` readings drifting back to the desktop width shortly after a resize call), so the mobile-breakpoint layout (compact filter accordion, stacked map/list, bottom-nav-safe spacing) could not be visually screenshot-confirmed. It was verified by code inspection: `MapView.vue` branches on the same `useDisplay().mobile` flag and the identical `VExpansionPanels` filter-accordion pattern already shipped and working in `ActionsListView.vue`, and it never sets a fixed/absolute-positioned element that could defeat `DefaultLayout.vue`'s existing bottom-nav spacing reservation.

## Remaining TODO

- Manual click-testing of the "Near me" success/denied/timeout states, blocked by the sandbox's native permission-prompt limitation above — recommend a manual pass on a real device/browser before shipping.
- Physical narrow-viewport confirmation of the map's mobile layout, blocked by the same resize-tooling limitation noted in every prior feature report this session.
- No marker clustering — correctly out of scope per the spec (13-action dataset never needs it); `clusteringThreshold` in `src/config/map.js` is reserved, unused configuration for if/when that changes.

## Suggested Next Feature

With discovery (list + map), participation, organizer management, attendance, and now geographic context all in place, a natural next step is a lightweight notifications/reminders surface (e.g. "an action you joined is happening soon") to close the loop on the volunteer lifecycle — no new external services required, reusing the existing mock/localStorage patterns already established across every feature so far.
