# Phase Report — OneHelp Backend Authentication Foundation (Registration, Login, JWT, Refresh Tokens)

## Summary

Implemented the complete authentication module — the first real backend feature —
replacing only the frontend's authentication mocks. `POST /api/v1/auth/register`,
`POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`,
`GET /api/v1/auth/me`: JWT bearer access tokens (HS256, 15 min TTL), opaque refresh
tokens rotated on every use with reuse detection (revokes the whole chain), delivered
via an `HttpOnly`/`SameSite=Strict` cookie scoped to `/api/v1/auth/refresh` — never in
the JSON response body (confirmed with the user against a real conflict between the
task's literal wording and the already-approved `security-and-authentication.md`/
`dto-catalogue.md` design; the approved cookie-based design was chosen). BCrypt
password hashing (work factor 12, already configured). No other domain (organizations,
actions, participation, attendance, QR, reports, admin, moderation) was implemented or
stubbed. Full validation: `./mvnw clean verify` (35/35 tests, including a real-MySQL
integration test) and a live `./mvnw spring-boot:run -Dspring-boot.run.profiles=local`
manual sweep of every endpoint, both green.

Two bugs pre-existing in the backend-foundation phase were found and fixed as a direct
consequence of this being the **first feature to ever actually persist an entity** —
see § Bugs Found and Fixed below.

## Architecture Documents Reviewed

