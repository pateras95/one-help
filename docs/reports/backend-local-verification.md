# Phase Report — OneHelp Backend Local Environment Verification

## Summary

Verification-only pass (no controllers, services, entities, repositories, DTOs, or
business logic added) confirming the backend built in the previous phase
(`docs/reports/2026-08-06-mysql-backend-foundation.md`) actually runs end-to-end in
this environment, which — unlike the sandbox that phase was built in — has Java 21 and
a running local MySQL 8 server. Outcome: **the backend starts cleanly against the local
profile, Flyway/Hibernate/Security/Swagger/Actuator all behave correctly, and the full
Maven test suite (8/8, including the real-database `@SpringBootTest`) passes.** One
real startup-noise/configuration issue was found and fixed (see below); one
documentation-vs-behavior discrepancy was found and is reported, not fixed, since
correcting it would mean writing new security-handling code, which is out of scope for
a verification-only pass.

## Files Created

- `backend/.env` — local-only environment file (`DB_HOST`, `DB_PORT`, `DB_NAME`,
  `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`), populated with
  the already-provisioned local MySQL credentials and a freshly generated 88-character
  random `JWT_SECRET`. Already covered by `.gitignore` (`backend/.env`) — confirmed via
  `git check-ignore -v backend/.env`.
- `docs/reports/backend-local-verification.md` — this report.

## Files Modified

- `backend/src/main/resources/application.yml` — added
  `spring.autoconfigure.exclude: org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration`.
  See § Startup Fix Applied below for why.

## Files Removed

None.

## Folder Structure

Unchanged from the previous phase. Confirmed present and correctly aligned with package
declarations:

```
backend/src/main/java/com/onehelp/backend/
├── OneHelpBackendApplication.java
├── common/{config,exception,persistence,security,web}/
├── auth/{entity,repository}/
└── users/{entity,repository}/
```

No `controller`/`service`/`dto`/`mapper` packages exist yet, and none were added — no
implemented endpoint or business logic exists in this phase, consistent with the
project's explicit scope.

## Packages Installed

None. No `pom.xml` dependency was added, removed, or version-changed.

## Build Result

**Ran successfully**, twice (once before the fix, once after, to confirm the fix
resolved the issue without breaking anything):

```
cd backend
./mvnw clean verify
```

`BUILD SUCCESS`, ~11–12s. `pom.xml` reviewed in full: Spring Boot 3.3.4 parent, Java 21,
only the dependencies listed in the previous phase's report (Web, Data JPA, Security,
Validation, Actuator, MySQL Connector/J, Flyway core + mysql, springdoc-openapi 2.6.0,
MapStruct 1.6.2, Lombok, Spring Boot Test, Spring Security Test) — no PostgreSQL driver,
H2, Testcontainers, Redis, Kafka, GraphQL, or WebFlux. No changes needed.

## Lint Result

No lint tool is configured for the backend (none was expected — Java projects in this
stack rely on compiler warnings, not a separate linter). Compiler emitted zero warnings
across the full `clean verify` build.

## Test Result

**8/8 passed**, including the real-database test:

```
[INFO] Running com.onehelp.backend.OneHelpBackendApplicationTests
[INFO] Tests run: 1 ... -- full Spring context load, Flyway migrating real MySQL
[INFO] Running com.onehelp.backend.common.exception.GlobalExceptionHandlerTest
[INFO] Tests run: 2 ...
[INFO] Running com.onehelp.backend.common.security.JwtPropertiesValidationTest
[INFO] Tests run: 3 ...
[INFO] Running com.onehelp.backend.users.entity.UserRoleTest
[INFO] Tests run: 2 ...
[INFO] Tests run: 8, Failures: 0, Errors: 0, Skipped: 0
```

This is the first time `OneHelpBackendApplicationTests` (the only test requiring a real
MySQL instance) has actually executed — it was reported as "not performed" in the
previous phase due to no MySQL/JDK being available there.

## Manual Verification

All performed against a live `./mvnw spring-boot:run -Dspring-boot.run.profiles=local`
process on `localhost:8080`, backed by the local MySQL instance (`onehelp`/`onehelp`
database/user, MySQL 8.0, confirmed already running as a system service).

| Check | Result |
|---|---|
| Spring Boot starts | ✅ `Started OneHelpBackendApplication in 5.548 seconds`, no stack traces |
| MySQL connection | ✅ HikariCP pool started, one connection added, no errors |
| Flyway | ✅ `Successfully validated 1 migration`; `Schema onehelp is up to date` (already applied by a prior setup — not re-run, per instructions not to recreate) |
| `flyway_schema_history` | ✅ exactly one row: `version=1`, `description=foundation and auth schema`, `success=1` |
| Hibernate validation (`ddl-auto: validate`) | ✅ no `SchemaManagementException` — entities match the live schema exactly |
| Startup warnings | ✅ none, after the fix (see below) |
| Swagger UI | ✅ `GET /swagger-ui.html` → 302 → 200; real Swagger UI HTML served |
| OpenAPI docs | ✅ `GET /v3/api-docs` → 200, valid OpenAPI 3.0.1 JSON, `bearerAuth` scheme present, no paths (expected — no endpoints yet) |
| Actuator health | ✅ `GET /actuator/health` → `200 {"status":"UP"}` (DB connectivity folded into overall status; `show-details: when-authorized` correctly hides component detail from an anonymous caller) |
| Security enforcement | ✅ any other path (e.g. `/api/v1/anything`) is rejected while unauthenticated (see § Discrepancy Found — status code is 403, not the documented 401) |
| Graceful shutdown | ✅ EntityManagerFactory and HikariCP both closed cleanly, no errors, on `SIGTERM` |

