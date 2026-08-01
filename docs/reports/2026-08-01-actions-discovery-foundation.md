# Phase Report — Volunteering Categories Showcase & Actions Discovery Foundation

## Summary

Redesigned the Home page's categories section into a full-bleed, editorial bento grid (one featured category + four supporting tiles on desktop/tablet, a native CSS scroll-snap row on mobile), moved category data into a shared `src/constants/actionCategories.js` so Home and the new Actions feature read from one source of truth, and built the first real Actions Discovery feature: a feature-oriented `src/features/actions/` structure with mock data, a service, a Pinia store, a list page (search/category/date/sort/reset, responsive grid, loading/empty/error states), an `ActionCard`, and an Action Details route. Category clicks on Home now deep-link into the Actions page via `?category=...`, with validated query-param sync in both directions. Added a documented map strategy (no library installed yet) and resolved the Node/vue-i18n version tension by documenting Node 22 as the target rather than downgrading to an already-deprecated i18n major. No auth, maps, participation, QR, or backend calls were touched.

## Files Created

- `frontend/src/constants/actionCategories.js` — shared `ACTION_CATEGORIES` (id, label/description keys, icon, accent), `getActionCategory()`, `isValidCategoryId()`
- `frontend/src/locales/{el,en}/categories.js` — category label/description translations (moved out of `home.js`)
- `frontend/src/locales/{el,en}/actions.js` — full Actions feature translation namespace (page, filters, results, card, urgency, status, details)
- `frontend/src/features/actions/mocks/actions.mock.js` — 13 fictional mock actions across all 5 categories
- `frontend/src/features/actions/services/actions.service.js` — `getActions(filters)`, `getActionById(id, locale)`; owns all filtering/search/date-preset/sort logic
- `frontend/src/features/actions/stores/actions.store.js` — Pinia store for list + details async state and filter selections
- `frontend/src/features/actions/components/ActionCard.vue`
- `frontend/src/features/actions/views/ActionsListView.vue`
- `frontend/src/features/actions/views/ActionDetailsView.vue`
- `frontend/src/features/actions/routes.js` — `actionsRoutes` (list + `/actions/:actionId`), imported into the central router
- `docs/frontend/map-strategy.md` — Leaflet/OSM/GeoJSON MVP plan, tile-provider replaceability constraint
- `frontend/.nvmrc` — pins Node `22`

## Files Modified

- `frontend/src/views/HomeView.vue` — categories section rebuilt as a full-bleed bento grid / mobile scroll-snap row, sourced from `ACTION_CATEGORIES`, each card links to `/actions?category=<id>`
- `frontend/src/components/common/OHSection.vue` — added `fullBleed` and `background` props (the reusable "break out of the page's constrained width" pattern), plus a `subtitle` prop
- `frontend/src/constants/routes.js` — added `actionDetailsPath(actionId)` helper
- `frontend/src/locales/{el,en}/home.js` — removed the per-category keys (moved to `categories.js`); added `categories.subtitle` / `categories.viewActionsAriaLabel`
- `frontend/src/locales/index.js` — registered the new `categories` and `actions` namespaces
- `frontend/src/router/routes/public.routes.js` — replaced the old inline `actions` route with `...actionsRoutes` from the feature
- `frontend/src/styles/main.css` — added `overflow-x: hidden` on `body` (see Manual Verification — fixes a real horizontal-overflow bug the full-bleed section introduced)
- `frontend/package.json` — added `engines.node: ">=22"`; no new runtime dependencies were installed for this feature

## Files Removed

- `frontend/src/views/ActionsView.vue` — replaced by `frontend/src/features/actions/views/ActionsListView.vue`

## Folder Structure

```
frontend/src/features/actions/
├── components/ActionCard.vue
├── mocks/actions.mock.js
├── services/actions.service.js
├── stores/actions.store.js
├── views/
│   ├── ActionsListView.vue
│   └── ActionDetailsView.vue
└── routes.js

frontend/src/constants/
├── actionCategories.js   (new)
├── locales.js
├── navigation.js
├── routes.js              (+ actionDetailsPath)
└── socialLinks.js

frontend/src/locales/
├── el/ (+ categories.js, actions.js)
└── en/ (+ categories.js, actions.js)

docs/
├── frontend/map-strategy.md   (new)
└── reports/2026-08-01-actions-discovery-foundation.md
```

## Packages Installed

None. No new dependencies were installed for this feature (no map library, per the constraint). `frontend/.nvmrc` and the `engines` field are documentation/configuration, not packages.

## Build Result

PASS — `npm run build` succeeds, no errors.

## Lint Result

PASS — `npm run lint`: 0 errors, 0 warnings.

## Test Result

No test script exists in `package.json` yet, so no automated tests were run.

## Manual Verification

Performed live in Chrome against the running dev server:

