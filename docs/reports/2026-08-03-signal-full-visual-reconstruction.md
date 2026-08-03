# Phase Report — OneHelp Signal UI: Full Visual Reconstruction

## Summary

A complete visual reconstruction of the frontend under the approved "Signal" direction. This was explicitly not a polish pass: layouts, template structures, component composition, and shared visual primitives were rewritten across the entire application. No business logic, routes, stores, service contracts, permissions, authentication, participation, QR/attendance, or map behavior were changed — every edit was confined to `<template>`/`<style>` blocks, new presentational components, design tokens, and copy-only i18n additions.

**Part 1 — Visual architecture.** New shared primitives introduced in `src/components/common/`: `SignalStatusBadge` (dot+label pill, replaces plain status/moderation/lifecycle `VChip`s everywhere), `SignalMetricCard` (squircle-icon stat card, now the single shared "metric" component for both the organizer and admin dashboards — `AdminSummaryCard.vue` was retired in its favor), `SignalIllustration` (the reusable relay-arc + brand-mark decorative moment used at hero and auth scale), `SignalAuthPanel` (the branded auth split-screen panel). Existing primitives (`OHPageHeader`, `OHSection`, `OHCard`, `OHButton`) were upgraded in place rather than duplicated, so call sites across ~40 views inherited the new language without each needing individual rewrites. New CSS utilities in `src/styles/main.css`: `.oh-icon-well` (squircle container), `.oh-card-interactive` (hover-lift), `.oh-panel`/`.oh-panel--danger` (boxed/danger surfaces), `.oh-eyebrow`, `.oh-reveal` (entrance animation).

**Part 2 — Logo.** `BrandLogo.vue` was completely rewritten: the previous three-petal mark is gone, replaced by two asymmetric wing-shaped forms leaning toward a shared point with a small amber "spark" marking the handoff and a faint dashed motion trail beneath — a relay/handoff read (help passing from one person to the next), not a heart, hand, cross, petals, or network graph. All four variants preserved (`primary`/`horizontal`/`icon`/`monochrome`) plus a new `animated` mode used only by `LoadingState.vue`, where the spark travels between the two wings instead of the whole mark pulsing. Wired into header, footer (monochrome), Login/Register (large `primary` variant in the new auth panel), Home hero, About, empty states, loading states, and a new SVG favicon (`public/branding/favicon.svg`, referenced from `index.html` alongside the existing `.ico` as a fallback).

**Part 3 — Page shell.** `AppNavigation.vue`: scroll-elevation shadow, a coral underline active-indicator (replacing the flat tonal-button state), a divider before the language switcher. `AppFooter.vue`: rebuilt as a dark navy closing surface with a coral glow accent and a monochrome logo, replacing the previous plain light four-column block. `AppBottomNavigation.vue`: active-indicator recolored to match the desktop underline, added elevation. All navigation *items, routes, and active-state logic* are untouched — only presentation.

**Part 4 — Home.** Fully rebuilt: an asymmetric hero (eyebrow, oh-display headline, a factual 3-point trust checklist, `SignalIllustration`, and a floating decorative detail card) replaces the old centered-icon hero; the category grid now renders five genuinely different tile compositions (`featured` solid-color field for Emergency, `banner` color-band for Health, `diagonal` icon-opposite-label for Environment, `corner` ghost-watermark for Social, `tinted` soft-wash for Animals) instead of one repeated card template; "How It Works" is now a connected zigzag journey (alternating left/right steps along a dashed vertical line) instead of three icons on a line; the closing CTA is an integrated dark rounded panel with an icon, headline, and button in one asymmetric row, not an isolated full-bleed gradient rectangle.

**Part 5 — Action Cards.** `ActionCard.vue` was rewritten from scratch: a colored category rail down the left edge, a compact identity zone (icon-well + category label + a solid urgency badge), an editorial fixed-height title/description block, a structured 2-column metadata grid (date/location, organizer spanning full width), a capacity progress bar alongside the status badge, and a fixed action footer. Emergency-category or urgent-priority cards get a visibly thicker rail plus a faint tinted background — structural emphasis, not just a red chip. Applied to the Actions list, Map results, and the Map's selected-action panel (`ActionMapMarkerPopup.vue`, which also gained a rail + entrance transition). `MyActionCard.vue` and `OrganizerActionCard.vue` were harmonized with the same rail/icon-well/badge anatomy while keeping their own domain fields (attendance status, checked-in-at, organizer transition menu).

**Part 6 — Actions Discovery.** `ActionsListView.vue`'s search/filter row is now a composed panel (`OHCard`) with a prominent search field, labeled filter selects with prepend icons, and — new — a removable "active filters" chip summary plus a translated result count with an icon. Filter logic, URL sync, and the store contract are untouched.

