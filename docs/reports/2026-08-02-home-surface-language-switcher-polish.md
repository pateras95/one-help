# Phase Report — Home Surface Hierarchy & Language Switcher Polish

## Summary

Fixed the Home page's flat, same-grey-everywhere look by giving `OHSection` a semantic `variant` system (`default`/`muted`/`tinted`/`emphasis`) and applying a deliberate alternating surface rhythm: white Hero → teal-tinted full-bleed Categories → white "How It Works" (with a desktop connecting line) → a wide primary→secondary gradient CTA panel → tinted Footer. Refined the theme's `surfaceVariant` to a genuine teal tint (was a near-identical grey to the page background — the actual root cause of the "blends together" complaint) and darkened `border` slightly for visibility. Rebuilt `OHLanguageSwitcher` with local flag SVGs, a visible tonal pill trigger, and a menu showing flag + locale-reactive language name + a checkmark (not color alone) for the selected item. No Actions feature logic, routes, auth, maps, or backend code was touched.

## Files Created

- `frontend/public/branding/locales/el.svg` — simplified Greek flag (local asset, no remote image)
- `frontend/public/branding/locales/en.svg` — simplified UK flag (local asset, no remote image)

## Files Modified

- `frontend/src/config/branding.js` — `surfaceVariant` changed from a near-grey `#EEF2F6` to a genuine teal tint `#E3F0EE`; `border` darkened from `#E1E7ED` to `#D7E0E8` for better visibility
- `frontend/src/components/common/OHSection.vue` — added a `variant` prop (`default`/`muted`/`tinted`/`emphasis`) that resolves to a background/fullBleed/padding preset internally (raw `fullBleed`/`background` props still work under `variant="default"`); `emphasis` renders a wide, rounded, gradient panel with automatically-contrasting text (no per-usage color overrides needed); added a default `padding-block` for consistent section rhythm everywhere it's used
- `frontend/src/views/HomeView.vue` — Hero kept as-is functionally, given bottom breathing room; Categories now uses `variant="tinted"`; How It Works now uses `background="surface"` (a clean white panel distinct from both neighbors) plus a desktop-only connecting line between the three step icons; CTA now uses `variant="emphasis"` directly (dropped the nested `OHCard`, since the section itself is now the branded panel); category cards gained a stronger hover/focus shadow and a visible focus ring
- `frontend/src/components/common/OHLanguageSwitcher.vue` — trigger is now a visible tonal pill (flag + code + chevron) instead of a plain text button; menu items show flag + locale-reactive language name + a checkmark on the active one (not a color-only indicator)
- `frontend/src/constants/locales.js` — `LOCALE_OPTIONS` now carries `flag` (asset path) and `nameKey` (translation key) instead of a hardcoded `nativeName`, since the display name needed to become locale-reactive (see below)
- `frontend/src/locales/{el,en}/common.js` — added `languageSwitcher.current`/`languageSwitcher.selected` (aria strings) and a new `languageNames` namespace

## Files Removed

None by this feature. (Note: `docs/reports/2026-08-01-actions-discovery-foundation.md` and `docs/reports/2026-08-01-internationalization-modern-visual-refresh.md` are missing from disk and staged as deletions in git — this was already staged before this feature started; I did not delete them and left that state untouched.)

## Folder Structure

```
frontend/public/branding/
└── locales/
    ├── el.svg   (new)
    └── en.svg   (new)

frontend/src/components/common/
├── OHLanguageSwitcher.vue   (redesigned)
├── OHSection.vue            (+ variant prop)
└── ...
```

## Packages Installed

None — no flag library was installed, per the constraint; flags are local SVG files.

## Build Result

PASS — `npm run build` succeeds, no errors.

## Lint Result

PASS — `npm run lint`: 0 errors, 0 warnings.

## Test Result

No test script exists in `package.json` — none run.

## Manual Verification

Performed live in Chrome against the running dev server:

