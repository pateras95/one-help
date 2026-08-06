# Phase Report — OneHelp Backend Foundation (MySQL Architecture Alignment, Spring Boot Skeleton, Flyway, Local Development)

## Summary

Migrated the approved backend architecture from PostgreSQL to MySQL 8 (InnoDB,
utf8mb4/utf8mb4_0900_ai_ci), permanently removed the reserved `MODERATOR` role, and
created the first backend project (`backend/`, Spring Boot 3 / Java 21 / Maven):
project skeleton, `users` + `refresh_tokens` Flyway migration, `User`/`RefreshToken`
JPA entities and repositories, a shared error-response contract, a Spring Security
skeleton (no working auth yet), Actuator health, OpenAPI/Swagger, and an optional
MySQL-only Docker Compose file. No authentication, organization, action,
participation, attendance, QR, report, moderation, or admin functionality was
implemented. No frontend file was modified.

## Architecture Documents Reviewed

All 11 files in `docs/backend-architecture/` (README, architecture-decisions,
system-architecture, database-schema, domain-model-and-state-machines,
rest-api-design, dto-catalogue, security-and-authentication,
transactions-and-integrity, local-development-and-integration, error-contract), all 8
files in `docs/backend-discovery/` (README, frontend-mock-inventory, domain-models,
business-rules, service-contracts, routes-and-authorization,
frontend-backend-replacement-map, risks-and-open-decisions), and `claude.md`, read in
full before any edit.

**Note on `claude.md`**: it currently still states "the current development phase is
frontend-only" and lists Spring Boot/schemas/backend as things "not" to create. This
phase's own instructions explicitly and repeatedly direct creating exactly that, so
this backend-foundation work proceeded per those explicit, detailed instructions;
`claude.md` itself was **not** modified (out of scope for this phase) — its
frontend-phase framing appears to predate the backend-architecture phase and is worth
reconciling in a future documentation pass.

## MySQL Architecture Migration

