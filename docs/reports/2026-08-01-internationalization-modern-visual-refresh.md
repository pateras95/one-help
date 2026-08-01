# Phase Report — Internationalization & Modern Visual Refresh

## Summary

Added production-ready Greek/English switching (Vue I18n in Composition-API mode, a Pinia locale store with localStorage persistence, and a reusable `OHLanguageSwitcher`), moved every user-facing string in the app into locale files, made router document titles locale-reactive, and refreshed the public interface's visual language (semantic theme color roles, a responsive type scale, flatter bordered cards, a two-column hero with a CSS/icon-built illustration, modernized category cards with descriptions, and refined nav active-states). Also added the permanent feature-report workflow rule to `CLAUDE.md` per Part C. No auth, actions data, maps, QR, backend calls, PWA, dark mode, or browser-language auto-detection were touched. Routes remain locale-neutral (`/`, `/actions`, `/about`, `/contact`).

## Files Created

- `frontend/src/plugins/i18n.js` — Vue I18n instance (`legacy: false`)
- `frontend/src/constants/locales.js` — `SUPPORTED_LOCALES`, `DEFAULT_LOCALE`, `LOCALE_STORAGE_KEY`, `LOCALE_OPTIONS` (native names, not translated)
- `frontend/src/locales/index.js` + `el/{common,navigation,home,footer,errors,pages}.js` + `en/{common,navigation,home,footer,errors,pages}.js` — locale message files, identical key structure in both languages
- `frontend/src/stores/locale.store.js` — Pinia store: init/validate/switch/persist locale, syncs Vue I18n and `document.documentElement.lang`
- `frontend/src/router/documentTitle.js` — shared `applyDocumentTitle(titleKey)` helper used by both the router guard and the locale store, so title-formatting logic isn't duplicated
- `frontend/src/components/common/OHLanguageSwitcher.vue` — compact menu switcher (`ΕΛ`/`EN`), placed in the top app bar (present on both desktop and mobile, not in the bottom nav)

## Files Modified

- `frontend/src/main.js` — registers the i18n plugin, calls `useLocaleStore().init()` before mount
- `frontend/src/router/index.js` — `beforeEach` now calls `applyDocumentTitle(to.meta.titleKey)` instead of formatting a literal string
- `frontend/src/router/routes/public.routes.js` — route `meta.title` replaced with `meta.titleKey`, reusing the same keys as navigation labels (e.g. `navigation.home`) except the 404 route (`errors.notFound.title`)
- `frontend/src/constants/navigation.js` — items now carry `labelKey` instead of a literal Greek `label`; components resolve it via `t()`
- `frontend/src/components/layout/AppNavigation.vue` — translated labels/aria-labels, active-route pill styling (`variant`/`color` bound to route match), houses `OHLanguageSwitcher`, app bar recolored to `surface` with a subtle bottom border instead of solid `primary`
- `frontend/src/components/layout/AppBottomNavigation.vue` — translated labels/landmark, added a small active-tab indicator bar (non-color cue, on top of the existing bold + `aria-current`)
- `frontend/src/components/layout/AppFooter.vue` — fully translated, background switched to the new `surfaceVariant` role
- `frontend/src/components/layout/PageContainer.vue` — more generous vertical padding (`py-8 py-md-12`)
- `frontend/src/components/common/OHSection.vue` — heading uses the new responsive `.oh-section-title` scale; inter-section spacing now larger on desktop (`--oh-space-2xl`) than mobile
- `frontend/src/components/common/OHPageHeader.vue` — uses `.oh-page-title` scale and `textPrimary`/`textSecondary` roles
- `frontend/src/components/feedback/{EmptyState,ErrorState,LoadingState}.vue` — default copy now resolves through `t()` (still overridable via props for page-specific text)
- `frontend/src/components/feedback/NotificationsHost.vue` — translated close button label
- `frontend/src/views/{HomeView,AboutView,ContactView,ActionsView,NotFoundView}.vue` — all visible text now translated; `HomeView.vue` rebuilt with a two-column hero (headline/lead/CTAs + a CSS/icon-built illustration panel), modernized category cards (icon chip + label + description), and refined how-it-works/CTA sections
- `frontend/src/config/branding.js` — added semantic color roles: `surfaceVariant`, `textPrimary`, `textSecondary`, `border`
- `frontend/src/plugins/vuetify.js` — theme now derives `on-background`/`on-surface` from `branding.colors.textPrimary` (removed a duplicated hex literal); `VCard` default changed to `variant: 'flat', border: true` (subtle border instead of elevation shadow)
- `frontend/src/styles/main.css` — larger radius/spacing scale, added `--oh-space-2xl`, three `clamp()`-based responsive type roles (`--oh-text-display/page-title/section-title`) and matching utility classes
- `frontend/package.json` / `package-lock.json` — added `vue-i18n`
- `claude.md` — added the permanent "Feature completion reports" section (Part C)

## Files Removed

None.

## Folder Structure

