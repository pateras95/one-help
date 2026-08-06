# DTO Catalogue

No JPA entity is ever returned or accepted directly by any controller — every endpoint
has an explicit, hand-defined request and/or response DTO. Bilingual fields use a
nested `{el, en}` object shape (matching the frontend's own existing convention
closely, per ADR-9), even though the database stores them as two separate columns —
the mapping is a thin MapStruct concern, not a schema concern.

Legend: **Sensitivity** — `public` (safe for anonymous callers), `self` (caller's own
resource only), `admin` (administrators only), `owner` (the resource's owning
organizer, plus admin).

---

## Auth & users

### `RegisterRequest`

| Field | Type | Required | Validation |
|---|---|---|---|
| `firstName` | string | yes | `@NotBlank`, max 100 |
| `lastName` | string | yes | `@NotBlank`, max 100 |
| `email` | string | yes | `@Email`, max 255 |
| `password` | string | yes | `@Size(min=8)` |

### `LoginRequest`

| Field | Type | Required |
|---|---|---|
| `email` | string | yes |
| `password` | string | yes |

### `AuthResponse`

| Field | Type | Notes |
|---|---|---|
| `accessToken` | string | JWT, 15 min TTL |
| `expiresIn` | integer | seconds until access token expiry (900) |
| `user` | `CurrentUserResponse` | nested, avoids a second round trip |

Refresh token is **never** in this body — delivered only via `Set-Cookie`.

### `CurrentUserResponse`

Maps `User`. **Sensitivity: self.**

| Field | Type | Required | Persisted | Public? | Sensitive? | Frontend mapping |
|---|---|---|---|---|---|---|
| `id` | UUID | yes | yes | no | no | `currentUser.id` |
| `firstName` | string | yes | yes | no | no | `currentUser.firstName` |
| `lastName` | string | yes | yes | no | no | `currentUser.lastName` |
| `email` | string | yes | yes | no | yes (PII) | `currentUser.email` |
| `role` | enum | yes | yes | no | no | `currentUser.role` |
| `status` | enum | yes | yes | no | no | `currentUser.status` (new — mock never put status on the user object itself, since it lived in a separate storage key; now the same aggregate) |
| `avatarInitials` | string | yes | yes | no | no | `currentUser.avatarInitials` |
| `localePreference` | string | yes | yes | no | no | `currentUser.localePreference` |
| `createdAt` | ISO datetime | yes | yes | no | no | `currentUser.createdAt` |

### `UserSummaryResponse`

**Sensitivity: public-safe subset**, used for organizer-facing participant identity
and admin listings. Fields: `id`, `firstName`, `lastName`, `avatarInitials` — **never**
`email` here (only the admin user-management endpoints, which use
`CurrentUserResponse`-shaped detail, expose email) — matching the mock's own
`getOrganizerActionParticipants` sanitized shape exactly (`firstName`/`lastName`/
`email`/`avatarInitials` were the mock's fields; `email` is kept in the participant
list specifically since organizers need to contact confirmed volunteers, so
`UserSummaryResponse` used in a *participant-list* context includes `email`, while the
same DTO used in a *public/anonymous* context — none exists today, no endpoint exposes
other users publicly — would omit it. Documented as one DTO with context-dependent
population, not two DTOs, since only one context currently exists.)

### `UpdateUserRequest`

Admin-only, editing another user's safe profile fields — **role is never a field on
this DTO** (mass-assignment prevention, `security-and-authentication.md`).

| Field | Type | Required | Validation |
|---|---|---|---|
| `firstName` | string | yes | `@NotBlank`, max 100 |
| `lastName` | string | yes | `@NotBlank`, max 100 |
| `email` | string | yes | `@Email`, unique excluding self |

---

## Organizations & applications

### `OrganizationApplicationRequest`

Used for submit / update-pending / resubmit-rejected (same shape, three endpoints).

