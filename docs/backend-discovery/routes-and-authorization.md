# Routes and Authorization Map

## Router structure

`router/index.js` creates the router (`createWebHistory`) with a single flat route
array assembled in `router/routes/public.routes.js` from per-feature route modules
(`actionsRoutes`, `authRoutes`, `organizerRoutes`, `attendanceRoutes`, `mapRoutes`,
`adminRoutes`, `organizerApplicationRoutes`) plus home/about/contact/unauthorized/
not-found defined inline. Despite the file being named `public.routes.js`, it contains
every route in the app, public and protected alike — there is no separate protected-
routes file; protection is expressed entirely via each route's `meta` object.

Every navigation runs through one global guard:

```js
router.beforeEach(async (to) => {
  const guardResult = await authGuard(to)
  if (guardResult !== true) return guardResult
  applyDocumentTitle(to.meta.titleKey)
  return true
})
```

## Guard logic (`router/authGuard.js`) — exact order

```js
export async function authGuard(to) {
  const authStore = useAuthStore()
  await authStore.initializeSession()

  const { requiresAuth, guestOnly, roles } = to.meta

  if (guestOnly && authStore.isAuthenticated) {
    return { path: defaultAuthenticatedPath(authStore.currentUser.role) }
  }

  if (requiresAuth && !authStore.isAuthenticated) {
    const query = isSafeInternalRedirect(to.fullPath) ? { redirect: to.fullPath } : undefined
    return { path: ROUTES.LOGIN, query }
  }

  if (requiresAuth && Array.isArray(roles) && !authStore.hasRole(...roles)) {
    return { path: ROUTES.UNAUTHORIZED }
  }

  if (to.path === ROUTES.BECOME_ORGANIZER && authStore.hasRole(ROLES.ORGANIZER)) {
    return { path: ROUTES.ORGANIZER }
  }

  return true
}
```

1. **Always** re-runs `authStore.initializeSession()` first (memoized singleton
   promise — cheap after the first call in a page lifetime, but the check is repeated
   on every single navigation, not just app boot).
2. `guestOnly` route + already authenticated → redirect to
   `defaultAuthenticatedPath(role)` (`organizer → /organizer`, `administrator →
   /admin`, else `/my-actions`).
3. `requiresAuth` route + not authenticated → redirect to `/login`, attaching
   `?redirect=<fullPath>` **only if** `isSafeInternalRedirect(to.fullPath)` passes
   (rejects non-strings, empty strings, non-leading-slash paths, protocol-relative
   `//...`, and `/scheme:` patterns — see `features/auth/utils/safeRedirect.js`).
4. `requiresAuth` route + `roles` array present + `hasRole(...roles)` false → redirect
   to `/unauthorized`.
5. **Special case**: navigating to `/become-organizer` while already an organizer force-
   redirects to `/organizer` — the permanent 1:1 rule means there is nothing left for
   them to do on that screen, regardless of how the link was reached (menu, direct URL,
   back/forward navigation).
6. Otherwise, proceed.

**Explicit code comment, worth repeating verbatim in any backend design discussion**:
> "This guard is a UX convenience — it hides pages the current mock session shouldn't
> see and points people at the right screen. It is NOT real security: everything it
> checks lives in browser-side state and localStorage, which any client can inspect or
> forge. A real backend must independently enforce the same rules."

### Redirect safety (`features/auth/utils/safeRedirect.js`)

```js
export function isSafeInternalRedirect(path) {
  if (typeof path !== 'string' || path.length === 0) return false
  if (!path.startsWith('/')) return false
  if (path.startsWith('//')) return false
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(path)) return false
  return true
}
```
Used both by the guard (building the `?redirect=` query) and by `LoginView.vue`/
`RegisterView.vue` (consuming `route.query.redirect` after a successful login/register)
— an open-redirect guard, since `redirect` is attacker-controllable via the URL.

---

## Full route catalogue

