# Frontend-to-Backend Replacement Map

This document covers the mock-to-API migration mapping and the recommended
incremental implementation order, evaluated against the actual dependency graph
documented in `frontend-mock-inventory.md` (not assumed). It also covers the local
dev integration strategy for running the frontend and the future Spring Boot backend
side by side. No implementation happens in this phase.

---

## Replacement matrix

For each mock responsibility: current implementation, future backend domain, the
frontend service that gets replaced, and what stays untouched.

| Mock responsibility | Current implementation | Future backend domain | Frontend service replaced | Stores/components that stay unchanged |
|---|---|---|---|---|
| User auth + session | `auth/mocks/users.mock.js`, `auth.service.js`, `onehelp.auth.session` | Spring Security + JWT/session auth | `auth.service.js`'s internals (function signatures/return shapes preserved) | `auth.store.js`, every view/component consuming `useAuthStore()` |
| Role/profile overrides | `userRole.storage.js`, `userProfileOverride.storage.js` | Mutable columns on the `users` table | folded into the same auth/user endpoints | same |
| Account status/suspension | `admin/mocks/userStatus.storage.js` | `users.status` column | `adminUsers.service.js` | `adminUsers.store.js` |
| Organizations + applications | `admin/mocks/organizations.mock.js` + `organizations.storage.js` + `organizationMembership.storage.js` | `organizations` table (unique `organizer_user_id`) — recommend **not** carrying the separate membership table forward, see risks doc | `organizations.service.js`, `organizationApplication.service.js` | `adminOrganizations.store.js`, `organizationApplication.store.js` |
| Organizer demotion cascade | `organizerDemotion.service.js` | One transactional backend endpoint | `organizerDemotion.service.js` | `OrganizerOrganizationView.vue`, `AdminOrganizationsView.vue` unchanged |
| Actions (public + organizer) | `actions.mock.js` + `organizerActions.storage.js` | `actions` table | `actions.service.js`, `organizerActions.service.js` | `actions.store.js`, `organizer.store.js` |
| Action visibility policy | `actionVisibility.js` | Backend query/view combining lifecycle + moderation + org status | folded into `actions.service.js`'s `getActions`/`getActionById` | none — this becomes purely server-side filtering, the frontend never re-implements the policy |
| Participation | `participations.storage.js` | `participations` table | `participation.service.js` | `participation.store.js` |
| Attendance | `attendance.storage.js` | `attendance` table | `attendance.service.js` | `attendance.store.js` |
| QR sessions/tokens | `qrSession.storage.js`, `qrToken.js` | Signed token (JWT/HMAC) + short-TTL cache, **not** necessarily a durable table (see risks doc) | `attendance.service.js`'s QR-specific methods | `attendance.store.js`, `OrganizerCheckInView.vue`, `CheckInView.vue` |
| Action moderation | `actionModeration.storage.js` | `action_moderation` table or a status column on `actions` | `actionModeration.service.js` | `adminActions.store.js` |
| Reports | `reports.storage.js` | `reports` table | `reports.service.js` | `adminReports.store.js`, `ReportActionCard.vue` |
| Admin activity log | `activityLog.storage.js` | `admin_activity_log` table + a centralized write path (recommend consolidating the 5 scattered `logActivity` call sites into one backend-side audit mechanism) | `activityLog.service.js` (currently read-only — gains a real write path implicitly via whichever endpoints trigger it) | `AdminActivityView.vue`, `AdminDashboardView.vue` |

**Explicitly out of scope for replacement** (frontend-only forever, confirmed no
backend equivalent needed): `stores/locale.store.js` (`onehelp.locale`),
`stores/notifications.store.js`, `utils/mockResponse.js`, `utils/date.js`,
`utils/normalizeSearchText.js`, the entire `features/map/**` presentational/computation
layer (reads action data from the `actions` store, never localStorage directly).

---

## Recommended incremental implementation order

The brief's suggested default order (Authentication → Users/Roles → Organizations/
Applications → Actions/Discovery → Participation → Attendance → QR → Reports/
Moderation → Admin Activity) was checked against the actual import graph in
`frontend-mock-inventory.md` rather than assumed correct. **It is confirmed to be the
safe order** — every domain's upstream dependencies are already satisfied by the
domains that precede it:

1. **Authentication and current user** — no upstream dependency on anything else;
   everything downstream depends on it (`useAuthStore()` is read by every other
   feature). Must be first.
2. **Users and roles** — depends only on (1). `adminUsers.service.js` reads
   `getAllUsers`/`getUserById` from auth.
3. **Organizations and organizer applications** — depends on (1) and (2) (role
   granting on approval, `setUserRoleOverride`). Nothing in domains 4–9 can be
   correctly gated (organization-status checks) until this exists.
4. **Actions and public discovery** — depends on (3) for the organization-status leg
   of `isActionPubliclyVisible` and the publish gate (`checkOrganizationGate`). Also
   depends on admin's moderation-status default (see note below).
5. **Participation** — depends on (4) (`getActionById` for join-time validation, past-
   date/capacity checks).
6. **Attendance** — depends on (3) organizer/action ownership, (4) action visibility,
   (5) confirmed-participation requirement. Confirmed via the service's own imports
   (`organizer`, `actions`, `participation`) — attendance cannot be meaningfully
   implemented before all three.
7. **QR tokens** — same file/feature as (6); can ship alongside attendance rather than
   as a strictly separate phase, since `qrToken.js`/`qrSession.storage.js` have no
   dependents outside the attendance feature itself.