| Field | Type | Required | Validation | Frontend mapping |
|---|---|---|---|---|
| `name` | `{el, en}` | yes | each 2–120 chars | `name.el`/`name.en` |
| `organizationType` | enum | yes | valid `OrganizationType` | `organizationType` |
| `description` | `{el, en}` | yes | each 20–2000 chars | `description.el`/`.en` |
| `contactEmail` | string | yes | `@Email` | `contactEmail` |
| `phone` | string | no | max 50 | `phone` |
| `website` | string | no | `^https?://.+\..+$` | `website` |
| `address` | string | yes | `@NotBlank`, max 255 | `address` |
| `municipality` | string | yes | `@NotBlank`, max 120 | `municipality` |
| `categories` | array of enum | yes | non-empty, valid `ActionCategory` values | `categories` |
| `supportingMessage` | string | yes | 20–2000 chars | `supportingMessage` |
| `acceptedTerms` | boolean | yes (submit only) | must be `true` | `acceptedTerms` — not persisted as a field (matches mock) |

### `OrganizationApplicationResponse` / `OrganizationResponse`

Same underlying entity, same DTO — the mock's own "the application is the
organization record" (ADR-8) carries through as one response shape.
**Sensitivity: self (own) or admin; a public subset is composed separately, see
`ActionDetailsResponse.organizationDetails` below, never this full shape.**

| Field | Type | Public? | Sensitive? | Notes |
|---|---|---|---|---|
| `id` | UUID | no | no | |
| `name` | `{el, en}` | — | no | |
| `description` | `{el, en}` | — | no | |
| `organizationType` | enum | — | no | |
| `contactEmail`, `phone`, `website`, `address`, `municipality` | string | — | no | |
| `categories` | array | — | no | |
| `supportingMessage` | string | no (self/admin only) | no | not shown in any public subset |
| `status` | enum | — | no | |
| `submittedAt`, `reviewedAt` | ISO datetime | no | no | |
| `reviewedBy` | `UserSummaryResponse` \| null | no (admin only) | no | mock exposed only an id; DTO resolves a display name for admin UI convenience |
| `rejectionReason`, `previousRejectionReason` | string \| null | no (self/admin) | no | |