| Path | Name | Component | requiresAuth | guestOnly | roles | titleKey | Defined in |
|---|---|---|---|---|---|---|---|
| `/` | `home` | `HomeView.vue` | false | — | — | `navigation.home` | `router/routes/public.routes.js` |
| `/actions` | `actions` | `ActionsListView.vue` | false | — | — | `navigation.actions` | `features/actions/routes.js` |
| `/actions/:actionId` | `action-details` | `ActionDetailsView.vue` | false | — | — | `actions.details.genericTitle` | `features/actions/routes.js` |
| `/login` | `login` | `LoginView.vue` | — | true | — | `navigation.login` | `features/auth/routes.js` |
| `/register` | `register` | `RegisterView.vue` | — | true | — | `navigation.register` | `features/auth/routes.js` |
| `/my-actions` | `my-actions` | `participation/views/MyActionsView.vue` | true | — | `[VOLUNTEER]` | `navigation.myActions` | `features/auth/routes.js` (component lives in `participation` feature) |
| `/account` | `account` | `AccountView.vue` | true | — | — (any authenticated role) | `navigation.account` | `features/auth/routes.js` |
| `/organizer` | `organizer-dashboard` | `OrganizerDashboardView.vue` | true | — | `[ORGANIZER]` | `navigation.organizerArea` | `features/organizer/routes.js` |
| `/organizer/organization` | `organizer-organization` | `OrganizerOrganizationView.vue` | true | — | `[ORGANIZER]` | `organizer.organization.pageTitle` | `features/organizer/routes.js` |
| `/organizer/actions/new` | `organizer-action-create` | `OrganizerActionFormView.vue` | true | — | `[ORGANIZER]` | `organizer.form.createTitle` | `features/organizer/routes.js` |
| `/organizer/actions/:actionId/edit` | `organizer-action-edit` | `OrganizerActionFormView.vue` | true | — | `[ORGANIZER]` | `organizer.form.editTitle` | `features/organizer/routes.js` |
| `/organizer/actions/:actionId/participants` | `organizer-action-participants` | `OrganizerParticipantsView.vue` | true | — | `[ORGANIZER]` | `organizer.participants.title` | `features/organizer/routes.js` |
| `/organizer/actions/:actionId` | `organizer-action-details` | `OrganizerActionDetailsView.vue` | true | — | `[ORGANIZER]` | `organizer.details.pageTitle` | `features/organizer/routes.js` (registered last so the more specific `/edit`, `/participants` routes match first) |
| `/organizer/actions/:actionId/check-in` | `organizer-action-check-in` | `OrganizerCheckInView.vue` | true | — | `[ORGANIZER]` | `attendance.checkIn.pageTitle` | `features/attendance/routes.js` |
| `/check-in` | `check-in` | `CheckInView.vue` | true | — | — (any authenticated role; organizers see an in-page restriction notice instead of the scan UI, not a redirect) | `attendance.scan.pageTitle` | `features/attendance/routes.js` |
| `/map` | `map` | `MapView.vue` | false | — | — | `map.page.title` | `features/map/routes.js` |
| `/admin` | `admin-dashboard` | `AdminDashboardView.vue` | true | — | `[ADMINISTRATOR]` | `admin.dashboard.pageTitle` | `features/admin/routes.js` |
| `/admin/users` | `admin-users` | `AdminUsersView.vue` | true | — | `[ADMINISTRATOR]` | `admin.users.pageTitle` | `features/admin/routes.js` |
| `/admin/organizations` | `admin-organizations` | `AdminOrganizationsView.vue` | true | — | `[ADMINISTRATOR]` | `admin.organizations.pageTitle` | `features/admin/routes.js` |
| `/admin/actions` | `admin-actions` | `AdminActionsView.vue` | true | — | `[ADMINISTRATOR]` | `admin.actions.pageTitle` | `features/admin/routes.js` |
| `/admin/reports` | `admin-reports` | `AdminReportsView.vue` | true | — | `[ADMINISTRATOR]` | `admin.reports.pageTitle` | `features/admin/routes.js` |
| `/admin/activity` | `admin-activity` | `AdminActivityView.vue` | true | — | `[ADMINISTRATOR]` | `admin.activity.pageTitle` | `features/admin/routes.js` |
| `/become-organizer` | `become-organizer` | `BecomeOrganizerView.vue` | true | — | — (any role; guard force-redirects existing organizers to `/organizer`) | `becomeOrganizer.pageTitle` | `features/organizerApplication/routes.js` |
| `/about` | `about` | `AboutView.vue` | false | — | — | `navigation.about` | `router/routes/public.routes.js` |
| `/contact` | `contact` | `ContactView.vue` | false | — | — | `navigation.contact` | `router/routes/public.routes.js` |
| `/unauthorized` | `unauthorized` | `UnauthorizedView.vue` | false | — | — | `auth.unauthorized.title` | `router/routes/public.routes.js` |
| `/:pathMatch(.*)*` | `not-found` | `NotFoundView.vue` | false | — | — | `errors.notFound.title` | `router/routes/public.routes.js` |

No other `requiresAuth`/`guestOnly`/`roles` occurrences exist anywhere in the codebase
beyond this table and their reflection in `authGuard.js`.

---

## Role × route matrix