- **Redesigned category section (desktop, 1440px):** full-bleed light background spans the viewport edge-to-edge; Health renders as the featured 2×2 tile, the other four categories fill the remaining grid cells with distinct accent colors (green/teal/gold/red) — confirmed visually.
- **Found and fixed a real bug:** the full-bleed section's `calc(50% - 50vw)` technique caused an 8px horizontal overflow (`scrollWidth` 1073 vs `clientWidth` 1065) — the classic `100vw`-includes-scrollbar-width interaction. Fixed by adding `overflow-x: hidden` on `body`; reloaded and confirmed `scrollWidth === clientWidth` afterward.
- **Category → Actions navigation:** clicking "Περιβάλλον" (Environment) on Home navigated to `/actions?category=environment` and correctly pre-filtered the list to its 3 environment actions, with the category `<VSelect>` pre-set to match.
- **Invalid category query handling:** loaded `/actions?category=totally-invalid` directly — the invalid value was safely ignored (all 13 actions shown, category filter left unset), no console errors.
- **Search filtering:** typed "Πάτρα" — correctly narrowed to the 2 actions located in Patras; URL updated to `?search=...`; verified the debounced fetch still ran correctly.
- **Reset filters:** cleared both the search box and the URL query, restored all 13 actions.
- **Locale switching on the list page:** switched EL → EN — the entire grid re-fetched and re-rendered in English (filters, chips, all 13 mock actions' titles/descriptions/organizations/locations), confirming the bilingual-inline mock data + locale-reactive store watcher works correctly. Switched back to EL — same result.
- **Locale switching on the details page:** loaded `/actions/act-005` directly in English, then switched to Greek in place — title and all content (including `Intl.DateTimeFormat`-formatted date) updated correctly without navigating away.
- **Action details route:** direct load of `/actions/act-013` rendered category/status chips, description, requirements checklist, formatted date/time, location (with the "map coming later" note), organizer, and participant count correctly.
- **Not-found action:** `/actions/does-not-exist` correctly showed the translated not-found state (not a blank page or a thrown error), with a working "back to actions" link.
- **Browser back/forward:** Home → Actions (filtered) → Details → back → forward all worked correctly, titles updating each time.
- **Mobile bottom navigation:** confirmed it's still exactly the 4 required items (Home/Actions/About/Contact) — no 5th "language" destination was added, matching the constraint.
- **Mobile filters pattern:** simulated the mobile breakpoint — search stays always visible, category/date/sort collapse into a "Φίλτρα"/"Filters" expansion panel, which opens and works correctly.
- **Keyboard accessibility:** all 5 Home category cards are real `<a>` tags with correct `href`s and meaningful `aria-label`s (e.g. "Δες δράσεις στην κατηγορία Υγεία"), natively focusable and reachable via `.focus()`; the existing global `:focus-visible` outline applies to them without extra work.
- **No untranslated keys:** checked page text for stray `{...}`/`undefined`/raw dotted key strings — none found, in either language.
- **Console errors:** zero, across every navigation, filter change, and locale switch performed in this session.

**Tooling limitation (same as prior features):** this sandbox's Chrome window has a resize floor around ~860px CSS width, so true 320/375px viewport testing wasn't possible. Mobile-specific behavior (bottom nav, expansion-panel filters, category scroll-snap row) was verified by forcing Vuetify's reactive breakpoint state directly, which exercises the real code path but not genuine narrow-viewport visual layout — in particular, the mobile category scroll-snap row and the Actions grid's single-column stacking at true 320–375px widths were not visually confirmed and should be spot-checked on a real device.

## Remaining TODO

- True narrow-viewport (320/375px) visual check still outstanding, for the reason above — specifically the category horizontal scroll-snap row and result-grid single-column stacking.
- Action Details document titles use one generic `actions.details.genericTitle` key ("Λεπτομέρειες δράσης"/"Action details") rather than the action's own title — a reasonable simplification for this "basic" details screen per the brief, but a nice enhancement later.
- Search matching is a plain case-insensitive substring match with no accent/diacritic normalization — fine for the test data used here, but worth revisiting if Greek search UX becomes a focus.
- "Sort by newest" uses mock-data id order as a stand-in for "recently added" — there's no real creation timestamp in the fixtures; documented as a deliberate simplification in the service's code comments.
- Map strategy is documented (`docs/frontend/map-strategy.md`) but nothing is installed — next map-related feature should read that doc first.
- **Node/vue-i18n:** `vue-i18n@^11.4.8` (current, not deprecated) requires Node ≥22 per its `engines` field; this sandbox runs Node 20.19.5 and works today only because npm's `engine-strict` is off (confirmed: fresh `npm install` + `npm run build` both succeed with warnings only, no errors). `vue-i18n@10` would match Node 20 but is explicitly flagged deprecated upstream ("v9 and v10 no longer supported, migrate to v11"). **Recommendation:** keep `vue-i18n@11` and treat Node 22 LTS as the project's real target — added `frontend/.nvmrc` (`22`) and `engines.node: ">=22"` in `package.json` to make this explicit rather than leaving the mismatch silent. The actual development machine(s) and any CI/deploy pipeline should be upgraded to Node 22 when convenient; this is a known gap, not a silent one.
- No `src/features/*` for other domains (auth, organizations, profile), no Vitest, no Prettier, no PWA support yet.

## Suggested Next Feature

Phase 3 — Auth (mocked), now that Actions Discovery gives it something meaningful to gate later (participation):

- `src/features/auth/{services,stores,mocks,views}`
- `auth.mock.js`, `auth.service.js` (built on `mockResponse.js`), `auth.store.js`
- Router guards using the already-scaffolded `requiresAuth` meta (present on every route today, always `false`)
- Login/register views inside `AuthLayout`, using the OH components and a new `auth.js` locale namespace in both languages
- Wire login/logout feedback through `notifications.store.js`
- Once auth exists, the Actions Details screen becomes the natural place to introduce a (still-mocked) "Join this action" action, ahead of any real participation feature
