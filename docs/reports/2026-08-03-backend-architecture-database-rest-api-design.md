# Phase Report — Backend Architecture, Database Schema & REST API Design

## Summary

Completed a documentation-only backend architecture design phase, transforming the
frozen frontend's fully-documented mock behavior (`docs/backend-discovery/**`) into a
complete, internally-consistent Spring Boot + PostgreSQL architecture: every critical
and architecture-level risk from the discovery phase was resolved into a numbered
decision, a full modular-monolith structure was defined, a complete PostgreSQL schema
(11 tables, 1 view, 13 enum types) was designed with database-level enforcement of
every business rule the mock only checked in JavaScript, a full REST API (9 endpoint
groups, traceable 1:1 back to every mock service method) was specified with DTOs and a
uniform error contract, and a phase-by-phase local integration plan was produced. No
Spring Boot code, SQL, Docker configuration, or frontend code was created or modified.

## Source Documents Reviewed

All eight `docs/backend-discovery/*.md` files (README, frontend-mock-inventory,
domain-models, service-contracts, business-rules, routes-and-authorization,
frontend-backend-replacement-map, risks-and-open-decisions), plus `claude.md` and
`docs/future-backend-data-model.md` — all were already fully read and authored/
cross-verified in this same session's prior discovery phase, and were used
directly as the authoritative source for every decision below; no frontend field,
route, service method, status, or workflow was invented.

## Architecture Decisions Resolved

18 numbered decisions (ADR-1 through ADR-16, plus two summary items), covering every
critical/architecture-level item from `risks-and-open-decisions.md` — authentication
transport, JWT signing algorithm, forced session invalidation, organization ownership
model, participation counts, QR token architecture, action moderation representation,
organization application representation, multilingual content storage, action-closure/
participation eligibility, check-in time window, duplicate-report scope, public-
visibility policy centralization, role storage model, database-level rule enforcement,
and build tool. Full problem/decision/rejected-alternatives/reasoning/impact write-up
for each is in `docs/backend-architecture/architecture-decisions.md` — not duplicated
here.

## Technology Stack Chosen

Java 21, Spring Boot 3, Spring Web (Servlet), Spring Data JPA, Spring Security, `jjwt`,
Jakarta Bean Validation, PostgreSQL 16, Flyway, springdoc-openapi (annotation-driven),
Docker Compose (PostgreSQL only, local dev), **Maven**, MapStruct, Lombok, Spring Boot
Actuator + Micrometer. Explicitly rejected: microservices, Kafka, Kubernetes, event
sourcing, CQRS, GraphQL, and Redis as a required MVP dependency.

## Backend Modules Designed

A single Spring Boot application, package-modularized by domain: `common` (shared
kernel), `auth`, `users`, `organizations` (includes applications + the demotion
cascade orchestration), `actions` (includes public discovery + the single visibility
policy), `moderation`, `participation`, `attendance` (includes QR), `reports`,
`adminactivity` (the append-only, no-outgoing-dependency activity-log sink). Full
responsibilities, owned entities/repositories/services/controllers/DTOs, and
cross-module interfaces for each are in `docs/backend-architecture/system-architecture.md`,
including a Mermaid dependency diagram confirming no circular module dependencies.

## Database Tables Designed

`users`, `refresh_tokens`, `organizations`, `actions`, `action_moderation`,
`action_moderation_history`, `participations`, `attendance`, `qr_check_in_tokens`,
`action_reports`, `admin_activity_log`, plus the `v_public_actions` view (the single
authoritative public-visibility query) and 13 native PostgreSQL enum types. Every
table's columns, types, nullability, defaults, keys, constraints, indexes, and
`ON DELETE` policy are fully specified in `docs/backend-architecture/database-schema.md`,
along with a Mermaid ER diagram and the time/timezone storage policy.

## REST Endpoint Groups Designed

Authentication; public actions; volunteer participation; organizations & applications;
organizer actions (CRUD, lifecycle, participants, attendance, QR); volunteer
attendance; reports; admin users; admin organizations; admin actions & moderation;
admin reports; admin activity; admin dashboard summary. Every endpoint's method, path,
auth/role requirement, request/response DTO, and status codes are in
`docs/backend-architecture/rest-api-design.md`, which also includes a traceability
table mapping every current frontend service method to its backend replacement,
module, tables, DTOs, business rules, and error codes.

## Authentication Strategy

Short-lived (15 min) signed access JWT returned in the response body and held only in
frontend memory (never localStorage), paired with a long-lived (30 day) opaque refresh
token delivered exclusively via an `HttpOnly`/`Secure`/`SameSite=Strict` cookie scoped
to `/api/v1/auth/refresh`, rotated on every use with reuse detection revoking the
entire token chain. Suspension and role changes additionally revoke all of a user's
refresh tokens immediately, bounding staleness to the access token's own remaining TTL
(≤15 minutes) rather than the refresh token's full lifetime. Full flow, CORS/CSRF
policy, resource-level ownership rules (closing the mock's volunteer-only-join gap and
every other frontend-only authorization rule), and a security checklist distinguishing
MVP-required from later-hardening items are in
`docs/backend-architecture/security-and-authentication.md`.