8. **Reports and moderation** — reports depend on (4) (action existence, own-action
   check). Moderation status is read by (4)'s visibility policy, which means **action
   moderation's default-value logic (`approved` for seed data, `pendingReview`
   otherwise) needs to exist by the time step 4 ships**, even though full admin
   moderation *workflow* (approve/reject/hide/restore UI) can safely wait until step 8.
   This is the one place the naive reading of the brief's order needs a caveat: don't
   defer the moderation *status default* itself, only the admin *moderation management*
   endpoints.
9. **Admin activity** — depends on all of the above as *sources* of loggable events,
   but has no other feature depending on it. Safe to implement last, and safe to
   backfill/centralize the scattered logging call sites at this point without touching
   anything upstream.

**One structural caveat that applies across all nine steps**: because
`actionVisibility.js` ANDs three gates (organizer status, moderation status,
organization status) sourced from three different backend domains (actions,
admin/moderation, organizations), the **public actions read endpoint (step 4) cannot
be feature-complete until organizations (step 3) and at least the moderation-status
data model (part of step 8) both exist**. In practice this means: implement the
moderation-status column/default alongside actions (step 4), and defer only the
*admin UI workflow* for approve/reject/hide/restore to step 8.

---

## Local integration strategy

### Frontend

- **Expected Vite dev URL**: not currently configured beyond Vite's default (`http://localhost:5173`); no `vite.config.js` override was found for this during discovery. Confirm/pin this explicitly when the backend integration phase begins.
- **Environment variable for backend base URL**: `VITE_API_BASE_URL` — already
  referenced today by `services/http.js` (`axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL, timeout: 10000 })`) and documented in `claude.md` as
  `http://localhost:8080/api/v1`. This Axios instance exists but is currently **dead
  code** (no other file imports it) — it becomes load-bearing on day one of real
  integration.
- **Mock-vs-real API switching strategy**: no switch exists today — every service
  unconditionally uses its localStorage-backed mock module. The brief's suggested
  `VITE_DATA_SOURCE=mock|api` env var is a reasonable, minimal-footprint mechanism:
  each `*.service.js` file's exported functions would branch on
  `import.meta.env.VITE_DATA_SOURCE === 'api'` and either call the existing
  mock-storage path or `httpClient`. Because every store already calls services
  through a stable function signature (confirmed throughout this discovery: stores
  never talk to storage/mocks directly except in the few documented cross-feature
  bypasses), this switch can be introduced **per service file**, independently — a
  service can move to `api` mode while every other service stays on `mock`, which is
  exactly what the recommended domain-by-domain order above requires.
- **CORS**: the Spring Boot backend will need to allow the Vite dev origin
  (`http://localhost:5173` or whatever is pinned) for local development; not yet
  configured anywhere in the frontend (no CORS-related code found).
- **Cookie or Authorization-header considerations**: the current mock session
  (`onehelp.auth.session`) is plain localStorage, read directly by the frontend. A real
  backend should decide between an `Authorization: Bearer <jwt>` header (simplest to
  slot into the existing `httpClient` via an Axios request interceptor reading from the
  `auth` store) versus an HttpOnly cookie session (more secure against XSS, but
  requires `withCredentials: true` on `httpClient` and matching CORS
  `Access-Control-Allow-Credentials` configuration). Not decided by this discovery —
  flagged in risks-and-open-decisions.md as an architecture decision required before
  step 1 above.
- **Error handling**: the frontend's error-code vocabulary (`unknownEmail`,
  `actionFull`, `notOwner`, etc., one stable string per domain error, translated via
  each domain's `*ErrorKey()` helper) must be preserved by the backend's error
  responses — e.g. via a consistent error-response body shape (`{code: 'actionFull'}`)
  that an Axios response interceptor unwraps into the same kind of
  `Error('actionFull')` the mock services throw today, so `t(participationErrorKey(err.message))` and equivalent call sites across ~15 views need zero changes.
- **Development proxy option**: Vite's built-in dev server proxy
  (`server.proxy` in `vite.config.js`) is a viable alternative to raw CORS, forwarding
  `/api/**` requests to `http://localhost:8080` — recommended if cookie-based sessions
  are chosen (avoids third-party-cookie issues across two dev origins).

### Backend

- **Expected Spring Boot URL**: `http://localhost:8080` (matching `claude.md`'s
  documented `VITE_API_BASE_URL` example, `/api/v1` base path).
- **PostgreSQL through Docker**: not yet present anywhere in this repository (no
  `docker-compose.yml`/backend directory exists today) — to be created in the next
  phase.
- **Flyway migrations, development profile, seed/demo data, OpenAPI/Swagger, health
  endpoint**: all to be introduced in the next phase; this discovery only notes that
  the seed data the migrations must reproduce already exists, fully enumerated, in the
  frontend's own fixtures (`users.mock.js`'s 3 demo accounts, `organizations.mock.js`'s
  13 organizations, `actions.mock.js`'s 13 actions) — these are the natural first
  Flyway seed/demo dataset, preserving the same ids where practical so existing
  frontend-side test flows (e.g. the login screen's demo-credentials helper) keep
  working unchanged during the transition.

### Testing each backend feature as it lands

Because the mock-vs-real switch is recommended per-service-file (not a single global
flag), each of the nine domains in the implementation order above can be connected and
tested independently, in this pattern: implement the Spring Boot endpoint(s) for the
domain → flip that one service file's `VITE_DATA_SOURCE` branch to call `httpClient`
→ run the frontend against the live backend for that one feature while every other
feature continues running against its mock, confirming the store/view layer for that
feature needs no changes — exactly the incremental-migration guarantee this whole
discovery exercise exists to protect.