- **Surface rhythm (desktop, 1440px):** confirmed visually — Hero is clean white, Categories is a clearly teal-tinted full-bleed band, How It Works is a distinct white panel (with a visible connecting line running behind the three step icons), the CTA is a wide primary→secondary gradient panel with visible rounded corners, and the Footer is tinted separately below it. No two consecutive sections share the same tone.
- **No horizontal overflow:** `document.documentElement.scrollWidth === clientWidth` confirmed both before and after these changes.
- **Category cards still functional:** unchanged behavior — links to `/actions?category=<id>` still work (spot-checked navigation).
- **Language switcher visibility:** the new tonal pill (flag + code + chevron) is clearly visible in the app bar, a large improvement over the previous plain-text button.
- **Both flags render correctly:** confirmed visually in the trigger and in the open menu (Greek blue/white cross, UK Union Jack).
- **Menu content matches the requested example exactly:** under Greek UI, the menu shows "Ελληνικά" (checkmark selected) and "English"; switched to English, and the menu then showed "Greek" and "English" (checkmark on English) — confirming the language *names* are locale-reactive as specified, not fixed autonyms.
- **Locale switching:** works immediately, no route navigation triggered by the switch (confirmed via URL staying unchanged across the click).
- **Persistence:** switched to English, refreshed the page — `document.documentElement.lang`, `localStorage`, and the rendered `<h1>` all correctly stayed in English.
- **`document.title`/`document.documentElement.lang`:** both update correctly on switch (verified via direct JS inspection, not just visually).
- **Accessibility:** trigger is a real `<button>` with `tabIndex 0` and a meaningful `aria-label` ("Current language: English" / "Τρέχουσα γλώσσα: Ελληνικά"); the selected menu item is marked via a checkmark icon, not color alone; flags use `alt=""` (decorative, since adjacent visible text already conveys the meaning).
- **Desktop navigation:** unaffected — top bar links, active-state pill, and their translations still work correctly.
- **Mobile top bar:** simulated the mobile breakpoint — logo and the language switcher pill sit cleanly on opposite ends of the app bar with no collision; switcher trigger measured ~89px wide, comfortably fitting alongside the logo even at a 320px budget.
- **Mobile bottom navigation:** confirmed unchanged — still exactly the four items (Home/Actions/About/Contact), no language option added to it.
- **Console errors:** zero, across every navigation, locale switch, and page checked in this session.

**Tooling limitation (same as prior features):** this sandbox's Chrome window has a resize floor around ~860px CSS width, preventing a true physical 320/375px resize. Mobile-specific checks (top bar fit, bottom nav) were verified by forcing Vuetify's reactive breakpoint state directly rather than a genuine narrow viewport — this confirms the logic and measured element widths, but a real-device or unrestricted-devtools spot-check is still recommended before considering mobile fully signed off.

## Remaining TODO

- True narrow-viewport (320/375px) visual check still outstanding, for the reason above.
- `docs/reports/2026-08-01-*.md` are missing from disk / staged as deletions in git from before this feature started — flagging for your awareness since I didn't make that change and it wasn't this feature's concern to resolve.
- The "How It Works" connecting line uses a fixed `12%`/`top: 32px` alignment tuned for the current icon size (64px chips) — if that icon size changes later, the line's alignment will need a matching adjustment.
- No new Pinia-store or feature-logic changes were made (by design, per this feature's scope) — Actions Discovery, filters, and routing are exactly as they were.

## Suggested Next Feature

Phase 3 — Auth (mocked), now that the shell's visual language is settled:

- `src/features/auth/{services,stores,mocks,views}`
- `auth.mock.js`, `auth.service.js` (built on `mockResponse.js`), `auth.store.js`
- Router guards using the already-scaffolded `requiresAuth` meta (present on every route today, always `false`)
- Login/register views inside `AuthLayout`, reusing the OH components and the same surface-variant vocabulary established here (e.g. an `emphasis` panel could suit a "welcome back" auth header)
- Wire login/logout feedback through `notifications.store.js`