## Transaction and Integrity Strategy

Every business-critical operation — most importantly the organizer-demotion cascade
(previously nine independent, non-atomic mock writes) — is specified as one
`@Transactional` boundary with an explicit locking strategy: pessimistic
`SELECT ... FOR UPDATE` row locks for every genuinely concurrent read-then-write
sequence (participation capacity, duplicate check-in, moderation/report transitions,
the demotion cascade's organization row), backed by database-level partial unique
indexes as the final guarantee against every uniqueness rule the mock previously
enforced only in JavaScript. Full detail, including which races each lock/constraint
prevents, is in `docs/backend-architecture/transactions-and-integrity.md`.

## Local Integration Strategy

A per-service-file (not global) `VITE_DATA_SOURCE` switch, confirmed safe against the
actual frontend dependency graph, allows each of the eight implementation phases
(Authentication → Users/Roles → Organizations/Applications → Actions/Discovery →
Participation → Attendance/QR → Reports → Admin Activity) to go live independently
while every other frontend feature continues against its existing mock — each phase
has its own local test scenario and completion criteria. Full local dev topology
(Vite proxy recommendation, Docker-Composed PostgreSQL, Flyway-on-startup, springdoc
Swagger UI gated to dev profiles), seed-data design (real participation rows backing
every seeded count — no phantom counts), and OpenAPI strategy are in
`docs/backend-architecture/local-development-and-integration.md`.

## Documentation Files Created

- `docs/backend-architecture/README.md`
- `docs/backend-architecture/architecture-decisions.md`
- `docs/backend-architecture/domain-model-and-state-machines.md`
- `docs/backend-architecture/database-schema.md`
- `docs/backend-architecture/system-architecture.md`
- `docs/backend-architecture/security-and-authentication.md`
- `docs/backend-architecture/transactions-and-integrity.md`
- `docs/backend-architecture/dto-catalogue.md`
- `docs/backend-architecture/error-contract.md`
- `docs/backend-architecture/rest-api-design.md`
- `docs/backend-architecture/local-development-and-integration.md`

## Validation Result

- `git status`/`git diff --name-only` show only `docs/backend-architecture/**` and
  this report as new; no tracked application file was modified.
- The ER diagram (`domain-model-and-state-machines.md`) and the physical schema
  (`database-schema.md`) were authored together from the same table list and agree
  exactly (same 11 tables, same relationships, same column names).
- Every state machine's transitions (`domain-model-and-state-machines.md`) has a
  corresponding endpoint in `rest-api-design.md` and a corresponding transactional
  operation in `transactions-and-integrity.md`.
- The authorization matrix (`security-and-authentication.md`) reproduces
  `docs/backend-discovery/routes-and-authorization.md`'s role × route matrix exactly,
  with no role restriction dropped or loosened.
- The implementation order (`local-development-and-integration.md`) was checked
  against `system-architecture.md`'s actual module dependency diagram, confirming the
  discovery phase's originally recommended order is still safe.
- The permanent 1:1 organizer/organization rule is enforced at both the database level
  (`UNIQUE (organizer_user_id)`) and the service level (pre-check for a clean error).
- Volunteer-only participation is enforced server-side (`@PreAuthorize` +
  `security-and-authentication.md`'s resource-level rule) — closing the mock's most
  significant gap, where this was UI-only.
- The organizer-demotion cascade is fully transactional (`transactions-and-integrity.md`).
- QR tokens are specified as signed JWTs (ADR-6), not the mock's unsigned base64url
  encoding.
- Public action visibility has exactly one authoritative policy (`v_public_actions` +
  `ActionVisibilityQueryService`, ADR-13), referenced — never re-derived — everywhere
  it is needed, including the admin dashboard summary.
- Participant counts have exactly one source of truth (`COUNT(*)` over confirmed
  participations, ADR-5) — no stored counter, no phantom seed values.
- No plaintext credentials, password hashes, refresh tokens, or raw QR tokens appear
  anywhere in any generated document.
- No application code was modified.

## Remaining Open Decisions

All critical and architecture-level items from `docs/backend-discovery/risks-and-open-
decisions.md` were resolved in this phase. Items explicitly deferred as non-blocking
(recorded in `security-and-authentication.md`'s "later hardening" table and
`system-architecture.md`'s observability section): login/brute-force rate limiting,
asymmetric (RS256) JWT signing, Redis-backed QR session state, distributed tracing,
and audit-log tamper-evidence — none block starting implementation.

## Recommended First Implementation Phase

Authentication and current user (`users`, `refresh_tokens` tables;
`/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/users/me`) — see
`docs/backend-architecture/local-development-and-integration.md` for its full local
test scenario and completion criteria.

## Suggested Next Feature

OneHelp Backend Foundation — Spring Boot, PostgreSQL, Flyway, Security Skeleton &
Local Development Environment
