# Error Contract

The frontend relies on stable, machine-readable domain error-code strings
(`docs/backend-discovery/service-contracts.md`'s "every service throws `Error(code)`,
translated via a per-domain `*ErrorKey()` helper"). This document defines the backend's
uniform error response shape and the full mapping from every current frontend error
constant to a backend code and HTTP status, so no frontend component ever needs to
interpret a raw Spring/Hibernate exception message.

---

## Standard error response shape

```json
{
  "timestamp": "2026-08-03T14:00:00Z",
  "status": 400,
  "code": "participation.actionFull",
  "message": "This action has reached its capacity.",
  "fieldErrors": {
    "email": "validation.email.invalid"
  },
  "traceId": "b3f1c2a4-9e2d-4b6b-8f2a-1c2d3e4f5a6b"
}
```

| Field | Type | Always present? | Notes |
|---|---|---|---|
| `timestamp` | ISO-8601 UTC datetime | yes | server time the error was produced |
| `status` | integer | yes | mirrors the HTTP status code, included in the body for clients that log the body independent of headers |
| `code` | string | yes | stable, machine-readable, dot-namespaced (`domain.specificError`) — this is the field the frontend actually branches on, exactly replacing today's `err.message` |
| `message` | string | yes | safe, human-readable **fallback only** — the frontend's own i18n layer is the primary source of user-facing text (via `code` → translation key mapping, identical in spirit to today's `*ErrorKey(code)` helpers); `message` exists for contexts with no i18n mapping yet (e.g. server logs, API consumers other than this frontend) |
| `fieldErrors` | object map (field name → validation code) | only on validation failures (422) | one entry per invalid DTO field |
| `traceId` | string (UUID) | yes | correlates to the structured server log line, per `system-architecture.md` § Observability |

**Never included**: stack traces, Java/Spring exception class names, SQL fragments,
or any internal implementation detail. Every exception the global
`@ControllerAdvice` (in `common`) does not recognize as a domain exception is caught,
logged server-side at `ERROR` with the `traceId`, and returned to the client as a
generic `500` with `code: "common.unexpectedError"` — the client never sees why it
actually failed internally.

---

## HTTP status conventions

| Situation | HTTP status |
|---|---|
| Validation failure (Bean Validation `@Valid` failure) | 422 Unprocessable Entity |
| Domain rule violation (e.g. capacity full, invalid transition) | 400 Bad Request |
| Not authenticated | 401 Unauthorized |
| Authenticated but wrong role, or resource exists but caller has no relationship to it and role-level rejection is the correct signal (`/admin/**` by a non-admin) | 403 Forbidden |
| Resource does not exist, or exists but must not be disclosed to this caller (ADR-13/§ 404 vs 403 policy in `security-and-authentication.md`) | 404 Not Found |
| Duplicate/conflicting state (unique constraint, optimistic-lock conflict) | 409 Conflict |
| Unexpected server-side failure | 500 Internal Server Error |

---

## Error-code catalogue (frontend mock code → backend code → HTTP status)

### Authentication (`auth.*`)

| Frontend code | Backend code | HTTP | Notes |
|---|---|---|---|
| `unknownEmail` | `auth.unknownEmail` | 401 | |
| `invalidPassword` | `auth.invalidPassword` | 401 | |
| `duplicateEmail` | `auth.duplicateEmail` | 409 | |
| `invalidSession` | `auth.invalidSession` | 401 | also covers an invalid/expired/reused refresh token |
| `accountSuspended` | `auth.accountSuspended` | 403 | |
| `generic` | `common.unexpectedError` | 500 | |

### Users / admin users (`admin.*`)

| Frontend code | Backend code | HTTP |
|---|---|---|
| `cannotSuspendSelf` | `admin.cannotSuspendSelf` | 400 |
| `duplicateEmail` (admin edit) | `admin.duplicateEmail` | 409 |
| `notFound` | `admin.notFound` | 404 |
| `invalidRequest` | `admin.invalidRequest` | 422 |

### Organizations & applications (`becomeOrganizer.*`, `admin.*`)

| Frontend code | Backend code | HTTP |
|---|---|---|
| `alreadyHasOrganization` | `organization.alreadyHasOrganization` | 409 |
| `suspended` (submit blocked, prior org suspended) | `organization.suspended` | 409 |
| `notPending` | `organization.notPending` | 400 |
| `notRejected` | `organization.notRejected` | 400 |
| `notOrganizer` | `organization.notOrganizer` | 403 |
| `invalidOrganizationType` | `organization.invalidOrganizationType` | 422 |
| `invalidEmail` | `organization.invalidEmail` | 422 |
| `invalidWebsite` | `organization.invalidWebsite` | 422 |
| `invalidCategories` | `organization.invalidCategories` | 422 |
| `termsNotAccepted` | `organization.termsNotAccepted` | 422 |
| `duplicateName` | `organization.duplicateName` | 409 |
| `reasonRequired` (reject) | `organization.reasonRequired` | 422 |
| `invalidTransition` | `organization.invalidTransition` | 400 |
| `notFound` | `organization.notFound` | 404 |