All of `docs/backend-discovery/` (especially `frontend-backend-replacement-map.md`,
`service-contracts.md`, `business-rules.md`, `domain-models.md`,
`routes-and-authorization.md`, per the task's explicit direction), plus
`docs/backend-architecture/security-and-authentication.md`, `dto-catalogue.md`,
`error-contract.md`, `database-schema.md`, and `architecture-decisions.md` (ADR-1,
ADR-2, ADR-3) — read in full before writing any code.

**Conflict found and resolved with the user before implementation**: the task's Part 3
literally specifies returning `accessToken`, `refreshToken`, `expiresIn`, `user` all as
JSON body fields. `dto-catalogue.md` and `security-and-authentication.md` (built in the
prior backend-foundation phase, already scaffolding `CorsProperties.allowCredentials`,
`JwtProperties`, and the `refresh_tokens` table specifically for a cookie-based design)
explicitly state the refresh token is delivered **only** via `Set-Cookie`, never in the
body. Asked the user directly; they chose the cookie-based approved architecture. This
report and the implementation follow that choice — `AuthResponse` has no
`refreshToken` field.

**Second discrepancy, resolved without asking (both non-authoritative sources agree)**:
`security-and-authentication.md` names the current-user endpoint
`GET /api/v1/users/me`; both the task's own Part 6 and `service-contracts.md` say
`GET /api/v1/auth/me`. Implemented as `/api/v1/auth/me`.

## Files Created

**JWT infrastructure** (`common/security/`): `TokenSigner.java` (interface, ADR-2),
`Hs256TokenSigner.java` (impl), `AccessTokenClaims.java`, `AccessTokenService.java`
(builds/parses the `sub`/`role`/`status`/`jti` claim shape), `JwtAuthenticationFilter.java`,
`RestAuthenticationEntryPoint.java` (401 `common.unauthenticated`),
`RestAccessDeniedHandler.java` (403 `common.forbidden`), `CurrentUserProvider.java`.

**Auth DTOs** (`auth/dto/`): `RegisterRequest.java`, `LoginRequest.java`,
`AuthResponse.java`.

**Auth exceptions** (`auth/exception/`, all `DomainException` subclasses matching
`error-contract.md` exactly): `DuplicateEmailException` (409), `UnknownEmailException`
(401), `InvalidPasswordException` (401), `AccountSuspendedException` (403),
`InvalidSessionException` (401).

**Auth services** (`auth/service/` + `impl/`): `RefreshTokenService.java` +
`RefreshTokenServiceImpl.java` (opaque token generation, SHA-256 hashing, rotation,
revocation), `AuthenticationService.java` + `AuthenticationServiceImpl.java`
(register/login/refresh/logout/getCurrentUser — every business rule below).

**Auth controller**: `auth/controller/AuthController.java` — all 5 endpoints, full
Swagger/OpenAPI annotations (examples, response codes per status).

**Users** (`users/`): `dto/CurrentUserResponse.java`, `mapper/UserMapper.java`
(MapStruct).

**Tests**: `common/security/AccessTokenServiceTest.java` (pure unit — sign/verify
round trip, tampered/wrong-secret/malformed rejection),
`auth/service/impl/AuthenticationServiceImplTest.java` (17 Mockito-mocked unit tests —
every business rule below, including reuse detection and its `revokeAllForUser` call),
`auth/controller/AuthControllerIntegrationTest.java` (6 full-stack tests against the
real MySQL test database — no mocks — covering the full
register→me→login→refresh→reuse-detected→logout flow, duplicate email, short
password, unknown email, and unauthenticated `/me`).

## Files Modified

- `backend/pom.xml` — added `io.jsonwebtoken` (`jjwt-api`/`jjwt-impl`/`jjwt-jackson`
  0.12.6, ADR-2's `TokenSigner`) and, test-scoped, `org.apache.httpcomponents.client5:httpclient5`
  (works around a JDK `HttpURLConnection` limitation — see § Notable Implementation
  Details).
- `backend/src/main/java/.../common/security/SecurityConfig.java` — added
  `/api/v1/auth/register`, `/login`, `/refresh` to the public paths; wired
  `JwtAuthenticationFilter` before `UsernamePasswordAuthenticationFilter`; wired
  `RestAuthenticationEntryPoint`/`RestAccessDeniedHandler` via `exceptionHandling(...)`
  (this also fixes the 401-vs-403 discrepancy flagged in the immediately preceding
  verification report — every unauthenticated request now correctly gets
  `common.unauthenticated`/401 with the standard `ApiErrorResponse` shape instead of an
  empty-body 403).
- `backend/src/main/java/.../users/entity/User.java`,
  `backend/src/main/java/.../auth/entity/RefreshToken.java` — **bug fix**, see below.
- `backend/src/main/java/.../common/persistence/package-info.java` — updated to
  describe the corrected UUID strategy.
- `backend/src/main/resources/application.yml` — added
  `onehelp.security.refresh-cookie-secure: true` (the refresh cookie's `Secure` flag,
  overridden `false` for local/test).
- `backend/src/main/resources/application-local.yml`,
  `backend/src/main/resources/application-test.yml` — the `false` override above.

## Files Removed

- `backend/src/main/java/.../common/persistence/UuidCharAttributeConverter.java` — see
  § Bugs Found and Fixed. Left no other code referencing it (verified by grep before
  deleting).

## Folder Structure

```
backend/src/main/java/com/onehelp/backend/
├── auth/
│   ├── controller/AuthController.java
│   ├── dto/{RegisterRequest,LoginRequest,AuthResponse}.java
│   ├── entity/RefreshToken.java                 (existing, id-mapping bug fixed)
│   ├── exception/{5 DomainException subclasses}
│   ├── repository/RefreshTokenRepository.java   (existing, unchanged)
│   └── service/{AuthenticationService,RefreshTokenService}.java + impl/
├── common/
│   ├── security/  (+ TokenSigner, Hs256TokenSigner, AccessTokenService,
│   │               AccessTokenClaims, JwtAuthenticationFilter,
│   │               RestAuthenticationEntryPoint, RestAccessDeniedHandler,
│   │               CurrentUserProvider — existing SecurityConfig/JwtProperties/
│   │               CorsProperties/PasswordEncoderConfig unchanged in shape)
│   └── persistence/  (UuidCharAttributeConverter removed, package-info updated)
└── users/
    ├── dto/CurrentUserResponse.java
    ├── entity/{User,UserRole,AccountStatus}.java  (User's id-mapping bug fixed)
    ├── mapper/UserMapper.java
    └── repository/UserRepository.java             (existing, unchanged)
```

No `organizations`/`actions`/`participation`/`attendance`/`reports`/`moderation`/`admin`
package was created — none of those domains was touched, per the task's explicit
constraints.

## Packages Installed

`io.jsonwebtoken:jjwt-api`, `jjwt-impl` (runtime), `jjwt-jackson` (runtime), all
`0.12.6` — HS256 JWT signing/verification (ADR-2). `org.apache.httpcomponents.client5:httpclient5`,
test-scoped only — see § Notable Implementation Details. MapStruct was already
configured (per the task's "if already configured" note); no changes to its version or
annotation-processor wiring were needed.

## Build Result

```
cd backend
./mvnw clean verify
```

**BUILD SUCCESS.** 35/35 tests passed (0 failures, 0 errors), including the two new
real-MySQL integration tests. No compiler warnings.

## Bugs Found and Fixed

This phase is the **first time any code in this project actually persisted an
entity** — every previous test either loaded the Spring context (no save) or was a
pure unit test. Two real, pre-existing defects surfaced immediately:

**1. UUID primary keys were corrupted on insert.** `User.id`/`RefreshToken.id` used
`@Convert(converter = UuidCharAttributeConverter.class)` on an `@Id` field.
Applying a JPA `AttributeConverter` to an identifier attribute is not reliably
supported per the JPA spec, and Hibernate 6.5.3 here silently ignored it, letting
MySQL Connector/J write the UUID's raw 16-byte binary form into the `CHAR(36)` column
instead of its string form — `INSERT` failed with
`Incorrect string value: '\x9E\xDC\xFF\xB3...' for column 'id'`. **Fix**: replaced the
converter with Hibernate's native `@JdbcTypeCode(SqlTypes.CHAR)` on both id fields,
which correctly supports `@Id` attributes. Verified: register/login/refresh/logout all
insert/update real rows now; `UuidCharAttributeConverter.java` deleted as dead,
actively-misleading code (grepped for any other reference first — none).

**2. Refresh-token reuse detection silently undid itself.** `refresh()`'s reuse path
revokes the user's entire active token chain (`revokeAllForUser`) and then throws
`InvalidSessionException` to report the failed refresh to the caller. Because
`refresh()` is `@Transactional` and Spring rolls back the whole transaction by default
on any unchecked exception, that rollback was silently undoing the revocation —
defeating ADR-1's entire reuse-detection defense (confirmed by direct MySQL inspection:
the "revoked" token's `revoked_at` stayed `NULL`). **Fix**: added
`@Transactional(noRollbackFor = {InvalidSessionException.class, AccountSuspendedException.class})`
on `refresh()` specifically. Re-verified manually via curl + direct DB queries at each
step, then covered by the integration test's reuse-detection assertions.

Both are documented here rather than silently patched, per this session's own prior
verification-report conventions.

## Business Rules Implemented

Matched exactly against `business-rules.md` § Authentication and
`security-and-authentication.md`:

- Registration always creates a `VOLUNTEER` — `role` is not a field on `RegisterRequest`
  at all (mass-assignment prevention), matching the mock's hardcoded behavior.
- Duplicate email → `auth.duplicateEmail` (409), checked via `existsByEmail`
  (case-insensitive via the `utf8mb4_0900_ai_ci` collation, no `lower()` needed).
- **No `username` field exists anywhere in this domain** (frontend mock, `domain-models.md`,
  and `database-schema.md` all model only `email` as the unique identifier) — the
  task's "Duplicate username" requirement in Part 2 does not apply; flagged here rather
  than fabricating a field none of the approved design documents call for.
- Login: unknown email → `auth.unknownEmail` (401); wrong password →
  `auth.invalidPassword` (401); suspended account → `auth.accountSuspended` (403),
  checked **before** issuing any token.
- Register auto-logs in (issues the same access + refresh session as login), matching
  `auth.store.js::register`'s behavior and the architecture doc's explicit note.
- Refresh: missing/unrecognized/expired token → `auth.invalidSession` (401); a
  **reused** (already-revoked) token revokes the caller's entire token chain and logs a
  `WARN` security event before returning the same 401; live `role`/`status` are
  re-read from the token's `User` row (not cached) on every refresh; suspended → 403.
- Logout revokes only the presented token, only if it belongs to the authenticated
  caller (never discloses whether a token exists for someone else); clears the cookie
  regardless.
- `/me` re-reads the live user row and re-checks suspension (matches
  `getCurrentSession`'s "re-checked on every guarded navigation" behavior, adapted to a
  stateless access token).
- Passwords: BCrypt work factor 12 (already configured in the foundation phase, reused
  unchanged), never logged, never selected into any DTO.

## Database

**No new Flyway migration was needed.** `users` and `refresh_tokens` — created by the
foundation phase's `V1__foundation_and_auth_schema.sql` — already match exactly what
authentication needs (verified column-by-column against `database-schema.md` before
writing any entity code): `users.role`/`status` CHECK constraints, `uk_users_email`,
`refresh_tokens.token_hash` unique, `fk_refresh_tokens_user` (`ON DELETE CASCADE`),
`fk_refresh_tokens_replaced_by` (self-referential, `ON DELETE SET NULL`). Confirmed via
`SHOW CREATE TABLE` and a live insert/rotate/revoke cycle during manual verification —
no schema change of any kind was made in this phase.

## Security

- Public: `/auth/register`, `/auth/login`, `/auth/refresh` (reads its own cookie, not
  gated by the JWT filter), `/actuator/health`, Swagger/OpenAPI (unchanged from the
  foundation phase).
- Authenticated (no specific role yet): `/auth/me`, `/auth/logout`.
- Every other path remains `anyRequest().authenticated()` by default, ready for future
  modules to layer `@PreAuthorize` role checks on top — no change to that default.
- `JwtAuthenticationFilter` trusts the access token's claims for the request's duration
  (no DB round-trip per request) — the 15-minute TTL is the accepted staleness ceiling
  per ADR-3; `/me` is the one endpoint that re-reads live state.
- Fixed the 401-vs-403 discrepancy flagged in the prior verification report (see
  § Files Modified).

## Swagger

Every endpoint documented: `@Tag`, `@Operation` (summary + description),
`@ApiResponses` per status code (with the exact `error-contract.md` code named in each
description), request-body examples for register/login, response schemas for
`AuthResponse`/`CurrentUserResponse`/`ApiErrorResponse`, `@SecurityRequirement(bearerAuth)`
on `/me` and `/logout`. Confirmed rendering correctly in `/v3/api-docs` and
`/swagger-ui.html` during manual verification (see below).

## Manual Verification

Performed against a live `./mvnw spring-boot:run -Dspring-boot.run.profiles=local`
process, in this order:

| Check | Result |
|---|---|
| Startup | ✅ clean, no warnings, Flyway validates unchanged, JWT filter registered |
| Swagger UI / `/v3/api-docs` | ✅ all 5 auth paths present |
| Actuator health | ✅ `{"status":"UP"}` |
| `POST /auth/register` | ✅ 201, `AuthResponse` body, `Set-Cookie: refreshToken=...; HttpOnly; SameSite=Strict; Path=/api/v1/auth/refresh` |
| `POST /auth/register` duplicate | ✅ 409 `auth.duplicateEmail` |
| `GET /auth/me` with valid bearer token | ✅ 200, correct `CurrentUserResponse` |
| `GET /auth/me` with no token | ✅ 401 `common.unauthenticated` |
| `POST /auth/login` | ✅ 200, fresh tokens |
| `POST /auth/refresh` | ✅ 200, rotated cookie, old token subsequently rejected |
| `POST /auth/refresh` with reused (already-rotated) token | ✅ 401 `auth.invalidSession`, entire chain revoked (confirmed via direct MySQL query — this is what caught bug #2 above) |
| `POST /auth/logout` | ✅ 204, cookie cleared (`Max-Age=0`) |
| `POST /auth/refresh` after logout | ✅ 401 `auth.invalidSession` |
| DB state | ✅ `flyway_schema_history` unchanged; test users created during manual verification deleted afterward (cascade-deleted their refresh tokens) |
| Shutdown | ✅ clean, no errors |

## Frontend Integration Preparation

Documented in full in `docs/backend-discovery/api-authentication.md` (the required
second report) — every mock file that will be replaced, the exact request/response DTO
shapes, and the migration steps.

## Remaining TODO

- No other domain implemented (by design — organizations, actions, participation,
  attendance, QR, reports, admin, moderation all remain mocked).
- The frontend itself was not touched — integration is a future phase, prepared for in
  `api-authentication.md`.
- Rate limiting / brute-force login protection remains explicitly deferred (per
  `security-and-authentication.md`'s own "later hardening, not MVP-blocking" list —
  unchanged by this phase).

## Suggested Next Feature

Wire the frontend's `auth.service.js`/`auth.store.js` to the real backend (per the
migration steps in `api-authentication.md`), then proceed to Users & Roles (admin user
management) per the discovery's recommended incremental order.