Replaced PostgreSQL 16 with **MySQL 8.x, InnoDB, utf8mb4/utf8mb4_0900_ai_ci, MySQL
Connector/J, Spring Data JPA, Hibernate, Flyway** throughout
`docs/backend-architecture/**` and the new backend. Added **ADR-17** documenting the
engine change and **ADR-18** documenting the permanent MODERATOR removal
(`architecture-decisions.md`). Updated: `README.md` (tech list), `database-schema.md`
(full schema rewrite — see below), `system-architecture.md` (tech-stack table,
deployment overview, health-indicator wording), `domain-model-and-state-machines.md`
(enum representation, ER diagram type), `rest-api-design.md` (search design),
`transactions-and-integrity.md` (isolation-level reasoning), `error-contract.md`
(partial-index footnotes), `local-development-and-integration.md` (Docker/port/env
tables). No PostgreSQL SQL syntax or driver reference remains active anywhere in the
document set — remaining mentions of "PostgreSQL" are explanatory ("replaces
PostgreSQL's X with Y"), verified by a full-corpus grep.

## PostgreSQL-Specific Designs Replaced

| Mechanism | MySQL replacement |
|---|---|
| Partial unique indexes (`participations`, `action_reports`) | Generated `STORED` column (`NULL` when inactive) + regular `UNIQUE` index |
| `unaccent` + `lower()` | `utf8mb4_0900_ai_ci` collation (accent- and case-insensitive) |
| `JSONB` | MySQL `JSON` (free-form, unindexed data only) |
| Native array columns | Normalized join table (`organization_categories`, filtered/queried) or `JSON` array (`required_equipment_*`, display-only) |
| Native `CREATE TYPE ... ENUM` | Java `enum` + `@Enumerated(STRING)` + `VARCHAR` + `CHECK` |
| `gen_random_uuid()`/`pgcrypto` | Application-generated `UUID.randomUUID()`, stored as `CHAR(36)` |
| `TIMESTAMPTZ` | `DATETIME(6)`, UTC pinned at JDBC/Hibernate/JVM layers |
| `INSERT ... ON CONFLICT` | `INSERT ... ON DUPLICATE KEY UPDATE` |
| "PostgreSQL default `READ COMMITTED`" isolation reasoning | Re-verified safe under InnoDB's default `REPEATABLE READ` (row/gap locks are a superset, not a subset) |

Full detail: `docs/backend-architecture/database-schema.md` and ADR-17.

## Moderator Removal

`MODERATOR` removed from: the `users.role` `CHECK` constraint and Flyway migration,
`UserRole` (backend Java enum — contains only `VOLUNTEER`, `ORGANIZER`,
`ADMINISTRATOR`), `domain-model-and-state-machines.md`'s `UserRole` section,
`database-schema.md`'s enum-types section, and every backend-architecture document
(verified by full-corpus grep — no active reference remains). No
`ModeratorController`, route, permission, or TODO was created. The frontend's own
`roles.js` (which still contains an inert `MODERATOR: 'moderator'` constant, per
discovery) was **not modified** — out of scope for this phase — and is documented in
ADR-18 as permanently unsupported.

## Backend Folder Created

`backend/` — Maven project, artifactId `onehelp-backend`, base package
`com.onehelp.backend`, Java 21, Spring Boot 3.3.4.

## Technology and Dependency Versions

Spring Boot 3.3.4 (parent POM) · Java 21 · Spring Web, Spring Data JPA, Spring
Security, Spring Boot Validation, Spring Boot Actuator (all via Spring Boot–managed
versions) · `com.mysql:mysql-connector-j` (runtime) · `org.flywaydb:flyway-core` +
`flyway-mysql` · `springdoc-openapi-starter-webmvc-ui` 2.6.0 · MapStruct 1.6.2 ·
Lombok (Spring Boot–managed version) · Maven Wrapper 3.3.2 (Maven 3.9.9 distribution).
No PostgreSQL driver, H2, WebFlux, Redis, Kafka, GraphQL, Testcontainers, or OAuth
provider dependency present (verified by grep against `pom.xml`).

## Package Structure

```
com.onehelp.backend
├── OneHelpBackendApplication.java
├── common/
│   ├── config/        (TimeZoneConfig, OpenApiConfig)
│   ├── exception/      (DomainException, GlobalExceptionHandler)
│   ├── web/            (ApiErrorResponse, TraceIdFilter)
│   ├── persistence/     (UuidCharAttributeConverter, package-info)
│   └── security/       (SecurityConfig, PasswordEncoderConfig, JwtProperties, CorsProperties)
├── auth/
│   ├── entity/         (RefreshToken)
│   └── repository/     (RefreshTokenRepository)
└── users/
    ├── entity/          (User, UserRole, AccountStatus)
    └── repository/      (UserRepository)
```

No `controller`/`service`/`dto`/`mapper`/`exception` subpackages were created under
`auth`/`users` yet (no classes belong there this phase), and no
`organizations`/`actions`/`moderation`/`participation`/`attendance`/`reports`/
`adminactivity` packages exist yet — per instructions, no placeholder packages/classes
were created for unimplemented domains.

## Files Created

**Backend project** (28 files): `pom.xml`, `mvnw`, `mvnw.cmd`,
`.mvn/wrapper/maven-wrapper.properties`, `.env.example`, `README.md`; 15 main Java
classes under `src/main/java/com/onehelp/backend/**` (listed in § Package Structure,
plus `OneHelpBackendApplication`); `application.yml`, `application-local.yml`,
`application-test.yml`; `db/migration/V1__foundation_and_auth_schema.sql`; 4 test
classes under `src/test/java/**`.

**Repository root**: `compose.yml`.

**Documentation**: this report
(`docs/reports/2026-08-06-mysql-backend-foundation.md`).

## Files Modified

`.gitignore` (added `backend/target/`, `backend/.env`,
`backend/.mvn/wrapper/maven-wrapper.jar`); the following files under
`docs/backend-architecture/`: `README.md`, `architecture-decisions.md`,
`system-architecture.md`, `database-schema.md`, `domain-model-and-state-machines.md`,
`rest-api-design.md`, `transactions-and-integrity.md`,
`local-development-and-integration.md`, `error-contract.md`. `dto-catalogue.md` and
`security-and-authentication.md` were reviewed but needed no changes (no PostgreSQL
or MODERATOR references found in either).

## Local MySQL Setup

Documented in `backend/README.md` § Option A: install `mysql-server` on Ubuntu, start
it as a system service, create the `onehelp` database with
`utf8mb4`/`utf8mb4_0900_ai_ci`, create a dedicated `onehelp` application user with only
the DML/DDL grants Flyway/Hibernate need (never the `root` account), and set the
`DB_*`/`JWT_SECRET`/`CORS_ALLOWED_ORIGINS` environment variables from
`backend/.env.example`.

## Optional Docker MySQL Setup

`compose.yml` at the repo root starts exactly one service (`mysql`, image `mysql:8.0`,
utf8mb4/utf8mb4_0900_ai_ci, healthcheck, named volume, port 3306, passwords required
from environment variables with no insecure default). `docker compose up -d mysql` /
`ps` / `logs -f mysql` / `down` documented; `down -v` documented and explicitly marked
destructive. The Spring Boot application itself is never containerized — it always
runs via `./mvnw spring-boot:run` or IntelliJ, identically whether MySQL is
Docker-Composed or locally installed.

## Flyway Migration

`V1__foundation_and_auth_schema.sql` creates `users` and `refresh_tokens` only (no
other domain tables yet). MySQL-valid syntax throughout: `CHAR(36)` UUID primary
keys, `DATETIME(6)` timestamps, `VARCHAR` + `CHECK` for `role`/`status`
(`role` accepts only `VOLUNTEER`/`ORGANIZER`/`ADMINISTRATOR` — no `MODERATOR`),
`utf8mb4`/`utf8mb4_0900_ai_ci` table charset/collation, required indexes and foreign
keys (including the self-referential `replaced_by_token_id` FK). No PostgreSQL
extension, `pgcrypto`, `gen_random_uuid()`, native enum, partial index, array, JSONB,
`TIMESTAMPTZ`, or `RETURNING` clause anywhere in the file (verified by grep).

## UUID Strategy

Application-generated `java.util.UUID` (`UUID.randomUUID()`), stored consistently as
`CHAR(36)` across every table (never `BINARY(16)`, never mixed) — chosen over
`BINARY(16)` for readability/debuggability/learning-friendliness over the modest
storage saving `BINARY(16)` would give at this scale. Implemented as a single reusable
`UuidCharAttributeConverter` (`common.persistence`), applied to both entities' `id`
fields.

## Timestamp Strategy

Every instant stored in `DATETIME(6)` (UTC), mapped to Java `Instant` via JPA
auditing (`@CreatedDate`/`@LastModifiedDate` on `User`; `RefreshToken` sets
`issuedAt`/`expiresAt`/`revokedAt` explicitly, per its append-only design with no
`updated_at`/`version` column). UTC is pinned redundantly at three layers: the JDBC
URL (`serverTimezone=UTC`), Hibernate (`spring.jpa.properties.hibernate.jdbc.time_zone:
UTC` in `application.yml`), and the JVM's own default time zone
(`common.config.TimeZoneConfig`, set at startup via `@PostConstruct`).

## Character Set and Collation

Every table: `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci` —
MySQL 8's accent-insensitive, case-insensitive collation, correct for Greek
tonos/diacritics and English. `users.email`'s uniqueness relies on this collation
directly (plain `UNIQUE (email)`, no `lower()` expression index needed).

## Entities Created

`User` (`users.entity`) — `id`, `firstName`, `lastName`, `email`, `passwordHash`,
`role`, `status`, `avatarInitials`, `localePreference`, `createdAt`, `updatedAt`,
`version`; protected no-arg constructor; no Lombok `@Data`; no `@ToString` (so
`passwordHash` is never printed). `RefreshToken` (`auth.entity`) — `id`, `user`
(relation), `tokenHash`, `issuedAt`, `expiresAt`, `revokedAt`, `replacedByToken`
(self-relation), `userAgent`; protected no-arg constructor; no `version`/`updatedAt`
(matches the approved append-only schema). `UserRole` and `AccountStatus` enums
(`users.entity`) — `UserRole` contains exactly `VOLUNTEER`/`ORGANIZER`/`ADMINISTRATOR`.

## Repositories Created

`UserRepository` — `findByEmail`, `existsByEmail` (case-insensitivity comes from the
column's collation, not `IgnoreCase`/`lower()`). `RefreshTokenRepository` —
`findByTokenHash`, `findByUserAndRevokedAtIsNull` (active tokens for a user),
`revokeAllActiveForUser` (bulk revocation query, for the future forced-invalidation
rule, ADR-3). No speculative methods beyond what the next (authentication) phase
needs.

## Security Skeleton

`SecurityConfig` — stateless session policy, CSRF disabled (stateless bearer API), CORS
via `CorsProperties`, only `/actuator/health/**` and Swagger/OpenAPI paths public,
every other path `authenticated()` by default (method security enabled via
`@EnableMethodSecurity`). `PasswordEncoderConfig` — `BCryptPasswordEncoder` at work
factor 12. `JwtProperties`/`CorsProperties` — validated `@ConfigurationProperties`
(`JWT_SECRET` must be ≥32 characters, checked at startup via Bean Validation). No JWT
authentication filter, no login/register/refresh logic, and no temporary/fake
authentication were added — every non-public request will currently receive 401 until
the authentication phase wires up real login.

## Error Handling Foundation

`ApiErrorResponse` (record: `timestamp`, `status`, `code`, `message`, `fieldErrors`,
`traceId`) matches `error-contract.md` exactly. `DomainException` — abstract base
carrying a dot-namespaced `code` and `HttpStatus` (no concrete subclasses yet — none
are needed until a domain module exists). `GlobalExceptionHandler`
(`@RestControllerAdvice`) — handles `DomainException`,
`MethodArgumentNotValidException`/`ConstraintViolationException` (422 with
`fieldErrors`), and a generic `Exception` fallback (500, `common.unexpectedError`) that
never leaks a stack trace, exception class name, SQL fragment, or constraint name.
`TraceIdFilter` attaches a per-request trace id to the logging MDC and response
header.

## OpenAPI and Health

`/actuator/health` exposed (MySQL connectivity reported via HikariCP's health
indicator). Swagger UI/OpenAPI docs enabled only under the `local` profile
(`application-local.yml`), disabled by default (`application.yml`). `OpenApiConfig`
registers title/version/description and a reusable `bearerAuth` HTTP-bearer security
scheme for future controllers to reference — no endpoint exists yet to document.

## Commands to Run Locally

```
cd backend
./mvnw clean verify
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

## IntelliJ Setup

Documented in `backend/README.md` § IntelliJ IDEA: open `backend/pom.xml`, set
project SDK to Java 21, create a run configuration for `OneHelpBackendApplication`
with active profile `local` and the `.env.example` variables set as environment
variables.

## CI Preparation

Documented only (not implemented), per instructions: a backend job (checkout → Java
21 → cache Maven → MySQL service container for integration tests → `./mvnw clean
verify`) and a frontend job (Node → install → lint → build). No Kubernetes, registry
publishing, deployment pipeline, or IaC.

## Build Result

**Not performed.** This sandbox has no `java`, `mvn`/`mvnw`-runnable JDK, or Maven
installation available (`which java mvn` returns nothing; confirmed before and during
this phase). In place of a real build, static validation was done: `pom.xml` parses as
well-formed XML; all three `application*.yml` files parse as valid YAML; every Java
file's braces are balanced; every file's package declaration matches its directory
path; a full grep confirms no forbidden dependency (PostgreSQL driver, H2,
Testcontainers, Redis, Kafka, GraphQL, WebFlux) appears in `pom.xml`. `./mvnw clean
verify` must be run in an environment with Java 21 and network access to Maven
Central to get a real build result.

## Application Startup Result

**Not performed** — same sandbox limitation (no JDK). Must be verified by running
`./mvnw spring-boot:run -Dspring-boot.run.profiles=local` against a reachable MySQL
instance in an environment with Java 21 installed.

## MySQL Validation Result

**Not performed** — no MySQL server, `mysql` client, or Docker is available in this
sandbox (confirmed: no `mysql`/`mysqld`/`docker` binaries, no `mysql.service` unit).
Flyway applying `V1__foundation_and_auth_schema.sql`, JPA schema validation
(`ddl-auto: validate`), and the `utf8mb4_0900_ai_ci` collation/UTC-timestamp behavior
must all be verified against a real MySQL 8 instance (Option A or B in
`backend/README.md`) before this phase is considered functionally complete.

## Tests Result

4 test classes were created; only the DB-independent ones could be reasoned about
without a JVM in this sandbox (no `java`/`mvn` to actually execute them — see § Build
Result):
- `UserRoleTest` — pure unit test, proves `UserRole` contains exactly `VOLUNTEER`/
  `ORGANIZER`/`ADMINISTRATOR` and no `MODERATOR`. No Spring context, no database.
- `JwtPropertiesValidationTest` — pure Jakarta Bean Validation test (no Spring
  context, no database), proves a `JWT_SECRET` shorter than 32 characters or blank is
  rejected, and a 32-character one is accepted.
- `GlobalExceptionHandlerTest` — pure unit test of the handler methods directly (no
  Spring context, no database), proves a domain exception maps to its own status/code
  and an unexpected exception's message never contains the original exception's text.
- `OneHelpBackendApplicationTests` — full `@SpringBootTest` context load against the
  `test` profile, including Flyway migrating a real MySQL schema. **Requires a
  reachable MySQL instance and a JDK — not run in this sandbox; reported as not
  performed, not faked.**

## Remaining TODO

- Run `./mvnw clean verify` and the application itself against real MySQL (Option A
  or B) in an environment with Java 21 — this phase's own validation could not be
  executed here.
- Reconcile `claude.md`'s stale "current development phase is frontend-only" section
  now that a backend phase has explicitly begun (not done here — out of scope for
  this phase, flagged for the user).
- No authentication, organization, action, participation, attendance, QR, report,
  moderation, or admin functionality exists yet — all deliberately deferred to future
  phases per this phase's explicit scope.

## Recommended Next Phase

Validate this foundation end-to-end against a real MySQL instance (local or
Docker-Composed) in an environment with Java 21 and Maven available — confirm Flyway
applies cleanly, the application starts, health/Swagger respond, and the four test
classes pass — before building the authentication phase on top of it.

## Suggested Next Feature

OneHelp Backend Authentication — Registration, Login, JWT Access Tokens, Refresh
Token Rotation, Logout, Current User & First Frontend API Integration