`organizerUserId` is **never** a field on this DTO — the caller's own ownership is
implicit (they're calling `/organizations/me`); an admin's view resolves the organizer
as a nested `UserSummaryResponse` (`organizer` field) instead of a raw id, closing the
mock's "never exposed to the client" note by making the *safe resolved form* the only
form that exists.

### `UpdateOrganizationRequest`

Same fields as `OrganizationApplicationRequest` minus `acceptedTerms` (already
accepted at submission) — used for both organizer self-edit (`approved`/`suspended`
only, per the mock's own gating) and admin edit.

---

## Actions

### `ActionCreateRequest` / `ActionUpdateRequest`

Identical shape (update omits nothing — full replacement semantics, matching the
mock's own PATCH-as-full-payload pattern); `ActionUpdateRequest` additionally forbids
`lifecycleStatus` as a field (status changes go through the dedicated transition
endpoint only, never folded into a general edit — matching the mock's own separation
of `updateOrganizerAction` vs. `changeOrganizerActionStatus`).

| Field | Type | Required | Validation |
|---|---|---|---|
| `category` | enum | yes | valid `ActionCategory` |
| `title` | `{el, en}` | yes | non-blank both |
| `description` | `{el, en}` | yes | non-blank both |
| `locationName` | `{el, en}` | yes | non-blank both |
| `municipality` | `{el, en}` | yes | non-blank both |
| `latitude` | number \| null | no | -90..90, both-or-neither with longitude |
| `longitude` | number \| null | no | -180..180, both-or-neither with latitude |
| `startAt` | ISO datetime | yes | must not be in the past |
| `endAt` | ISO datetime \| null | no | if present, must be after `startAt` |
| `timezone` | string | no (defaults `Europe/Athens`) | valid IANA zone id |
| `capacity` | integer | yes | `> 0`; on update, `>=` current confirmed count |
| `urgency` | enum | yes | valid `ActionUrgency` |
| `requiredEquipment` | `{el: string[], en: string[]}` | yes (may be empty arrays) | — |
| `lifecycleStatus` | enum | create only | must be `DRAFT` or `PUBLISHED` at creation; absent/rejected on update |

### `ActionTransitionRequest`

| Field | Type | Required |
|---|---|---|
| `status` | enum (`ActionLifecycleStatus`) | yes |

### `ActionSummaryResponse`

**Sensitivity: public** (returned by the list endpoint). Derived/computed fields
marked explicitly.

| Field | Type | Persisted | Derived | Public? |
|---|---|---|---|---|
| `id` | UUID | yes | no | yes |
| `category` | enum | yes | no | yes |
| `title`, `locationName`, `municipality` | `{el, en}` | yes | no | yes |
| `startAt`, `endAt`, `timezone` | ISO datetime / string | yes | no | yes |
| `capacity` | integer | yes | no | yes |
| `registeredCount` | integer | **no** | **yes** — `COUNT(*)` over confirmed participations (ADR-5) | yes |
| `urgency` | enum | yes | no | yes |
| `status` | enum (`open`/`full`/`closed`/`completed`) | **no** | **yes** — computed from `lifecycleStatus` + `startAt` + capacity vs. `registeredCount`, matching the mock's `computeStatus` exactly | yes |
| `organizationSummary` | nested `{id, name, organizationType}` | — | resolved | yes |

### `ActionDetailsResponse`

Extends `ActionSummaryResponse`'s fields, adds:

| Field | Type | Public? | Notes |
|---|---|---|---|
| `description`, `requiredEquipment` | `{el, en}` / `{el:[],en:[]}` | yes | |
| `latitude`, `longitude` | number \| null | yes | |
| `organizationDetails` | nested (see below) | yes | full public-safe organization subset |
| `moderationStatus` | enum | **no** (owner/admin only) | included only when the caller is the owning organizer or an admin |
| `moderationReason` | string \| null | **no** (owner/admin) | |

`organizationDetails` (nested, public-safe): `{id, name, organizationType,
description, contactEmail, phone, website, municipality}` — explicitly **never**
`organizerUserId`, `supportingMessage`, `rejectionReason` (mirrors
`domain-models.md`'s public/private split exactly). This is composed from the real
`Organization` row at read time — **not** a denormalized copy stored on the action
(closing risk #7 — the mock's `Action.organization` field could drift from the real
organization name; this design cannot drift, since it is always a live join).

### `OrganizerActionResponse`

Same fields as `ActionDetailsResponse` but from the owner's perspective: full
`moderationStatus`/`moderationReason`/`reviewedAt` always included (no gating, since
the caller already is the owner), plus `registeredCount` (computed, same as public).

---

## Participation

### `ParticipationResponse`

**Sensitivity: self** (a volunteer sees only their own).

| Field | Type | Persisted | Notes |
|---|---|---|---|
| `id` | UUID | yes | |
| `actionId` | UUID | yes | |
| `status` | enum | yes | |
| `joinedAt` | ISO datetime | yes | |
| `cancelledAt` | ISO datetime \| null | yes | |

### `MyActionResponse`

Composed for the "My Actions" screen — wraps `ParticipationResponse` +
`ActionSummaryResponse` (or `null` if the action can no longer be resolved — see
`error-contract.md`/`rest-api-design.md` for how the backend avoids the mock's own
"stuck in Upcoming forever" classification bug, risk item 21, by classifying based on
`startAt` **or**, when the action is unresolvable, a distinct `"unknown"` bucket
returned explicitly rather than silently defaulting to "upcoming") + optional
`attendance` (`AttendanceResponse` \| null).

---

## Attendance & QR

### `AttendanceResponse`

**Sensitivity: self (volunteer's own), owner (organizer of the action), admin.**

| Field | Type | Persisted |
|---|---|---|
| `id` | UUID | yes |
| `participationId`, `actionId`, `userId` | UUID | yes |
| `status` | enum | yes |
| `checkedInAt`, `checkedOutAt` | ISO datetime / null | yes |
| `checkInMethod` | enum | yes |

`recordedByOrganizerId` is **not** exposed to the volunteer's own view (no need to
know which organizer manually checked them in) but **is** included when the caller is
the owning organizer or an admin — same DTO, context-dependent field population
(consistent with `UserSummaryResponse`'s approach above).

### `QrSessionResponse`

**Sensitivity: owner only** (the organizer who generated it).

| Field | Type | Notes |
|---|---|---|
| `token` | string | the signed JWT, opaque to the frontend, encoded into the QR image client-side |
| `expiresAt` | ISO datetime | drives the countdown UI |

`tokenId`, `issuedByOrganizerId` are **never** returned — internal-only fields on the
`qr_check_in_tokens` row.

### `QrCheckInRequest`

| Field | Type | Required |
|---|---|---|
| `token` | string | yes |

(`userId` is **not** a field — always the authenticated principal, per
`security-and-authentication.md`'s "volunteer can participate/check in only as
themselves" rule.)

### `ManualCheckInRequest`

| Field | Type | Required |
|---|---|---|
| `participationId` | UUID | yes |

(`organizerId` is **not** a field — always the authenticated principal.)

---

## Reports

### `ActionReportRequest`

| Field | Type | Required | Validation |
|---|---|---|---|
| `reason` | enum | yes | valid `ReportReason` |
| `description` | string \| null | no | max length bound (`TEXT`, but a practical `@Size(max=2000)` applied at the DTO layer to bound abuse even though the column itself is unbounded `TEXT`) |

(`actionId` comes from the path, `reporterUserId` is always the authenticated
principal — never request fields.)

### `ReportResponse`

**Sensitivity: self (reporter's own) or admin.**

| Field | Type | Persisted |
|---|---|---|
| `id`, `actionId` | UUID | yes |
| `reason` | enum | yes |
| `description` | string \| null | yes |
| `status` | enum | yes |
| `createdAt`, `resolvedAt` | ISO datetime / null | yes |
| `resolutionNote` | string \| null | yes (admin view only) |
| `reporter` | `UserSummaryResponse` | admin view only — a self-view never needs to see "who reported," since it's always the caller |
| `resolvedBy` | `UserSummaryResponse` \| null | admin view only |

### `ModerationTransitionRequest`

| Field | Type | Required | Notes |
|---|---|---|---|
| `status` | enum (`ActionModerationStatus`) | yes | target status |
| `reason` | string \| null | required when target is `REJECTED` | |

(Reused identically for report-status transitions with `ReportStatus` substituted —
documented as one shape pattern, not a literal shared class, since the enums differ.)

---

## Cross-cutting DTOs

### `ActivityLogResponse`

**Sensitivity: admin.**

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `admin` | `UserSummaryResponse` | resolved, not a raw id |
| `actionType` | enum | |
| `targetType` | enum | |
| `targetId` | UUID | raw id — polymorphic, no resolved-object convenience field, matching `database-schema.md`'s explicit no-FK design |
| `metadata` | object (map) | interpolation params, resolved into display text **client-side** at render time (matches the mock's own `activityMetadataForTranslation`, preserved deliberately so locale-switching re-translates old entries without a backend round trip) |
| `createdAt` | ISO datetime | |

### `PageResponse<T>`

Generic envelope for every list endpoint.

| Field | Type | Notes |
|---|---|---|
| `content` | array of `T` | the page's items |
| `page` | integer | zero-based page number |
| `size` | integer | page size |
| `totalElements` | long | |
| `totalPages` | integer | |

### `ApiErrorResponse`

Fully specified in `error-contract.md` — included here only for completeness of the
DTO catalogue.

| Field | Type |
|---|---|
| `timestamp` | ISO datetime |
| `status` | integer (HTTP status) |
| `code` | string (stable domain error code) |
| `message` | string (human-readable fallback) |
| `fieldErrors` | object map, optional |
| `traceId` | string |

---

## Derived vs. persisted values — summary (cross-reference)

| DTO field | Derived at read time? |
|---|---|
| `ActionSummaryResponse.registeredCount` | yes (ADR-5) |
| `ActionSummaryResponse.status` | yes (lifecycle + date + capacity) |
| `ActionDetailsResponse.organizationDetails` | yes (live join, never denormalized) |
| `CurrentUserResponse.status` | no — persisted directly on `users.status` (unlike the mock, where it lived in a separate overlay) |
| `MyActionResponse`'s upcoming/past bucket | yes — computed from `startAt` vs. `now()`, never stored |

No response DTO in this catalogue duplicates the mock's "stored translated
organization name on the action" pattern (risk #7) — every organization-derived field
is always resolved live from the `organizations` table.
