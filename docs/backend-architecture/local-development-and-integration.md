# Local Development and Integration

Covers Part 18 (seed data), Part 19 (local environment), Part 20 (incremental
implementation order, confirmed/refined from `docs/backend-discovery/frontend-backend-
replacement-map.md`), and Part 21 (OpenAPI strategy). No scripts, Docker files, or
code are created in this phase — this documents the design only.

---

## Local environment architecture

### Frontend

| Aspect | Design |
|---|---|
| Dev URL | `http://localhost:5173` (Vite default), pinned explicitly in `vite.config.js` during the implementation phase (not pinned today — a gap noted in discovery, closed here as a decision, not yet as an edit) |
| `VITE_DATA_SOURCE` | `mock` \| `api`, read per-service-file (see § Mixed mock/API strategy) |
| `VITE_API_BASE_URL` | `http://localhost:8080/api/v1`, already documented in `claude.md` and already wired into `services/http.js`'s unused `httpClient` |
| Mock/API switching | per-service-file branch, not a single global flag — see below |
| Axios client | `services/http.js`'s existing `httpClient`, gains a request interceptor (attach `Authorization: Bearer <accessToken>` from the `auth` store's in-memory token) and a response interceptor (on 401, attempt one silent `POST /auth/refresh`, retry the original request once, else propagate the failure) |
| Auth transport | `withCredentials: true` on `httpClient` (required for the refresh cookie, ADR-1) |
| Error mapping | a thin Axios response-error mapper converts `ApiErrorResponse.code` into the same `Error(code)` shape every mock service already throws, so every existing `*ErrorKey(code)` frontend helper keeps working unchanged |
| Dev proxy | recommended: Vite's `server.proxy` forwarding `/api` → `http://localhost:8080`, so the frontend and backend appear same-origin to the browser during local development — this sidesteps cross-origin cookie handling entirely in dev while production still uses real CORS + `SameSite=Strict` (the proxy is a *local-dev-only* convenience, not a production topology) |

### Backend

| Aspect | Design |
|---|---|
| Dev URL | `http://localhost:8080`, base path `/api/v1` |
| Profile | `application-local.yml` (Spring profile `local`), pointing at MySQL (either a locally-installed service or the optional Docker-Composed `mysql` service — both use the same environment variables, per ADR-17), `JWT_SECRET` sourced from a local `.env`/exported shell variable, never committed |
| Swagger/OpenAPI URL | `http://localhost:8080/swagger-ui.html` (springdoc default), available only when the `local`/`dev` profile is active |
| Health endpoint | `http://localhost:8080/actuator/health` |
| Logging | human-readable console logging locally (structured JSON reserved for non-local profiles, per `system-architecture.md` § Observability, to keep local console output readable during development) |

### Database

