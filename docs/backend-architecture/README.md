# OneHelp Backend Architecture — Documentation Index

This folder is the output of the backend architecture, database schema, and REST API
design phase, built directly on top of `docs/backend-discovery/**` (the frozen
frontend's reverse-engineered mock behavior) and `claude.md`'s permanent product
rules. **No backend source code, SQL migrations, or Docker configuration were created
in this phase** — everything here is design documentation, ready for the next
("Foundation") phase to implement against.

## Recommended reading order

1. **`architecture-decisions.md`** — start here. Every critical/architecture-level
   ambiguity from `docs/backend-discovery/risks-and-open-decisions.md` is resolved
   into a numbered decision (problem, current mock behavior, chosen design, rejected
   alternatives, reasoning, and cross-cutting impact). Every other document in this
   folder assumes these decisions as given.
2. **`domain-model-and-state-machines.md`** — the conceptual entity/relationship model
   and every enum's full state machine (transitions, actors, side effects, visibility
   effects).
3. **`database-schema.md`** — the physical realization of the same model: every
   MySQL table, type, constraint, index, and cascade policy, plus the ER diagram
   and the time/timezone policy.
4. **`system-architecture.md`** — the technology stack, the modular-monolith package
   structure, the inter-module dependency diagram, and the deployment/observability
   overview.
5. **`security-and-authentication.md`** — the full authentication flow (registration
   through logout), the authorization model (route-level and resource-level), and the
   security checklist (MVP-required vs. explicitly deferred).
6. **`transactions-and-integrity.md`** — every transactional operation in the system,
   its locking strategy, and the specific races each one prevents — most importantly,
   the organizer-demotion cascade's full transaction boundary.
7. **`dto-catalogue.md`** — every request/response DTO, field-by-field, with frontend
   mapping and sensitivity classification.
8. **`error-contract.md`** — the standard error response shape and the complete
   mapping from every current frontend mock error code to a backend code and HTTP
   status.
9. **`rest-api-design.md`** — the full endpoint catalogue by domain, pagination/
   filtering/search design, and the traceability table mapping every frontend service
   method to its backend replacement.
10. **`local-development-and-integration.md`** — how the frontend, backend, and
    database run together locally, the mixed mock/API switching strategy, seed data
    design, the OpenAPI strategy, and the phase-by-phase implementation order with
    local test scenarios and completion criteria for each phase.

## Final technology choices (summary — see `system-architecture.md` for full reasoning)

Java 21, Spring Boot 3, Spring Web (Servlet, not reactive), Spring Data JPA, Spring
Security, `jjwt` for self-issued JWTs, Jakarta Bean Validation, MySQL 8 (InnoDB,
utf8mb4), MySQL Connector/J, Flyway, springdoc-openapi (annotation-driven), Docker
Compose (MySQL only, locally), Maven, MapStruct, Lombok, Spring Boot Actuator +
Micrometer. A modular monolith — no microservices, no message broker, no CQRS/event
sourcing, no GraphQL, no Kubernetes. See ADR-17 for why MySQL replaced the
originally-drafted PostgreSQL design.

## Implementation-phase summary (see `local-development-and-integration.md` for full detail)

1. Authentication and current user
2. Users and roles
3. Organizations and applications
4. Actions and public discovery (including moderation's data model)
5. Participation
6. Attendance and QR
7. Reports (moderation-transition endpoints already shipped in phase 4)
8. Admin activity

Each phase is independently runnable and testable against a frontend where every
other domain still uses its mock service — confirmed safe against the actual module
dependency graph in `system-architecture.md`, not assumed.

## What this phase deliberately changed versus the frozen frontend mock

Only two frontend-visible contract changes were introduced, both because the mock's
own behavior was identified as a gap or an unnecessary duplication during discovery —
neither is a silent behavior change:

- **Organization membership is eliminated as a separate model** (ADR-4) — the
  frontend's `organizationApplication.store.js` loses its `membership` field; the same
  information is now fully carried by the organization resource itself.
- **Participation eligibility now correctly blocks `CLOSED` actions** (ADR-10) — the
  mock's `joinAction` never actually checked this, even though the UI already assumed
  it did; the backend closes the gap rather than reproducing it.

Every other frontend service contract in `docs/backend-discovery/service-contracts.md`
is preserved, per the full traceability table in `rest-api-design.md`.

## Permanent constraints preserved throughout

One organizer owns exactly one organization; one organization has exactly one
organizer; no manager role; no multiple organizers; no organization teams; public
registration creates volunteers only; organizer access is granted only through
approved onboarding; organizer demotion preserves the user account while deleting the
organization and all dependent data; certificates, exports, payments, and donations
are never referenced anywhere in this design, including in the implementation order
and the "next feature" recommendation.