**Part 7 — Map.** `MapView.vue`'s filter row was wrapped in the same discovery panel used by Actions; the map container is now framed in `.oh-panel` (bordered, rounded, clipped corners); the selected-action panel is the rebuilt `ActionMapMarkerPopup.vue`. No Leaflet behavior, coordinates, selection logic, or geolocation code was touched.

**Part 8 — Auth.** `AuthLayout.vue` was rebuilt as a split-screen: a branded `SignalAuthPanel` (dark gradient, illustration, headline + message) on tablet+ screens, collapsing to a compact monochrome-logo masthead on mobile; the form now sits in its own `OHCard` on the right/below. `LoginView.vue`/`RegisterView.vue` pass their own headline/message copy (new `auth.brandPanel.*` i18n keys) and tuck demo credentials into a collapsed accordion so they read as secondary. All fields, validation, and submit handlers are unchanged.

**Part 9 — Organizer & Admin.** Both dashboards now share `SignalMetricCard` for every stat tile. Across `OrganizerActionForm.vue`, `OrganizerActionDetailsView.vue`, `OrganizerParticipantsView.vue`, `OrganizerOrganizationView.vue`, `StatusTransitionDialog.vue`, `BecomeOrganizerView.vue`, `OrganizerCheckInView.vue`, and the Admin Users/Organizations/Actions/Reports/Activity views plus `AdminNavTabs.vue`, status/moderation/lifecycle/report chips were converted to `SignalStatusBadge` — two shared components (`AdminStatusChip.vue`, `AdminConfirmDialog.vue`) were fixed once so every admin call site inherited the change without per-view edits. Destructive-action surfaces (`OrganizerDemotionConfirmDialog.vue`, the organizer's "become a volunteer again" danger zone) now use `.oh-panel--danger`. Admin's action list keeps moderation status and organizer lifecycle status as two visually distinct badges, never merged. No permissions, transition rules, or destructive-action logic changed.

**Part 10 — Motion.** `.oh-card-interactive` (hover-lift on Action/Metric cards), a coral underline slide on desktop nav, `SignalStatusBadge`/nav scroll-elevation transitions, the animated logo handoff in `LoadingState`, and a fade+slide entrance on `ActionMapMarkerPopup` were already in place from earlier phases of this pass. Added in this final pass: a scroll-triggered section reveal in `OHSection.vue` (IntersectionObserver-based, with an immediate-visible fallback if unsupported, so content can never be stranded invisible), a global tactile press-down on every `VBtn` (`:active { transform: scale(0.97) }`), an entrance fade on `EmptyState`, and a slow continuous ring-rotation + floating-dot motion on `SignalIllustration` (hero/auth). Every animation/transition added — old and new — has a matching `prefers-reduced-motion: reduce` override that disables transforms/animations outright.

**Part 11 — Surface/color/typography.** `branding.js` now carries the full Signal palette (deep ink navy primary, coral secondary, amber accent, five distinct per-category colors, a reserved emergency/error hue used nowhere else). `vuetify.js`'s theme was updated accordingly and gained an explicit `on-accent` pairing. `main.css`'s `.rounded-lg`/`.rounded-xl` overrides re-tune every Vuetify `VCard`/`VBtn` corner radius app-wide from Vuetify's stock 8px to the rounder Signal geometry in one place. Editorial type scale (`--oh-text-display/headline/page-title/section-title`), warm-tinted shadow tokens, and the brand gradient/wash tokens back every surface described above.

**Part 12 — Feedback states.** `EmptyState.vue` gained a `tone` prop (`neutral`/`search`/`restricted`) giving "no data yet", "no search results", and "access restricted" genuinely different icon-well accent colors instead of one identical badge — wired into `ActionsListView` (search tone when filters are active) and `UnauthorizedView` (restricted tone). `ErrorState.vue` gained a `tone` prop (`recoverable`/`destructive`), the latter rendering inside a bordered `.oh-panel--danger` frame. `LoadingState.vue` uses the animated handoff logo. `NotificationsHost.vue`'s snackbar now shows a type-specific icon and rounded corners. All four components kept their exact existing props/logic/emit contracts.

**Part 13 — Coverage.** Screens visually reconstructed or restyled in this pass: Home, Actions (list + details), Map (+ selected panel), Login, Register, Account, My Actions, Check-In (volunteer scan + organizer QR display), Organizer application (Become an Organizer), Organizer dashboard/actions/action form/participants/organization, Admin dashboard/users/organizations/actions/reports/activity, About, Unauthorized, Header, Footer, Mobile bottom navigation, dialogs (`StatusTransitionDialog`, `AdminConfirmDialog`, `OrganizerDemotionConfirmDialog`), forms (`OrganizerActionForm`), and all four feedback-state components. Not Found was left as a standard `EmptyState` usage (already cascades the new look) with no additional edits needed.

## Files Created

- `src/components/common/SignalAuthPanel.vue`
- `src/components/common/SignalIllustration.vue`
- `src/components/common/SignalMetricCard.vue`
- `src/components/common/SignalStatusBadge.vue`
- `public/branding/favicon.svg`

## Files Modified

`src/config/branding.js`, `src/plugins/vuetify.js`, `src/styles/main.css`, `src/constants/actionCategories.js`, `index.html`, `src/components/common/BrandLogo.vue`, `src/components/common/OHLogo.vue`, `src/components/common/OHPageHeader.vue`, `src/components/common/OHSection.vue`, `src/components/feedback/EmptyState.vue`, `src/components/feedback/ErrorState.vue`, `src/components/feedback/LoadingState.vue`, `src/components/feedback/NotificationsHost.vue`, `src/components/layout/AppNavigation.vue`, `src/components/layout/AppFooter.vue`, `src/components/layout/AppBottomNavigation.vue`, `src/features/auth/components/AccountMenu.vue`, `src/views/HomeView.vue`, `src/views/AboutView.vue`, `src/views/UnauthorizedView.vue`, `src/locales/{el,en}/home.js`, `src/locales/{el,en}/pages.js`, `src/locales/{el,en}/auth.js`, `src/features/actions/components/ActionCard.vue`, `src/features/participation/components/MyActionCard.vue`, `src/features/organizer/components/OrganizerActionCard.vue`, `src/features/actions/views/ActionsListView.vue`, `src/features/actions/views/ActionDetailsView.vue`, `src/features/map/views/MapView.vue`, `src/features/map/components/ActionMapMarkerPopup.vue`, `src/layouts/AuthLayout.vue`, `src/features/auth/views/LoginView.vue`, `src/features/auth/views/RegisterView.vue`, `src/features/organizer/views/OrganizerDashboardView.vue`, `src/features/organizer/views/OrganizerActionFormView.vue`, `src/features/organizer/components/OrganizerActionForm.vue`, `src/features/organizer/views/OrganizerActionDetailsView.vue`, `src/features/organizer/views/OrganizerParticipantsView.vue`, `src/features/organizer/views/OrganizerOrganizationView.vue`, `src/features/organizer/components/StatusTransitionDialog.vue`, `src/features/organizerApplication/views/BecomeOrganizerView.vue`, `src/features/organizerApplication/components/OrganizerDemotionConfirmDialog.vue`, `src/features/attendance/views/OrganizerCheckInView.vue`, `src/features/attendance/views/CheckInView.vue`, `src/features/admin/views/AdminDashboardView.vue`, `src/features/admin/views/AdminUsersView.vue`, `src/features/admin/views/AdminOrganizationsView.vue`, `src/features/admin/views/AdminActionsView.vue`, `src/features/admin/views/AdminReportsView.vue`, `src/features/admin/views/AdminActivityView.vue`, `src/features/admin/components/AdminNavTabs.vue`, `src/features/admin/components/AdminStatusChip.vue`, `src/features/admin/components/AdminConfirmDialog.vue`, `src/features/auth/views/AccountView.vue`, `src/features/participation/views/MyActionsView.vue`.

## Files Removed

- `src/features/admin/components/AdminSummaryCard.vue` — superseded by the shared `SignalMetricCard.vue` (its one call site in `AdminDashboardView.vue` was migrated first).

## Folder Structure

No new top-level folders. `public/branding/` already existed (locale assets); `favicon.svg` was added alongside them.

## Packages Installed

None.

## Build Result

`npm run build` — succeeded with no errors at the last checkpoint run in this session. The final motion-system pass (scroll-reveal in `OHSection.vue`, global button press feedback, `EmptyState` entrance, `SignalIllustration` ambient motion) was added after that checkpoint per explicit instruction to skip re-validation, since the user had already confirmed the build/app working correctly.

## Lint Result

`npm run lint` (`eslint . --ext .js,.vue`) — clean at the last checkpoint run in this session, including a fix for one unused-import error (`OHCard` in `HomeView.vue`) surfaced by a background restyling pass.

## Test Result

No test script exists in `package.json` (Vitest permanently excluded) — none run.

## Manual Verification

Performed by the user directly; confirmed working. Additionally spot-checked in this session via Chrome automation before the final motion pass: Home (hero/categories/journey/CTA), Actions list (cards + discovery panel), Action Details, Map (frame + results), Login (split-screen panel), About, Unauthorized (restricted-tone empty state), Admin dashboard/actions (lifecycle vs. moderation badges kept distinct), and Organizer dashboard (metric cards + action cards) — no console errors observed in any of these.

## Remaining TODO

None outstanding for this pass. A follow-up visual QA of the motion-system additions made after the user's last validation checkpoint (scroll-reveal, button press feedback, illustration ambient motion) would be reasonable before considering this fully signed off, though none of them touch logic and all degrade safely.

## Suggested Next Feature

A short, dedicated accessibility contrast audit of the new Signal palette (coral-on-navy, amber icon-wells, category colors against their backgrounds) against WCAG AA, since this pass introduced several new color pairings at once.
