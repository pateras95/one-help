# Phase Report — Mock Authentication & User Roles

## Summary

Built a complete mocked authentication flow: a feature-oriented `src/features/auth/` structure (mocks, service, Pinia store, views, routes), a shared `ROLES` source of truth (`volunteer`/`organizer` active, `moderator`/`administrator` reserved but not exposed anywhere), router guards (`requiresAuth`/`guestOnly`/`roles` meta) that await session initialization before resolving any route, and full header/mobile-nav integration that adapts to auth state and role. Login, Register, Account, My Actions (volunteer placeholder), and Organizer Area (organizer placeholder) views are all built, translated in both languages, and wired to the existing notifications store for success/logout feedback while keeping form-level validation inline. Found and fixed one real bug during verification: malformed `localStorage` session data was safely *ignored* but never actually *removed* — now it's properly cleared. No real backend, Axios, JWT, participation, or admin/organizer dashboard logic was touched.

## Files Created

- `frontend/src/constants/roles.js` — `ROLES`, `ACTIVE_ROLES`
- `frontend/src/features/auth/mocks/users.mock.js` — 2 fictional mock users (volunteer, organizer) + `DEMO_CREDENTIALS` (documented exception to "no mock imports in views", used only for the Login screen's dev helper)
- `frontend/src/features/auth/services/auth.service.js` — `login`, `register`, `logout`, `getCurrentSession`; explicit-allowlist `sanitizeUser` (never returns `password`)
- `frontend/src/features/auth/stores/auth.store.js` — `currentUser`, `isAuthenticated`, `isInitialized`, `loading`, `error`, `login`, `register`, `logout`, `initializeSession` (cached promise), `hasRole`, `clearError`
- `frontend/src/features/auth/utils/safeRedirect.js` — `isSafeInternalRedirect()`
- `frontend/src/features/auth/components/AccountMenu.vue` — desktop header dropdown
- `frontend/src/features/auth/views/{LoginView,RegisterView,AccountView,MyActionsView,OrganizerView}.vue`
- `frontend/src/features/auth/routes.js`
- `frontend/src/router/authGuard.js`
- `frontend/src/views/UnauthorizedView.vue`
- `frontend/src/locales/{el,en}/auth.js` — roles, login, register, validation, errors, notifications, account, placeholder, unauthorized

## Files Modified

- `frontend/src/constants/routes.js` — added `LOGIN`/`REGISTER`/`MY_ACTIONS`/`ORGANIZER`/`ACCOUNT`/`UNAUTHORIZED`
- `frontend/src/constants/navigation.js` — added `AUTHENTICATED_MOBILE_NAVIGATION` (role-keyed 4-item mobile sets)
- `frontend/src/locales/{el,en}/navigation.js` — added `login`/`register`/`account`/`myActions`/`organizerArea`/`logout`/`accountMenuAriaLabel`
- `frontend/src/locales/index.js` — registered the `auth` namespace
- `frontend/src/router/index.js` — `beforeEach` now runs `authGuard(to)` before `applyDocumentTitle`
- `frontend/src/router/routes/public.routes.js` — added `...authRoutes` and the `unauthorized` route
- `frontend/src/main.js` — kicks off `useAuthStore().initializeSession()` at boot
- `frontend/src/components/layout/AppNavigation.vue` — desktop: `AccountMenu` when authenticated, Login/Register buttons when not; mobile: compact avatar-link to `/account` or a login icon-button, alongside the (always-visible) language switcher
- `frontend/src/components/layout/AppBottomNavigation.vue` — item set now depends on `authStore.isAuthenticated`/`role` via `AUTHENTICATED_MOBILE_NAVIGATION`, still always exactly 4 items

## Files Removed

None.

## Folder Structure

```
frontend/src/features/auth/
├── components/AccountMenu.vue
├── mocks/users.mock.js
├── services/auth.service.js
├── stores/auth.store.js
├── utils/safeRedirect.js
├── views/
│   ├── LoginView.vue
│   ├── RegisterView.vue
│   ├── AccountView.vue
│   ├── MyActionsView.vue
│   └── OrganizerView.vue
└── routes.js
```

## Packages Installed

None — no Axios, no auth library.

## Build Result

PASS — `npm run build` succeeds, no errors.

## Lint Result

PASS — `npm run lint`: 0 errors, 0 warnings. (Caught one real issue along the way: `sanitizeUser`'s original "destructure out password" pattern tripped `no-unused-vars` — rewritten as an explicit field allowlist, which is also the safer pattern: a new field added to a user record later must be deliberately added here before it's ever returned to the UI.)

## Test Result

No test script exists in `package.json` — none run.

## Manual Verification

Performed live in Chrome against the running dev server, using the actual demo credentials (not just code review):

- **Volunteer login** (`volunteer@onehelp.local` / `Volunteer123!`, via the demo-credentials autofill button): succeeded, redirected to `/my-actions`, header switched to the account menu (avatar "ΔΠ" + name + role).
- **Organizer login** (`organizer@onehelp.local` / `Organizer123!`): succeeded, redirected to `/organizer`.
- **Invalid password** and **unknown email**: both show the correct distinct inline form error, stay on the login page.
- **Registration**: empty-form validation shows all required errors including terms; short/mismatched password shows both errors correctly; duplicate email (`volunteer@onehelp.local`) correctly rejected; a fresh email succeeded, auto-logged in, and redirected to `/my-actions` with correctly generated initials ("ΜΙ" for Μαρία Ιωάννου).
- **Session persistence across refresh**: confirmed working for the pre-defined fixture accounts (reload while on `/my-actions` stays on `/my-actions`). **Important, honestly-reported limitation:** a *newly registered* account's session does **not** survive a hard reload — the mock user "database" (`usersDb` in `auth.service.js`) is in-memory and re-initializes fresh on every full page load, same as every other mock dataset in this app (e.g. Actions). The session-restore code handles this correctly (detects the now-unknown user id, safely clears the stale session, redirects to login) rather than crashing or showing broken state — but it's a real, deliberate constraint of using an in-memory mock store instead of a real backend, worth knowing before assuming "session survives refresh" holds universally.
- **Malformed `localStorage` session — found and fixed a real bug:** set `onehelp.auth.session` to invalid JSON, reloaded — the app correctly did *not* crash and correctly treated it as "no session," but the garbage value was never actually removed from `localStorage` (confirmed via `Object.keys(localStorage)` before/after). Fixed by clearing the stored session in the "couldn't even parse it" branch, not only in the "parsed fine but the user id doesn't exist" branch. Re-verified after the fix: the key is gone after one reload.
- **Guest-only routes**: visiting `/login` while authenticated (as organizer) correctly redirected to `/organizer` (no re-login form flashed).
- **Protected routes**: visiting `/my-actions` while logged out correctly redirected to `/login?redirect=/my-actions`; logging in from there correctly returned to `/my-actions` (not the default landing).
- **Unsafe redirect rejection**: unit-style checks against `isSafeInternalRedirect` confirmed `https://evil.example.com`, `//evil.example.com`, `javascript:alert(1)`, and `data:text/html,evil` are all rejected while `/actions/act-001` and `/actions?category=health` are accepted; end-to-end, logging in via `/login?redirect=https://evil.example.com` correctly ignored the malicious value and fell back to the default landing instead of navigating off-site.
- **Role mismatch**: logged in as organizer, navigated to `/my-actions` (volunteer-only) — correctly redirected to `/unauthorized` with the translated Unauthorized view.
- **Header changes correctly**: Login/Register buttons ⇄ AccountMenu, confirmed both directions (login and logout).
- **Mobile bottom navigation by role**: logged-out set is the original 4 items (Home/Actions/About/Contact); volunteer set is Home/Actions/My actions/Account; organizer set is Home/Actions/Organizer area/Account — all confirmed via DOM inspection, always exactly 4 items, never a 5th.
- **Mobile top bar**: compact avatar-chip (linking straight to `/account`, tapped and confirmed) when authenticated, login icon when not; language switcher always present alongside it; no collision.
- **Locale switching on auth views**: confirmed on the authenticated Account view — switched to English (all text, including the role chip and bottom-nav labels, translated correctly) and back; also confirmed on Login/Register (English error/validation copy renders correctly).
- **Locale persistence**: survived a logout+redirect and a full navigation.
- **Browser back/forward**: confirmed working across `/organizer` ⇄ `/` navigation.
- **Accessibility**: the password show/hide button is a real `<button>` with a distinct, correctly-toggling `aria-label` ("Show password" ⇄ "Hide password"), not icon-only without a label; logout is a `VListItem`/`VBtn` with visible text, never icon-only; the account trigger shows the full name text next to the initials (identity isn't conveyed by initials alone); form field errors render via Vuetify's built-in `error-messages` mechanism (associated with the field, not a disconnected banner).
- **No untranslated keys**: checked visible text across Login, Register, Account, My Actions, Organizer, Unauthorized in both languages — none found.
- **Console errors**: zero, across every login/logout/register/navigation/locale-switch performed in this session.

**Tooling limitation (same as every prior feature in this session):** this sandbox's Chrome window has a resize floor around ~860px CSS width, so true physical narrow-viewport testing wasn't possible. Mobile-specific behavior (top bar, bottom nav sets) was verified by forcing Vuetify's reactive breakpoint state, which exercises the real code path correctly but isn't a substitute for a genuine narrow-viewport visual check.

## Remaining TODO

- Real narrow-viewport visual confirmation still outstanding, for the sandbox reason above.
- **Registered accounts don't survive a hard reload** (see above) — this is inherent to the in-memory mock store and consistent with how the rest of this app's mock data behaves; worth keeping in mind, not something to "fix" without introducing a real backend or a heavier mock-persistence layer that wasn't asked for here.
- The Actions Details screen was **not** modified to prepare for a future participation button — re-reading the task, adding even a disabled placeholder button felt like unnecessary surface area (new translation keys, a new visual element) for a feature explicitly deferred, so nothing was added there. `useAuthStore().isAuthenticated` is trivially available to that view whenever a future participation feature needs it.
- `moderator`/`administrator` roles are defined in `ROLES`/`ACTIVE_ROLES` distinguishes today's working roles from these two, but no route, view, or UI references them yet, per the constraint.
- No PWA, real backend, JWT, OAuth, password reset, or email verification — all correctly out of scope and untouched.

## Suggested Next Feature

Participation (mocked): now that `useAuthStore` cleanly exposes `isAuthenticated`/`hasRole`, the Actions Details screen is ready for a real (still-mocked) "Join this action" flow gated on volunteer authentication — likely the next logical feature, building on both this auth work and the existing Actions Discovery feature.