```
frontend/src/
├── components/
│   ├── common/            (+ OHLanguageSwitcher.vue)
│   ├── feedback/
│   └── layout/             (+ AppBottomNavigation.vue, from a prior feature)
├── config/branding.js
├── constants/               (+ locales.js)
├── layouts/
├── locales/                (new: el/, en/, index.js)
├── plugins/                 (+ i18n.js)
├── router/                  (+ documentTitle.js)
├── services/http.js
├── stores/                  (+ locale.store.js)
├── styles/main.css
├── utils/mockResponse.js
└── views/
```

## Packages Installed

- `vue-i18n` — installed as `^11.4.8` (current major). Note: v11 requires Node ≥22 per its `engines` field, but this environment runs Node 20.19.5. I verified it anyway (`require()` smoke test, then a full `npm run build`) — both succeeded with no errors, so the engine requirement appears conservative rather than a hard runtime need. Flagging this as a risk to watch: if a future `npm ci` on a stricter CI runner enforces engines, it may need `vue-i18n@^10` instead (also current, tested, requires only Node ≥16) as a fallback.

## Build Result

PASS — `npm run build` succeeds, no errors.

## Lint Result

PASS — `npm run lint`: 0 errors, 0 warnings.

## Test Result

No test script exists in `package.json` yet, so no automated tests were run (per the instruction to only run tests if a script currently exists).

## Manual Verification

Performed live in Chrome against the running dev server:

- Greek is used by default with no stored preference (verified after clearing/setting an invalid `onehelp.locale` value — falls back to `el` correctly).
- Switching to English updates the entire visible page immediately (nav, hero, categories, how-it-works, CTA, footer) with no reload.
- Switching back to Greek works identically.
- Refresh preserves the selected language (`localStorage` read back correctly on reload).
- Invalid stored locale (`fr-INVALID`) falls back to Greek; the invalid value is left untouched in storage (not overwritten), matching the "persist only valid codes" requirement.
- `document.documentElement.lang` updates on every switch (`el` ⇄ `en`), confirmed via direct inspection.
- Document title changes with locale on the current page ("Αρχική · OneHelp" ⇄ "Home · OneHelp") without navigating.
- Desktop navigation labels and the mobile bottom-navigation labels both change language correctly; the active-route pill/indicator still tracks correctly after a language switch.
- Footer content (tagline, contact/social/about headings, copyright with interpolated year + app name) changes language correctly.
- Direct URL loading of `/`, `/actions`, `/about`, `/does-not-exist` works correctly in English with correct titles and no console errors.
- Browser back/forward both work and update the title correctly.
- No untranslated keys or broken interpolation (`{...}`/`undefined`) found anywhere checked.
- Zero console errors across every navigation and language switch performed in this session.
- Mobile: simulated the mobile breakpoint (forced `window.innerWidth` + `resize` event, per the same sandbox limitation noted in the previous feature) — bottom nav renders translated labels, the language switcher in the compact top app bar opens correctly and doesn't crowd the bottom nav, and switching language from that position works identically to desktop.

Tooling limitation (same as the previous feature): this sandbox's Chrome window has a resize floor around ~860px CSS width, so a true physical 320/375/768px resize wasn't possible. Mobile behavior was verified by forcing Vuetify's reactive breakpoint state directly, which exercises the real code path but is not a substitute for an actual narrow-viewport visual check — recommend spot-checking on a real device or unrestricted devtools responsive mode, in particular for label wrapping on "Emergency response"/"Έκτακτες ανάγκες" and touch target comfort in the bottom nav.

## Remaining TODO

- True narrow-viewport (320/375/768px) visual check still outstanding, for the reason above.
- `vue-i18n@11`'s Node ≥22 engine requirement vs. this environment's Node 20 — works today, but worth confirming on the actual CI/deploy Node version before relying on it long-term.
- `branding.logoPath` remains a placeholder with no real asset (unchanged from the previous feature) — `OHLogo` still doesn't dereference it, so there's no broken image, just still pending real brand assets.
- No automated detection of a mismatch between Vuetify's JS-reactive breakpoint (768px, drives nav switching) and its compiled CSS utility/grid breakpoints (600/960/1264, drives things like the footer/category grid) — pre-existing, unchanged this feature.
- No `src/features/*`, domain Pinia stores, Vitest, Prettier, or PWA support yet.
- The hero illustration and category "icon chips" are hand-rolled CSS in `HomeView.vue` rather than a shared component — acceptable for now since it's only used on the Home page, but worth promoting to a shared pattern if reused elsewhere later.

## Suggested Next Feature

Phase 3 — Auth (mocked), now that the shell, design system, i18n, and navigation are all in place:

- `src/features/auth/{services,stores,mocks,views}`
- `auth.mock.js`, `auth.service.js` (built on `mockResponse.js`), `auth.store.js`
- Router guards using the already-scaffolded `requiresAuth`/`roles` meta
- Login/register views inside `AuthLayout`, using the OH components and translated copy (new `auth.js` locale files in both languages)
- Wire login/logout feedback through `notifications.store.js`