### Actions / organizer actions (`organizer.errors.*`)

| Frontend code | Backend code | HTTP |
|---|---|---|
| `actionNotFound` | `action.notFound` | 404 |
| `notOwner` | `action.notOwner` | 404 *(see § 404 vs 403 policy — an organizer probing another's action id gets 404, not 403)* |
| `invalidCategory` | `action.invalidCategory` | 422 |
| `invalidDate` | `action.invalidDate` | 422 |
| `invalidCapacity` | `action.invalidCapacity` | 422 |
| `capacityBelowConfirmed` | `action.capacityBelowConfirmed` | 409 |
| `invalidStatus` | `action.invalidStatus` | 422 |
| `invalidTransition` | `action.invalidTransition` | 400 |
| `actionDateInPast` | `action.actionDateInPast` | 400 |
| `invalidCoordinates` | `action.invalidCoordinates` | 422 |
| `organizationSuspended` | `action.organizationSuspended` | 403 |
| `organizationNotApproved` | `action.organizationNotApproved` | 403 |

### Public actions (no dedicated mock error codes — not-found is the only case)

| Situation | Backend code | HTTP |
|---|---|---|
| Action does not exist, or exists but is not publicly visible | `action.notFound` | 404 |

### Participation (`participation.errors.*`)

| Frontend code | Backend code | HTTP | Notes |
|---|---|---|---|
| `invalidRequest` | `participation.invalidRequest` | 422 | |
| `actionNotFound` | `participation.actionNotFound` | 404 | |
| `actionClosed` | `participation.actionClosed` | 409 | **widened scope** per ADR-10: now covers past-date **and** `CLOSED`/`CANCELLED` lifecycle status, **and** unapproved moderation/organization status (see below) |
| `actionFull` | `participation.actionFull` | 409 | |
| `alreadyJoined` | `participation.alreadyJoined` | 409 | |
| `participationNotFound` | `participation.participationNotFound` | 404 | |
| *(new)* | `participation.organizationNotApproved` | 403 | new, distinct code for the ADR-10 correction — organization not approved/suspended blocks joining with its own specific code rather than being folded into the generic `actionClosed`, so the frontend can show a more accurate message when this becomes an implementation-phase concern |
| *(new)* | `participation.actionNotModerated` | 403 | new, distinct code — moderation not yet approved |

### Attendance & QR (`attendance.errors.*`)

| Frontend code | Backend code | HTTP | Notes |
|---|---|---|---|
| `invalidRequest` | `attendance.invalidRequest` | 422 | |
| `notOwner` | `attendance.notOwner` | 404 | organizer probing another's action |
| `participationNotFound` | `attendance.participationNotFound` | 404 | |
| `notConfirmed` | `attendance.notConfirmed` | 409 | |
| `actionNotJoinable` | `attendance.actionNotJoinable` | 409 | |
| `alreadyCheckedIn` | `attendance.alreadyCheckedIn` | 409 | |
| `notCheckedIn` | `attendance.notCheckedIn` | 409 | |
| `invalidToken` | `attendance.invalidToken` | 401 | covers signature failure, malformed token, and organizer-id mismatch (ADR-6 — all three collapse to one code, matching the mock's own "treated identically to a malformed token" behavior) |
| `expiredToken` | `attendance.expiredToken` | 401 | |
| *(new)* | `attendance.outsideCheckInWindow` | 409 | new — ADR-11's hard QR check-in window enforcement |

### Reports (`admin.errors.*`)

| Frontend code | Backend code | HTTP |
|---|---|---|
| `invalidRequest` | `report.invalidRequest` | 422 |
| `notFound` | `report.notFound` | 404 |
| `cannotReportOwnAction` | `report.cannotReportOwnAction` | 403 |
| `duplicateOpenReport` | `report.duplicateOpenReport` | 409 |
| `invalidTransition` | `report.invalidTransition` | 400 |

### Generic / cross-cutting

| Situation | Backend code | HTTP |
|---|---|---|
| Bean Validation failure | `validation.failed` (with `fieldErrors` populated, each field's own code e.g. `validation.email.invalid`, `validation.size.tooShort`) | 422 |
| Optimistic-lock conflict | `common.staleWrite` | 409 |
| Not authenticated at all | `common.unauthenticated` | 401 |
| Authenticated, wrong role | `common.forbidden` | 403 |
| Unrecognized/unexpected exception | `common.unexpectedError` | 500 |

---

## Validation rules — DTO vs. service vs. database, per rule

Resolves Part 14. For every rule: where it is checked at each layer, and the
resulting code/status if violated at that layer.

| Rule | DTO (`@Valid`) | Service/domain | Database constraint | Resulting code | Status |
|---|---|---|---|---|---|
| Email format | `@Email` | — | — | `validation.email.invalid` | 422 |
| Email uniqueness (register) | — | pre-check for a clean message | `UNIQUE` functional index | `auth.duplicateEmail` | 409 |
| Password length ≥ 8 | `@Size(min=8)` | — | — | `validation.password.tooShort` | 422 |
| Organization name length 2–120 | `@Size(min=2,max=120)` on both `el`/`en` | — | `CHECK` | `validation.name.invalidLength` | 422 |
| Organization description length 20–2000 | `@Size` | — | `CHECK` | `validation.description.invalidLength` | 422 |
| Organization type valid | `@NotNull` + enum binding failure is a 422 automatically | — | `CHECK` constraint rejects any other value at the DB layer as a defensive backstop (VARCHAR + `CHECK`, ADR-17 — MySQL has no native `ENUM` type) | `validation.organizationType.invalid` | 422 |
| Organization categories non-empty, valid | `@NotEmpty` + enum values | service-layer check (MySQL cannot express "at least one child row exists" as a table-level `CHECK` on `organization_categories`, ADR-17) | `CHECK` on each `organization_categories.category` value | `validation.categories.invalid` | 422 |
| Website format | `@Pattern` | — | — | `validation.website.invalid` | 422 |
| Duplicate organization name | — | `AdminOrganizationService`/`OrganizationApplicationService` pre-check | none (no unique constraint on name — names are not required to be globally unique in the domain, only checked as a courtesy/quality signal, matching the mock's own `isOrganizationNameTaken` being a soft business check, not a hard uniqueness rule) | `organization.duplicateName` | 409 |
| Action category/date/capacity/coordinates | `@NotNull`/`@Future`/`@Positive`/`@DecimalMin`/`@DecimalMax` | cross-field checks (both-or-neither lat/lng, end after start) | `CHECK` constraints (defensive backstop) | `validation.<field>.invalid` | 422 |
| Action lifecycle transition validity | — | `ActionLifecycleStatus` transition table | none (transition legality is not expressible as a static `CHECK`) | `action.invalidTransition` | 400 |
| Participation eligibility (ADR-10) | — | `ParticipationEligibilityService` | none (a cross-table policy) | `participation.actionClosed` / `.organizationNotApproved` / `.actionNotModerated` | 403/409 |
| Participation capacity | — | `ParticipationService.join()`, row-locked count | none directly enforceable as a single-table `CHECK` (would need a trigger) | `participation.actionFull` | 409 |
| Duplicate confirmed participation | — | pre-check for a clean message | generated-column `UNIQUE` index (`active_confirmation_key`, ADR-15/ADR-17 — MySQL's replacement for a PostgreSQL partial index) — the actual guarantee | `participation.alreadyJoined` | 409 |
| Attendance duplicate check-in | — | pre-check | `UNIQUE (participation_id)` — the actual guarantee | `attendance.alreadyCheckedIn` | 409 |
| QR token signature/expiry/ownership | — | `QrTokenService` | none (cryptographic/time checks are not database concerns) | `attendance.invalidToken` / `.expiredToken` | 401 |
| Check-in window (ADR-11) | — | `AttendanceService`, QR path only | none | `attendance.outsideCheckInWindow` | 409 |
| Report duplicate active | — | pre-check | generated-column `UNIQUE` index (`active_report_key`, ADR-15/ADR-12/ADR-17 — MySQL's replacement for a PostgreSQL partial index) — the actual guarantee | `report.duplicateOpenReport` | 409 |
| Report own-action restriction | — | cross-table check (no `CHECK` possible, per `database-schema.md`) | none | `report.cannotReportOwnAction` | 403 |
| Rejection reason required | `@NotBlank` when `status == REJECTED` (custom cross-field validator) | also re-checked service-side | `CHECK` (defensive backstop) | `organization.reasonRequired` / equivalent for actions | 422 |

**No rule is duplicated differently between admin and organizer endpoints**: both
`OrganizerActionService` and `AdminActionModerationService`'s content-edit path call
the exact same `ActionValidationService.validate(payload)` (mirroring the mock's own
`updateActionDetails` reusing `organizerActions.service.js::validatePayload` verbatim,
per `docs/backend-discovery/service-contracts.md`) — there is one validation
implementation per rule, never two independently-maintained copies (closing the
discovery's flagged risk of duplicated `EMAIL_PATTERN`-style constants across admin
and organizer code paths, `docs/backend-discovery/risks-and-open-decisions.md` item
23).