**Database structural verification** (via direct `mysql` client against the live DB,
independent of the app):

| Check | Result |
|---|---|
| Tables | ✅ exactly `users`, `refresh_tokens`, `flyway_schema_history` — no stray/leftover tables |
| Schema charset/collation | ✅ `utf8mb4` / `utf8mb4_0900_ai_ci` at database, table, and connection level (`SHOW VARIABLES LIKE 'character_set%'` confirms `utf8mb4` on client/connection/results/database/server) |
| Constraints | ✅ `chk_users_role`, `chk_users_status`, `chk_users_locale_preference` (CHECK); `fk_refresh_tokens_user`, `fk_refresh_tokens_replaced_by` (FK); `uk_users_email`, `uk_refresh_tokens_token_hash` (UNIQUE) — all present, matching `V1__foundation_and_auth_schema.sql` exactly |
| Indexes | ✅ `ix_users_role`, `ix_users_status`, `ix_refresh_tokens_user_id`, `ix_refresh_tokens_expires_at` — all present |
| Engine | ✅ `InnoDB` on both domain tables |

## Startup Fix Applied

**Issue**: every startup logged
`WARN ... UserDetailsServiceAutoConfiguration : Using generated security password: <uuid>`.
Cause: Spring Boot auto-configures an in-memory default user with a random password
whenever no `UserDetailsService`/`AuthenticationManager` bean is present — true here,
since `SecurityConfig` only defines a `SecurityFilterChain` (no auth mechanism exists
yet, by design — the authentication phase hasn't started). This app will never use
in-memory basic auth (JWT bearer only, per ADR-1), so the fix disables the
auto-configuration outright rather than defining an unused bean:

```yaml
spring:
  autoconfigure:
    exclude: org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration
```

Re-ran `./mvnw clean verify` after the change: warning is gone, all 8 tests still pass,
build still succeeds. This is a one-line configuration change to an existing file, not
new logic, a new bean, a new endpoint, or a security mechanism — in scope for a
verification pass per "fix only startup/configuration problems."

## Discrepancy Found (not fixed — flagged for the next phase)

`docs/backend-architecture/error-contract.md` states plainly: *"Not authenticated → 401
Unauthorized"* (`common.unauthenticated`). In practice, hitting any non-public path
while unauthenticated (e.g. `GET /api/v1/anything`) currently returns a bare **403**
with an **empty body** (`Content-Length: 0`) — not the documented 401, and not shaped
like `ApiErrorResponse` at all. This is standard Spring Security behavior when
`anyRequest().authenticated()` has no custom `AuthenticationEntryPoint`: an anonymous
request already has a principal (`AnonymousAuthenticationToken`), so Spring Security
treats the rejection as authorization failure (403), not missing authentication (401).

This is **not fixed here** because doing so means adding a new
`AuthenticationEntryPoint`/`AccessDeniedHandler` bean wired to the existing
`ApiErrorResponse` shape — new security-handling code, which this phase's instructions
explicitly exclude ("no services... no business logic"). It does not block anything
today, since no business endpoints exist yet to be affected. It should be fixed as part
of (or immediately before) the authentication phase, in `SecurityConfig`, so that
`common.unauthenticated`/401 matches the documented contract from the first real
endpoint onward.

## Developer Experience Verified

- **Maven Wrapper**: `./mvnw` present, executable, correctly bootstraps Maven 3.9.9 via
  `distributionType=only-script` (no committed wrapper jar, matching `.gitignore`'s
  `backend/.mvn/wrapper/maven-wrapper.jar` exclusion). No local Maven install needed or
  used.
- **Java version**: `openjdk 21.0.11` present and used; matches `pom.xml`'s
  `<java.version>21</java.version>` and the parent POM.
- **Profile configuration**: `local` profile activates Swagger/OpenAPI and DEBUG-level
  SQL/app logging as documented; `application.yml` (base) keeps Swagger disabled and
  logging at INFO by default, confirming profile layering works as designed.
- **Environment variables**: `backend/.env.example` accurately lists every variable the
  app actually reads (`DB_HOST/PORT/NAME/USERNAME/PASSWORD`, `JWT_SECRET`,
  `CORS_ALLOWED_ORIGINS`); `backend/.env` (created this phase) supplies real local
  values and is gitignored.
- **Project startup**: both `./mvnw clean verify` and
  `./mvnw spring-boot:run -Dspring-boot.run.profiles=local` work unmodified from a clean
  checkout plus a populated `.env`, exactly as `backend/README.md` describes.

## Remaining TODO

- Fix the 401-vs-403 discrepancy (see § Discrepancy Found) when the authentication
  phase adds real security exception handling.
- `claude.md`'s stale "current development phase is frontend-only" framing still isn't
  reconciled (flagged by the previous phase too — still out of scope for a
  verification-only pass).
- No authentication, organization, action, participation, attendance, QR, report,
  moderation, or admin functionality exists yet — unchanged, and correctly out of scope
  here.

## Suggested Next Feature

OneHelp Backend Authentication — Registration, Login, JWT Access Tokens, Refresh Token
Rotation, Logout, Current User & First Frontend API Integration (as recommended by the
previous phase), now that local startup, database, and configuration are confirmed
sound end-to-end.