| Aspect | Design |
|---|---|
| Provisioning (ADR-17) | **Two equivalent, interchangeable options**: (A) MySQL 8 installed directly as a local Ubuntu system service, or (B) `docker compose up -d mysql` starting only a MySQL 8 container (`compose.yml`, one service, no other containers). Either way the Spring Boot application itself always runs directly via `mvn spring-boot:run`/IntelliJ, never containerized locally, for the fastest edit/run loop — Docker is optional and only ever used for the database, never the application |
| Port | `3306` (MySQL's default), mapped to the host unchanged when using Option B |
| Persistent volume (Option B only) | a named Docker volume so data survives `docker compose down` (but not `down -v`), so seed data doesn't need reloading on every restart |
| Database/user naming | `onehelp` database, `onehelp` user, password from a local-only `.env` (never committed, mirroring the frontend's own existing secret-handling convention) — identical naming and environment variables whether MySQL is local-installed (Option A) or Docker-Composed (Option B) |
| Character set/collation | `utf8mb4` with `utf8mb4_0900_ai_ci` collation (ADR-17) — configured at database-creation time for Option A, and via the MySQL image's startup configuration for Option B |
| Flyway startup behavior | runs automatically on application startup (`spring.flyway.enabled=true`, the default), validates the schema before Hibernate touches anything (`ddl-auto: validate`, **never** `update`/`create` — Flyway is the only schema-authoring mechanism, matching `claude.md`'s general "no ad hoc infra" ethos) |

---

## Mixed mock/API strategy

The recommended switch is **per service file, not a single global flag** — confirmed
safe by re-checking the actual frontend dependency graph
(`docs/backend-discovery/frontend-mock-inventory.md`) rather than assumed: every store
in the frontend talks to its feature's own `*.service.js` through a stable function
signature (`login`, `getActions`, `joinAction`, etc.), and no store reaches directly
into another feature's mock storage except the handful of already-documented
cascade-delete bypasses (which disappear entirely once the backend's own
`OrganizerDemotionService` performs that cascade server-side — see the implementation
order below).

Mechanically: each `*.service.js` file gains a branch —

```js
const USE_API = import.meta.env.VITE_DATA_SOURCE === 'api'
export async function login(email, password) {
  return USE_API ? apiLogin(email, password) : mockLogin(email, password)
}
```

— so `VITE_DATA_SOURCE=api` can be set globally in `.env.local` while individual
service files are migrated one at a time during implementation (each file's own
`USE_API` branch is what actually matters, not a single top-level switch); or, more
granularly, a per-domain override (`VITE_DATA_SOURCE_AUTH=api`,
`VITE_DATA_SOURCE_ACTIONS=mock`, etc.) if finer control during a long-running
migration is useful. Either mechanism is a small, additive frontend change performed
during the *implementation* phase — not designed further here, since Part 24 excludes
frontend code changes from this architecture phase.

**This is what makes "test every completed domain immediately" possible**: once the
`auth` domain's backend is live, only `auth.service.js`'s internal branch changes;
every other feature continues calling its own still-mocked service, completely
unaffected, because no other frontend file imports `auth.service.js`'s internals
directly (only `useAuthStore()`'s public API, which is unchanged).

---

## Seed and development data

**Design only — no seed script is created in this phase.**

| Requirement | Design |
|---|---|
| One volunteer, one organizer, one administrator | mirrors the mock's exact 3 demo accounts (`docs/backend-discovery/domain-models.md` § User) — same demo email pattern (`volunteer@onehelp.local`, etc.), so any existing documentation/demo instructions referencing these emails keep working |
| Passwords hashed | seed migration/loader hashes each demo password with the same `BCryptPasswordEncoder` used at runtime — **no plaintext password ever appears in a migration file or committed seed data**; the demo passwords themselves (not their hashes) are documented in a development-only README/environment doc, never in this architecture documentation (matching Part 15's "no plaintext credentials appear" instruction, already honored throughout this entire discovery+architecture effort) |
| One approved organization | seed organizer's organization, `status = APPROVED` |
| Optional pending/rejected/suspended organizations | 2–3 additional seed organizations covering each remaining `OrganizationStatus`, owned by additional seed-only volunteer-turned-organizer accounts (not the "real" demo organizer, to keep the primary demo account's state simple/predictable) |
| Actions covering all lifecycle/moderation states | mirrors the mock's own deliberate coverage (`docs/backend-discovery/frontend-mock-inventory.md`: "act-001 = PUBLISHED, act-008 = DRAFT, act-012 = CLOSED, act-013 = CANCELLED") — the seed data reproduces the same intentional-coverage design, plus at least one action in each `ActionModerationStatus` |
| Sample participations | **real rows**, not phantom counts (ADR-5) — every seed action with a nonzero "registered" appearance has actual `participations` rows backing it, closing the mock's own phantom-count gap explicitly rather than reproducing it |
| Sample attendance | at least one `CHECKED_IN` and one `CHECKED_OUT` sample, tied to real seed participations |
| Sample reports | at least one `OPEN` report, for admin-workflow demo purposes |
| Seeds disabled/controlled in production | seed loading is gated behind the `local`/`dev` Spring profile only (e.g. a Flyway "repeatable" migration or a `CommandLineRunner` guarded by `@Profile({"local","dev"})`) — never runs against a production profile, and is idempotent (safe to run repeatedly against the same local database without duplicating rows) |
| No phantom registered counts | explicit design requirement (ADR-5) — enforced by construction, since `registeredCount` is never a stored/seedable field at all |

---

## OpenAPI strategy

**Decision: annotation-driven springdoc-openapi**, not contract-first.

**Reasoning**: contract-first (hand-authoring an OpenAPI YAML/JSON spec and generating
server stubs from it) earns its overhead when multiple independent teams/services
need to agree on a contract before either side's code exists, or when a public,
versioned, externally-consumed API is the product itself. Here, one team owns both
the frontend and backend, the contract is already fully specified in this very
document (`rest-api-design.md`), and springdoc's annotation-driven approach keeps the
OpenAPI spec automatically in sync with the actual controller code as it evolves,
which is the simpler, lower-maintenance choice for this project's size — matching the
brief's own "prefer the simplest maintainable method" instruction.

| Aspect | Design |
|---|---|
| Grouping | one springdoc "group" per module (`auth`, `users`, `organizations`, `actions`, `participation`, `attendance`, `reports`, `admin`) via `@Tag`, so Swagger UI's endpoint list mirrors `system-architecture.md`'s module boundaries |
| Auth requirements | a shared `SecurityScheme` (`bearerAuth`, HTTP bearer, JWT format) declared once in `common`'s OpenAPI configuration bean, referenced by every non-public controller via `@SecurityRequirement` |
| Shared error schema | `ApiErrorResponse` (`dto-catalogue.md`) registered once as a reusable OpenAPI component schema, referenced by every documented error response across all endpoints — not redefined per-endpoint |
| Pagination schema | `PageResponse<T>` similarly registered once as a generic reusable schema |
| Example requests/responses | springdoc's `@ExampleObject` annotations on the more complex/ambiguous endpoints only (e.g. the QR check-in flow, the organizer-demotion cascade) — not exhaustively on every trivial CRUD endpoint, to avoid annotation noise disproportionate to the value |
| Dev Swagger availability | enabled only under `local`/`dev` profiles (`springdoc.swagger-ui.enabled` gated by profile) |
| Production exposure policy | **disabled by default in production** (`springdoc.api-docs.enabled=false` in the production profile) — an internal API surface for one first-party frontend does not need a publicly browsable interactive doc exposed to the internet; if external API consumers are ever a real requirement, this is a one-line config change to re-enable, deliberately not the default |

---

## Incremental implementation order (confirmed against the actual module dependency graph)

This order was checked against `system-architecture.md`'s dependency diagram, not
assumed — module dependency direction (`common` → `users` → `auth`/`organizations` →
`actions`/`moderation` → `participation` → `attendance`/`reports` → `adminactivity` as
a sink) matches the discovery's original recommended order exactly, confirming it is
still safe.

### Phase 1 — Authentication and current user

- **Backend entities/endpoints**: `users`, `refresh_tokens`; `/auth/register`,
  `/auth/login`, `/auth/refresh`, `/auth/logout`, `/users/me`.
- **Frontend services switched**: `auth.service.js`.
- **Still on mock**: everything else.
- **Dependencies**: none (first phase).
- **Local test scenario**: register a new volunteer, log in as each of the 3 seed
  roles, refresh across a page reload, log out, confirm a suspended seed account
  (added specifically for this test) cannot log in.
- **Rollback strategy**: flip `VITE_DATA_SOURCE_AUTH` back to `mock`; no other
  frontend feature is affected since nothing else depends on `auth.service.js`'s
  internals (only `useAuthStore()`'s public shape, unchanged).
- **Completion criteria**: all 5 auth endpoints pass their local test scenarios; the
  frontend's existing login/register/account views work unmodified against the real
  backend.

### Phase 2 — Users and roles

- **Backend endpoints**: `/admin/users/**`.
- **Frontend services switched**: `adminUsers.service.js`.
- **Dependencies**: Phase 1 (admin authentication).
- **Local test scenario**: admin lists/suspends/reactivates/edits a seed volunteer;
  confirm self-suspension is blocked; confirm a suspended user's next login fails.
- **Rollback**: same per-file flip.
- **Completion criteria**: `AdminUsersView.vue` fully functional against the real
  backend with `auth`+`users` live, everything else still mocked.

### Phase 3 — Organizations and applications

- **Backend endpoints**: `/organizer-applications/**`, `/organizations/me`,
  `/organizations/me/demote`, `/admin/organizations/**`.
- **Frontend services switched**: `organizationApplication.service.js`,
  `organizerDemotion.service.js`, `organizations.service.js` (admin-side).
- **Dependencies**: Phases 1–2 (role granting on approval touches `users`).
- **Local test scenario**: submit an application as a seed volunteer, approve it as
  admin, confirm the role flips to organizer and the volunteer must re-authenticate
  (ADR-3); reject an application with a reason; resubmit; suspend/restore an
  organization; self-demote an organizer and confirm the cascade (empty at this phase,
  since actions don't exist server-side yet — full cascade testing resumes in Phase 4+
  once actions are also live).
- **Frontend note**: `organizationApplication.store.js`'s `membership` field is
  dropped in this phase (ADR-4 contract change) — a small, explicitly-flagged
  frontend edit, not a silent break.
- **Completion criteria**: the full organizer-application lifecycle works end-to-end
  against the real backend.

### Phase 4 — Actions and public discovery

- **Backend endpoints**: `/actions/**`, `/organizer/actions/**` (excluding
  participants/attendance/QR sub-resources, which wait for Phases 5–6),
  `/admin/actions/**` moderation endpoints, `v_public_actions` view live.
- **Frontend services switched**: `actions.service.js`, `organizerActions.service.js`,
  `actionModeration.service.js`.
- **Dependencies**: Phase 3 (organization-status gate for publishing and visibility).
- **Caveat carried over from discovery, confirmed still correct**: the
  moderation-status data model (Phase 4's own `action_moderation` table and its
  `PENDING_REVIEW` default) must exist by this phase even though the *admin
  moderation-management UI* workflow can be exercised fully only once
  `AdminActionModerationController`'s transition endpoints are also live — in
  practice both ship together in this phase, since they are the same backend module
  (`moderation`), so this caveat does not actually require splitting the phase further.
- **Local test scenario**: create/edit/publish/close/cancel an action as the seed
  organizer; confirm it appears in the public list only once approved+published+org-
  approved; approve/reject/hide/restore as admin; confirm the public 404-not-403
  policy for a draft action's direct-by-id request.
- **Completion criteria**: public discovery and organizer action management fully
  live; `registeredCount` correctly shows `0` for every action until Phase 5 makes
  joining possible (an expected, temporary state, not a bug).

### Phase 5 — Participation

- **Backend endpoints**: `/actions/{id}/participate`, `/participations/me`.
- **Frontend services switched**: `participation.service.js`. `participationCount.js`'s
  overlay logic becomes dead code once this phase ships (ADR-5) — flagged as a
  frontend cleanup opportunity for this phase's implementation, not performed here.
- **Dependencies**: Phase 4 (action eligibility checks).
- **Local test scenario**: join/cancel as the seed volunteer; confirm capacity
  enforcement and duplicate-join prevention; confirm ADR-10's closed-action rejection
  (a gap the mock itself never enforced — this is the first point it becomes
  testable).
- **Completion criteria**: `MyActionsView.vue` and `ParticipationPanel.vue` fully
  functional against the real backend.

### Phase 6 — Attendance and QR

- **Backend endpoints**: `/attendance/**`, `/organizer/actions/{id}/qr-token`,
  `/organizer/actions/{id}/participants`, `/organizer/actions/{id}/attendance`.
- **Frontend services switched**: `attendance.service.js`.
- **Dependencies**: Phases 4–5 (action ownership, confirmed-participation
  requirement).
- **Local test scenario**: generate/regenerate a QR token, confirm the old token is
  rejected after regeneration (ADR-6); QR check-in as the volunteer; manual check-in/
  check-out as the organizer; confirm the hard check-in window (ADR-11) rejects a
  too-early/too-late QR scan while manual check-in remains unaffected.
- **Completion criteria**: the full check-in flow (both methods) works end-to-end.

### Phase 7 — Reports and moderation (report-handling completion)

Moderation-transition endpoints already shipped in Phase 4; this phase completes the
**reports** side specifically.

- **Backend endpoints**: `/actions/{id}/reports`, `/admin/reports/**`.
- **Frontend services switched**: `reports.service.js`.
- **Dependencies**: Phase 4 (action existence/ownership for the own-action check).
- **Local test scenario**: submit a report as a volunteer; confirm own-action
  rejection; confirm ADR-12's widened duplicate-active check (open **and**
  investigating both block); resolve/dismiss/reopen as admin.
- **Completion criteria**: `ReportActionCard.vue` and `AdminReportsView.vue` fully
  functional.

### Phase 8 — Admin activity

- **Backend endpoints**: `/admin/activity`, `/admin/dashboard/summary`.
- **Frontend services switched**: `activityLog.service.js`.
- **Dependencies**: all prior phases (every phase's own service calls now write real
  activity entries via `ActivityLogger`, per `system-architecture.md`).
- **Local test scenario**: perform one action from each prior phase's admin
  operations, confirm each produces exactly the expected `AdminActivityActionType`
  entry, including the newly-added ones (`ACTION_CREATED`, `ACTION_UPDATED`,
  `USER_PROFILE_UPDATED`, `ATTENDANCE_MANUAL_RECORDED`) that the mock itself never
  logged.
- **Completion criteria**: `AdminActivityView.vue` and the admin dashboard's activity
  widget fully functional; this is also the point at which the mock's own
  `organizerDemotion.service.js`-style direct cross-feature storage bypasses have been
  fully replaced by this design's module-interface pattern everywhere, with nothing
  left on the mock data source at all.

**The user's stated intent — running frontend and backend locally together and
testing every completed domain immediately — is satisfied at the end of every phase
above**, not only at the very end: each phase is independently demoable against a
partially-mocked frontend, per the mixed mock/API strategy above.