| Route group | Guest (logged out) | Volunteer | Organizer | Administrator |
|---|---|---|---|---|
| Home, Actions list/detail, Map, About, Contact | ✅ | ✅ | ✅ | ✅ |
| Login, Register | ✅ (guestOnly) | ❌ → redirected to role landing page | ❌ → `/organizer` | ❌ → `/admin` |
| My Actions (`/my-actions`) | ❌ → `/login?redirect=` | ✅ | ❌ → `/unauthorized` | ❌ → `/unauthorized` |
| Account (`/account`) | ❌ → `/login?redirect=` | ✅ | ✅ | ✅ |
| Check-in scan (`/check-in`) | ❌ → `/login?redirect=` | ✅ | ✅ (route allows it, but the page itself shows an in-page organizer-restriction notice instead of the scan UI) | ✅ (route allows it; page behavior for administrators was not found to differ from organizers in the read files — treated the same as "not a volunteer" by the scan flow's downstream checks) |
| Organizer dashboard/organization/actions CRUD/participants (`/organizer/**`) | ❌ → `/login?redirect=` | ❌ → `/unauthorized` | ✅ | ❌ → `/unauthorized` |
| Organizer QR check-in screen (`/organizer/actions/:id/check-in`) | ❌ → `/login?redirect=` | ❌ → `/unauthorized` | ✅ (ownership-checked at the service layer, not just the route) | ❌ → `/unauthorized` |
| Become Organizer (`/become-organizer`) | ❌ → `/login?redirect=` | ✅ | ❌ → force-redirected to `/organizer` (already owns one) | ✅ (route allows it; no guard blocks administrators specifically, though the application form itself has no special administrator handling documented) |
| Admin (`/admin/**`) | ❌ → `/login?redirect=` | ❌ → `/unauthorized` | ❌ → `/unauthorized` | ✅ |

**Reserved role**: `moderator` never appears in this matrix — no route grants or checks
it anywhere in the codebase.

---

## Navigation visibility (UI-level role gating, not route protection)

From `constants/navigation.js`, consumed by `AppNavigation.vue` (desktop) and
`AppBottomNavigation.vue` (mobile):

| Surface | Guest | Volunteer | Organizer | Administrator |
|---|---|---|---|---|
| Desktop top bar links | Home, Actions, Map, About, Contact (same for every role — this list does not change by role) | same | same | same |
| Desktop top bar, right side | Login + Register buttons | `AccountMenu` (role-gated items inside) | `AccountMenu` | `AccountMenu` |
| Mobile bottom nav | Home, Actions, Map, About (`MOBILE_NAVIGATION_ITEMS`, Contact excluded) | Home, Actions, Map, **My Actions** | Home, Actions, Map, **Organizer Area** | Home, Actions, **Admin**, **Account** (swaps out Map; includes Account directly since administrators have no distinct 4th destination) |
| `AccountMenu.vue` items | — | Account, My Actions (desktop only), Check-in, Become-organizer/Application-status (label swaps to "Application Status" while `PENDING`/`REJECTED`) | Organizer area, My Organization, Create Action (desktop only), Account | Admin dashboard, Account |

Falls back to `MOBILE_NAVIGATION_ITEMS` (the guest/generic list) if the authenticated
user's role has no entry in `AUTHENTICATED_MOBILE_NAVIGATION` — this is the defensive
path a `moderator` account would hit today, consistent with it never being exposed a
dedicated UI.

---

## Authorization rules currently enforced ONLY in the frontend

Every rule in the two tables above is enforced solely by `router/authGuard.js` reading
client-side Pinia/localStorage state. None of it is backed by a real server that could
reject a forged or replayed request. Additionally, several **business-rule**
authorization checks (distinct from route access) currently live only in service-layer
JavaScript that runs in the browser, and must be duplicated server-side verbatim — see
`business-rules.md` for the full list, most notably:

- Ownership checks for organizer actions, QR sessions, and manual check-in/check-out
  (`notOwner` errors throughout `organizerActions.service.js` and
  `attendance.service.js`).
- The volunteer-only join restriction — **not enforced at the service layer at all
  today**, only hidden in the UI (`ParticipationPanel.vue`). This is the single most
  important authorization gap to close in the backend, since a direct API call bypassing
  the frontend has no protection at all today.
- The admin-only mutation endpoints (approve/reject/suspend/restore for organizations,
  actions, users, reports) — protected today only by the route guard + the fact that
  the mock service has no separate "who is calling me" check beyond the `adminUserId`
  parameter the frontend itself supplies (i.e., a forged `adminUserId` would be trusted
  by the mock service as-is).

**Statement of fact for backend design**: every rule in this document that says
"enforced by the router guard" or "enforced in the UI component" must be re-implemented
as a real, request-authenticated check server-side (e.g. Spring Security method-level
authorization + ownership checks in the service layer) — none of the current frontend
enforcement carries any security weight on its own.
