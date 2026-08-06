# Domain Models

Current frontend data models, extracted directly from mock fixtures, storage-module
validators, and service constructors — not idealized, not renamed. Where two features
use different terminology for the same concept, the mismatch is called out explicitly
rather than silently resolved.

Legend for **Recommended future backend representation**: this is a light-touch
suggestion only (full schema/DDL is explicitly out of scope for this discovery phase);
it exists so the mismatches are visible before schema design starts.

---

## User

Fields as constructed by `features/auth/services/auth.service.js`'s `sanitizeUser()`
(the only shape ever returned to the frontend — `password` is never included):

| Field | JS type | Required | Source | Validation | Persisted | Public? | Sensitive? | Future representation |
|---|---|---|---|---|---|---|---|---|
| `id` | string | yes | `MOCK_USERS` (`'user-volunteer-001'` style) or `'user-' + crypto.randomUUID()` on register | none beyond presence | yes | no (never shown to other users) | no | UUID/bigint PK |
| `firstName` | string | yes | fixture, overridable via `userProfileOverride` | trimmed on register/admin-edit | yes | shown to organizer as participant identity | no | `varchar` |
| `lastName` | string | yes | same | same | yes | same | no | `varchar` |
| `email` | string | yes | fixture, overridable | regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`, lowercased, duplicate-checked (register + admin edit) | yes | shown to organizer as participant identity | yes (PII) | `varchar`, unique constraint |
| `password` | string | yes (fixture only) | `MOCK_USERS` fixture / register payload | none beyond presence; register requires ≥8 chars, confirm-match | yes (mock only, plaintext) | **never** | **yes — plaintext in fixture** | must be hashed (bcrypt/argon2), never logged, never returned |
| `role` | string enum | yes | fixture, overridden by `userRoleOverride` on approval/demotion | must be one of `ROLES` | yes | yes (own role shown in UI) | no | `varchar`/enum column |
| `avatarInitials` | string | yes | fixture / computed from first/last name on register | 2 chars | yes | yes | no | derivable, may not need storage |
| `localePreference` | string | yes | fixture (`'el'`) / `DEFAULT_LOCALE` on register | one of `SUPPORTED_LOCALES` | yes | no | no | `varchar` |
| `createdAt` | string (ISO) | yes | fixture / `new Date().toISOString()` on register | none | yes | no | no | `timestamp` |
| `status` | string enum | yes (computed, not stored on the user object itself) | `getUserStatus(user.id)` from **admin**'s `userStatus.storage.js` | must be one of `ACCOUNT_STATUS` | yes (separate storage key) | no | no | should collapse into a `status` column on the same `users` row |

**Terminology mismatch**: "role" and "account status" are modeled as two entirely
separate storage overlays owned by two different features (`auth` owns role/profile,
`admin` owns status) even though both are just mutable attributes of the same `User`.
This is a mock-only artifact of `MOCK_USERS` being immutable in memory — see
`risks-and-open-decisions.md`.

## Auth Session

Persisted shape (`onehelp.auth.session`), written by `features/auth/stores/auth.store.js`:

| Field | JS type | Required | Persisted | Sensitive? | Future representation |
|---|---|---|---|---|---|
| `userId` | string | yes | yes | no (not a secret by itself) | subject claim of a real JWT/session token |
| `issuedAt` | string (ISO) | yes | yes | no | `iat` claim |

No password, token, or role is ever persisted here — the session is re-validated
against the mock "backend" (`getCurrentSession(userId)`) on every app boot and every
router navigation, re-checking suspension each time. A real backend replaces this whole
object with a signed JWT or opaque session token; `issuedAt`/expiry semantics move
server-side.

## Organization Application / Organization

**Terminology note**: the frontend has no separate "OrganizationApplication" record —
the application *is* the organization record, distinguished only by its `status` field
(`pending` until reviewed). This single `Organization` model serves both purposes.

Fields (from `features/admin/mocks/organizations.mock.js` fixture +
`organizerApplication/services/organizationApplication.service.js`'s constructors):

| Field | JS type | Required | Source | Validation | Persisted | Public? | Sensitive? | Future representation |
|---|---|---|---|---|---|---|---|---|
| `id` | string | yes | fixture id or `crypto.randomUUID()` on submit | — | yes | indirectly (via action's `organizationDetails`) | no | UUID/bigint PK |
| `organizerUserId` | string | yes | the submitting user's id | must not already own another organization (any status) | yes | **never exposed directly to the client** — resolved server-side into `organizationDetails` on an action | no | FK unique to `users.id` |
| `name` | `{el: string, en: string}` | yes | form input, `buildOrganizationFieldsFromPayload` duplicates single input into both keys ("a mock simplification, not a translation") | length 2–120 (both client form and service validator, duplicated regex/constants independently) | yes | yes | no | single `varchar` column once real i18n is designed, or a proper translation table — not a hardcoded duplicate pair |
| `description` | `{el, en}` | yes | same | length 20–2000 | yes | yes | no | same as above |
| `contactEmail` | string | yes | form | email regex | yes | yes | no | `varchar` |
| `phone` | string | optional | form | none found beyond presence | yes | yes | no | `varchar` |
| `website` | string | optional | form | `^https?:\/\/.+\..+/i` | yes | yes | no | `varchar` |
| `address` | string | yes | form | required, no format check | yes | yes | no | `varchar` |
| `municipality` | string | yes | form | required | yes | yes | no | `varchar` or FK to a municipalities table |
| `categories` | array | yes | form | non-empty, each id validated against `isValidCategoryId` | yes | yes | no | join table or array column |
| `organizationType` | string enum | yes | form | one of `ORGANIZATION_TYPES` ids | yes | yes | no | `varchar`/enum |
| `supportingMessage` | string | yes | form | length 20–2000 | yes | no (admin-only review context) | no | `text` |
| `acceptedTerms` | boolean | yes (submit only) | form | must be `true` | not persisted as a field beyond the one-time submit check | no | no | not stored; an audit-log entry of consent may be preferable |
| `status` | string enum | yes | service | one of `ORGANIZATION_STATUS`; transitions gated by `canTransitionOrganization` | yes | yes (drives visibility) | no | `varchar`/enum |
| `submittedAt` | ISO string | yes | service (`new Date().toISOString()`) | — | yes | no | no | `timestamp` |
| `reviewedAt` | ISO string \| null | optional | service | — | yes | no | no | `timestamp` nullable |
| `reviewedBy` | string \| null | optional | service | FK → admin user id | yes | no | no | FK nullable |
| `rejectionReason` | string \| null | optional | service (reject action) | required non-empty when rejecting | yes | shown to the organizer | no | `text` nullable |
| `previousRejectionReason` | string \| null | optional | set only on resubmit (copies old `rejectionReason`) | — | yes | no | no | consider an append-only history table instead of a single "previous" field if more than one resubmission needs to be inspectable |

## Organization Ownership / Membership

Fields (`organizerApplication/mocks/organizationMembership.storage.js`):

| Field | JS type | Required | Notes | Future representation |
|---|---|---|---|---|
| `id` | string (uuid) | yes | | PK |
| `organizationId` | string | yes | FK, one row per organization enforced by dev-only repair pass | unique FK |
| `userId` | string | yes | FK, one row per user enforced by `createOwnerMembership` | unique FK |
| `membershipRole` | string | yes | **always `'owner'`** — `MEMBERSHIP_ROLE = { OWNER: 'owner' }` is the only value that will ever exist, per explicit code comment | likely unnecessary column if this collapses into `organizations.organizer_user_id` |
| `status` | string enum | yes | `MEMBERSHIP_STATUS = ORGANIZATION_STATUS` — **literally aliased**, not an independent enum | see "duplicated state" risk below |
| `createdAt` | ISO string | yes | | `timestamp` |
| `approvedAt` | ISO string | optional | set by `createOwnerMembership` at approval time | `timestamp` nullable |

**This entire model is a candidate for elimination** in the real backend — see
`risks-and-open-decisions.md`: since `membershipRole` has exactly one possible value and
`status` is a value-for-value alias of `Organization.status`, a `Membership` table adds
no information beyond what `organizations.organizer_user_id` already encodes.

## Action

**Terminology note**: two overlapping status concepts exist on the same entity —
`organizerStatus` (the organizer's own lifecycle control) and a separately-stored
moderation `status` (admin's overlay, keyed by `actionId` in a different storage
module). Neither is called just `"status"` in isolation without qualification; both are
referred to as "status" in casual comments across the codebase, which is a real
readability/naming risk once these become API fields.

Fields (union of the base fixture shape and organizer-created records — the two are
otherwise field-identical):

| Field | JS type | Required | Source | Validation | Persisted | Public? | Sensitive? | Future representation |
|---|---|---|---|---|---|---|---|---|
| `id` | string | yes | fixture (`'act-NNN'`) or `crypto.randomUUID()` (organizer-created) | — | yes | yes | no | UUID PK |
| `organizerId` | string | yes | the owning organizer's user id | ownership-checked on every mutation | yes | **never exposed directly** — resolved into `organizationDetails` for public reads | no | FK to `users.id` |
| `organizerStatus` | string enum | yes | organizer service | one of `ORGANIZER_ACTION_STATUS`, transitions gated by `canTransition` | yes | indirectly (drives visibility) | no | `varchar`/enum, consider renaming to avoid ambiguity with moderation status |
| `categoryId` | string | yes | form | one of `ACTION_CATEGORIES` ids | yes | yes | no | `varchar`/enum or FK to a categories table |
| `organization` | `{el, en}` | yes | fixture: real organization display name; organizer-created: both keys set to the same plain `organizationName` string (not resolved from the real `Organization.name`) | — | yes | yes | no | **should be derived from the `Organization` relation, not stored redundantly on the action** — flagged as duplicated data |
| `title` | `{el, en}` | yes | form | non-empty both languages | yes | yes | no | see i18n note under Organization |
| `description` | `{el, en}` | yes | form | non-empty both languages | yes | yes | no | same |
| `locationName` | `{el, en}` | yes | form | non-empty both languages | yes | yes | no | same |
| `municipality` | `{el, en}` | yes | form | non-empty | yes | yes | no | same |
| `latitude` | number \| null | fixture: always present; organizer-created: optional | form/geolocation picker | if present, must be paired with `longitude` and in range | yes | yes | no | `decimal`/`double` nullable |
| `longitude` | number \| null | same as latitude | same | same | yes | yes | no | same |
| `date` | string `YYYY-MM-DD` | yes | form | must not be in the past (checked at create/publish time, not at read time) | yes | yes | no | `date` |
| `startTime` | string `HH:MM` | yes | form | regex `^([01]\d|2[0-3]):([0-5]\d)$` | yes | yes | no | `time` |
| `capacity` | number | yes | form | finite, > 0; cannot be lowered below current confirmed-participant count | yes | yes | no | `int` |
| `registeredCount` | number | yes | fixture seed value; organizer-created starts at `0` | ≥ 0 | yes | yes (overlaid client-side with live participation count, see business-rules.md) | no | **candidate for becoming a server-calculated value** (a live `COUNT(*)` over confirmed participations) rather than a stored, independently-incrementable column — see risks doc |
| `urgency` | string enum | yes | form | one of `'normal' \| 'high' \| 'urgent'` | yes | yes | no | `varchar`/enum |
| `requiredEquipment` | `{el: string[], en: string[]}` | yes | form | arrays present (may be empty) | yes | yes | no | array column or child table |

## Participation

| Field | JS type | Required | Source | Validation | Persisted | Public? | Sensitive? | Future representation |
|---|---|---|---|---|---|---|---|---|
| `id` | string (uuid) | yes | `crypto.randomUUID()` | — | yes | no | no | UUID PK |
| `userId` | string | yes | current authenticated user | — | yes | no (organizer sees identity via a join, not this raw record) | no | FK → `users.id` |
| `actionId` | string | yes | — | must resolve to a real, joinable action | yes | no | no | FK → `actions.id` |
| `status` | string enum | yes | — | one of `PARTICIPATION_STATUS` (`confirmed`/`cancelled`); only `confirmed → cancelled` transition exists, rejoin creates a **new** record rather than reactivating | yes | no | no | `varchar`/enum |
| `joinedAt` | ISO string | yes | — | — | yes | no | no | `timestamp` |
| `cancelledAt` | ISO string \| null | optional, **not enforced by the storage validator** (a record missing it still passes shape validation) | — | not required even when `status === 'cancelled'` | yes | no | no | should become a `NOT NULL WHEN status='cancelled'` check constraint or application-level guarantee, currently absent |

## Attendance

| Field | JS type | Required | Source | Validation | Persisted | Public? | Sensitive? | Future representation |
|---|---|---|---|---|---|---|---|---|
| `id` | string (uuid) | yes | `crypto.randomUUID()` | — | yes | no | no | UUID PK |
| `participationId` | string | yes | the resolved participation | must reference a currently-`confirmed` participation | yes | no | no | FK → `participations.id`, ideally unique (one attendance row per participation ever — confirmed by "duplicate check-in prevention" logic) |
| `actionId` | string | yes | — | — | yes | no | no | FK → `actions.id` (denormalized from participation, kept for direct lookup) |
| `userId` | string | yes | `= participation.userId` | — | yes | no | no | FK → `users.id` (denormalized) |
| `status` | string enum | yes | — | one of `ATTENDANCE_STATUS.CHECKED_IN`/`CHECKED_OUT` — `NOT_CHECKED_IN` is never persisted, implied by record absence; `CHECKED_IN → CHECKED_OUT` is the only transition, terminal (no re-entry) | yes | no | no | `varchar`/enum |
| `checkedInAt` | ISO string | yes | — | — | yes | no | no | `timestamp` |
| `checkedOutAt` | ISO string \| null | optional, not validated | — | — | yes | no | no | `timestamp` nullable |
| `checkInMethod` | string enum | yes | — | one of `CHECK_IN_METHOD.QR`/`MANUAL` | yes | no | no | `varchar`/enum |
| `recordedByOrganizerId` | string \| null | optional, not validated | — | non-null only for `MANUAL`; `null` for `QR` | yes | no | no | FK nullable → `users.id` |

Explicit code comment confirms: "Never stores or reads full participation/user objects
— only the `participationId`/`actionId`/`userId` references, and never any health
information."

## QR Token / QR Session

**Two distinct concepts share this space**: a short-lived signed-looking *token payload*
(what gets encoded into the QR image) and a *persisted session* (what the organizer's
device keeps in localStorage so refreshing the check-in screen doesn't lose the current
token).

**QR token payload** (`createQrTokenPayload`, base64url-encoded, never itself
persisted as a raw field — only its encoded form lives inside the session's `token`
field):

| Field | JS type | Required | Notes | Future representation |
|---|---|---|---|---|
| `tokenId` | string (uuid) | yes | | could double as a JWT `jti` claim |
| `actionId` | string | yes | | claim/payload field |
| `organizerId` | string | yes | validated against the action's real owner at check-in time — this is what prevents a forged token from bypassing ownership | claim/payload field |
| `issuedAt` | ISO string | yes | | `iat` |
| `expiresAt` | ISO string | yes | 10 minutes after `issuedAt` (`QR_TOKEN_TTL_MINUTES = 10`) | `exp` |
| `nonce` | string (8-char, sliced from a UUID) | yes | adds entropy against guessing/replay; **not cryptographic** — the mock token is explicitly documented as "NOT a cryptographically signed token" | replace with a real signature (HMAC/JWT) in the backend |

**Confirmed**: no participant/user identity, password, or session data is ever encoded
in the token payload. The scanning volunteer's `userId` is supplied separately, out of
band, at check-in time.

**QR session** (`onehelp.attendance.qrSession`, one live row per action):

| Field | JS type | Required | Future representation |
|---|---|---|---|
| `actionId` | string | yes | key |
| `organizerId` | string | yes | — |
| `tokenId` | string | yes | — |
| `token` | string (base64url) | yes | — |
| `issuedAt` | ISO string | set, **not validated** by `isValidSession` | — |
| `expiresAt` | ISO string | yes | — |

**Backend note**: this "table" is a poor long-term fit for a relational row — its whole
purpose is a single, short-TTL, always-superseded value per action. A cache (Redis) or
a purely stateless signed token (no server-side storage at all) is the more natural
backend equivalent; see `risks-and-open-decisions.md`.

## Action Report

| Field | JS type | Required | Source | Validation | Persisted | Public? | Sensitive? | Future representation |
|---|---|---|---|---|---|---|---|---|
| `id` | string (uuid) | yes | `crypto.randomUUID()` | — | yes | no | no | UUID PK |
| `actionId` | string | yes | — | must resolve to an existing action | yes | no | no | FK → `actions.id` |
| `reporterUserId` | string | yes | current authenticated user | must not equal the action's `organizerId` (own-action reporting is blocked) | yes | no | no (admin-visible only) | FK → `users.id` |
| `reason` | string enum | yes | form | one of `REPORT_REASON` | yes | no | no | `varchar`/enum |
| `description` | string \| null | optional | form | — | yes | no | no | `text` nullable |
| `status` | string enum | yes | — | one of `REPORT_STATUS`; transitions are fully bidirectional (nothing terminal) except `resolved`/`dismissed` can only route back through `investigating` | yes | no | no | `varchar`/enum |
| `createdAt` | ISO string | yes | — | — | yes | no | no | `timestamp` |
| `resolvedAt` | ISO string \| null | optional | set only when transitioning into `resolved`/`dismissed` | — | yes | no | no | `timestamp` nullable |
| `resolvedBy` | string \| null | optional | same | FK → admin user id | yes | no | no | FK nullable |
| `resolutionNote` | string \| null | optional | same | **not cleared** when a resolved/dismissed report is reopened to `investigating` — old note is retained even though the report is no longer resolved | yes | no | no | `text` nullable; consider whether stale-note retention is intended |

## Action Moderation

| Field | JS type | Required | Source | Validation | Persisted | Public? | Sensitive? | Future representation |
|---|---|---|---|---|---|---|---|---|
| `actionId` | string | yes | — | — | yes | no | no | FK (or 1:1 merge into `actions` table — no case has more than one moderation record per action) |
| `status` | string enum | yes | defaults synthesized (`approved` for the 13 seed actions, `pendingReview` otherwise) when no record exists yet | one of `ACTION_MODERATION_STATUS`; `rejected` is terminal | yes | drives visibility, not shown as raw text publicly | no | `varchar`/enum |
| `reason` | string \| null | optional | set on reject | — | yes | shown to the organizer | no | `text` nullable |
| `reviewedAt` | ISO string \| null | optional | — | — | yes | no | no | `timestamp` nullable |
| `reviewedBy` | string \| null | optional | — | FK → admin user id | yes | no | no | FK nullable |

## Admin Activity Entry

| Field | JS type | Required | Source | Validation | Persisted | Public? | Sensitive? | Future representation |
|---|---|---|---|---|---|---|---|---|
| `id` | string (uuid) | yes | `crypto.randomUUID()` | — | yes | no | no | UUID PK |
| `adminUserId` | string | yes | the acting admin | — | yes | no | no | FK → `users.id` |
| `actionType` | string enum | yes | — | one of `ACTIVITY_ACTION_TYPE` (13 values) | yes | no | no | `varchar`/enum |
| `targetType` | string enum | yes | — | one of `ACTIVITY_TARGET_TYPE` (`user`/`organization`/`action`/`report`) | yes | no | no | `varchar`/enum |
| `targetId` | string | yes | — | polymorphic — interpreted per `targetType`, not a typed FK | yes | no | no | consider separate nullable FK columns per target type instead of one polymorphic id, for real referential integrity |
| `timestamp` | ISO string | yes | — | — | yes | no | no | `timestamp` |
| `metadata` | object | optional | free-form, translation-interpolation params resolved at render time (not baked in at log time) | — | yes | no | no | `jsonb` |

---

## Cross-cutting field-naming mismatches worth resolving during schema design

- **"status" is overloaded**: `Action.organizerStatus` vs. the separately-stored
  moderation `status` vs. `Organization.status` vs. `Participation.status` vs.
  `Attendance.status` vs. `Report.status` — all distinct enums, all just called
  "status" in code comments and UI copy. A future API should qualify these
  unambiguously (`lifecycleStatus`, `moderationStatus`, etc. — already partially done
  in code via `organizerStatus`, but not consistently in UI/i18n copy).
- **`Membership.status` is a value-for-value alias of `Organization.status`**
  (`MEMBERSHIP_STATUS = ORGANIZATION_STATUS`) — not an independent concept, see the
  Membership section above and `risks-and-open-decisions.md`.
- **`Action.organization` (bilingual display string) vs. the real `Organization.name`**:
  for fixture actions these agree (both resolve to the real org's display name); for
  organizer-created actions, `Action.organization.el`/`.en` are both set to a single
  plain string entered at action-creation time, not derived from `Organization.name` —
  i.e. **the same conceptual field is populated two different ways depending on
  whether the action came from the seed fixture or was created live**, and could drift
  from the organization's actual name if the organizer edits their organization profile
  later.

---

## Enums and lifecycle rules

Every constant/enum-like structure in the codebase, its defining file, its consumers,
and its valid transition graph (where one exists). "Recommended backend enum name" is a
light-touch naming suggestion, not a schema decision.

### Roles

- **Defining file**: `constants/roles.js`.
- **Values**: `VOLUNTEER: 'volunteer'`, `ORGANIZER: 'organizer'`, `MODERATOR: 'moderator'`,
  `ADMINISTRATOR: 'administrator'`. `ACTIVE_ROLES = [volunteer, organizer, administrator]`.
- **Consumers**: router guard (`authGuard.js`), every route's `meta.roles`, nav
  visibility (`constants/navigation.js`), `AccountMenu.vue`, every admin/organizer view.
- **Valid transitions**: `volunteer → organizer` only via organization-application
  approval; `organizer → volunteer` only via the central `demoteOrganizerToVolunteer`
  operation. No other role transition exists anywhere in the code.
- **Invalid transitions**: any direct role edit (there is no UI or service path that
  sets `role` except the two above and admin user-profile edit, which explicitly never
  touches `role`).
- **Permission effect**: gates entire route trees (organizer, admin) and UI affordances
  (join button hidden for non-volunteers, etc.).
- **Reserved, not active**: `moderator` — appears only in `roles.js` and one
  translation string; no route, mock user, or UI branch references it. Must not be
  exposed in any UI per `claude.md`.
- **Recommended backend enum name**: `Role` (`VOLUNTEER`, `ORGANIZER`, `MODERATOR`,
  `ADMINISTRATOR`), keep `MODERATOR` reserved-but-unused until a future explicit scope
  change.

### Account status

- **Defining file**: `features/admin/utils/accountStatus.js`.
- **Values**: `ACTIVE: 'active'`, `SUSPENDED: 'suspended'`.
- **Consumers**: `auth.service.js` (blocks login/session restore), `adminUsers.service.js`
  (`suspendUser`/`reactivateUser`), `AdminUsersView.vue`.
- **Valid transitions**: `active ↔ suspended`, both directions freely allowed (no
  transition-table helper exists for this enum, unlike moderation/report/organization —
  the only guard is "cannot suspend self").
- **Public visibility effect**: none directly (a suspended user's own past
  participations/actions/attendance remain untouched — suspension only blocks future
  login/session).
- **Permission effect**: a suspended account cannot log in or keep an existing session
  alive past the next `getCurrentSession` re-check.
- **Recommended backend enum name**: `AccountStatus`.

### Organization status

- **Defining file**: `features/admin/utils/organizationStatus.js`.
- **Values**: `PENDING: 'pending'`, `APPROVED: 'approved'`, `REJECTED: 'rejected'`,
  `SUSPENDED: 'suspended'`.
- **Consumers**: `organizations.service.js`, `actionVisibility.js`,
  `organizerActions.service.js` (publish gate), `attendance.service.js` (transitively via
  action visibility), `AdminOrganizationsView.vue`.
- **Valid transitions**: `pending → approved`, `pending → rejected`, `approved →
  suspended`, `suspended → approved`.
- **Invalid transitions**: `rejected → *` (terminal via this table — resubmission
  bypasses it entirely by writing `pending` directly, not by calling
  `canTransitionOrganization`), `pending → suspended` (must be approved first).
- **Public visibility effect**: only `approved` organizations' actions can ever be
  publicly visible (one of the three ANDed gates in `isActionPubliclyVisible`).
- **Permission effect**: `suspended` blocks all organizer mutations to actions (see
  business-rules.md); `pending`/`rejected`/no-organization blocks publishing (but not
  drafting).
- **Recommended backend enum name**: `OrganizationStatus`.

### Organization membership role / status

- **Defining file**: `features/organizerApplication/utils/organizationMembership.js`.
- **`MEMBERSHIP_ROLE`**: `{ OWNER: 'owner' }` — the only value that will ever exist,
  per explicit code comment; the permanent one-organizer-one-organization rule forbids
  adding a second value.
- **`MEMBERSHIP_STATUS`**: literally `= ORGANIZATION_STATUS` (the same object
  reference, not a separate enum).
- **Recommended backend enum name**: none — recommend eliminating this as a distinct
  enum/table in the real schema (see domain-models.md Membership section and
  risks-and-open-decisions.md).

### Organization types

- **Defining file**: `constants/organizationTypes.js`.
- **Values** (8, each `{id, labelKey}`): `ngo`, `municipality`, `healthOrganization`,
  `volunteerGroup`, `animalWelfare`, `educationalInstitution`,
  `communityAssociation`, `other`.
- **Consumers**: `OrganizationApplicationForm.vue`, `organizationValidation.js`
  (`isValidOrganizationTypeId`).
- **No transitions** (a descriptive attribute, not a lifecycle state).
- **Recommended backend enum name**: `OrganizationType`.

### Organizer action lifecycle status

- **Defining file**: `features/organizer/utils/organizerActionStatus.js`.
- **Values**: `DRAFT: 'draft'`, `PUBLISHED: 'published'`, `CLOSED: 'closed'`,
  `CANCELLED: 'cancelled'`. `PUBLIC_VISIBLE_STATUSES = [published, closed]`.
- **Consumers**: `organizerActions.service.js`, `actionVisibility.js`,
  `attendance.service.js`, `actionModeration.service.js` (admin lifecycle-change
  delegates here), every organizer/admin action view.
- **Valid transitions**: `draft → published`, `draft → cancelled`, `published →
  closed`, `published → cancelled`, `closed → published` (republish — additionally
  gated dynamically: blocked if the action's date is already in the past).
- **Invalid transitions**: `cancelled → *` (terminal), `draft → closed` (must publish
  first), `closed → cancelled` (not offered).
- **Public visibility effect**: only `published`/`closed` are ever candidates for
  public visibility (still subject to the moderation + organization-status gates).
- **Permission effect**: publishing is blocked while the owning organization is
  `suspended`, `pending`, or `rejected`/absent (`ORGANIZATION_NOT_APPROVED` /
  `ORGANIZATION_SUSPENDED` errors); drafts can still be created/edited regardless of
  organization status (except suspended, which blocks all mutation).
- **Recommended backend enum name**: `ActionLifecycleStatus` (to disambiguate from
  moderation status).

### Action moderation status

- **Defining file**: `features/admin/utils/actionModerationStatus.js`.
- **Values**: `PENDING_REVIEW: 'pendingReview'`, `APPROVED: 'approved'`,
  `REJECTED: 'rejected'`, `HIDDEN: 'hidden'`.
- **Consumers**: `actionModeration.service.js`, `actionVisibility.js`,
  `AdminActionsView.vue`, `AdminReportsView.vue` (`handleHideAction`).
- **Valid transitions**: `pendingReview → approved`, `pendingReview → rejected`,
  `approved → hidden`, `hidden → approved`.
- **Invalid transitions**: `rejected → *` (terminal), `pendingReview → hidden` (must be
  approved first), `hidden → rejected`/`pendingReview` (not offered).
- **Default when absent**: `approved` for the 13 original seed actions, `pendingReview`
  for anything created afterward (synthesized by `getModerationRecord`, not stored until
  the first admin decision).
- **Public visibility effect**: one of the three ANDed gates in
  `isActionPubliclyVisible` — only `approved` passes.
- **Recommended backend enum name**: `ActionModerationStatus`.

### Participation status

- **Defining file**: `features/participation/utils/participationStatus.js`.
- **Values**: `CONFIRMED: 'confirmed'`, `CANCELLED: 'cancelled'`. Exactly two, no others
  exist anywhere in the codebase.
- **Consumers**: `participation.service.js`/`.store.js`, `participationCount.js`,
  `attendance.service.js` (confirmed-participant gate), `MyActionsView.vue`,
  `OrganizerParticipantsView.vue`.
- **Valid transitions**: `confirmed → cancelled` only. There is no `cancelled →
  confirmed` transition — rejoining creates a brand-new record rather than reactivating
  the old one, preserving join/cancel history per action per user.
- **Recommended backend enum name**: `ParticipationStatus`.

### Attendance status / check-in method

- **Defining file**: `features/attendance/utils/attendanceStatus.js`.
- **`ATTENDANCE_STATUS`**: `NOT_CHECKED_IN: 'notCheckedIn'` (never persisted — implied
  by record absence), `CHECKED_IN: 'checkedIn'`, `CHECKED_OUT: 'checkedOut'`.
- **`CHECK_IN_METHOD`**: `QR: 'qr'`, `MANUAL: 'manual'`.
- **Consumers**: `attendance.service.js`/`.store.js`, `OrganizerParticipantsView.vue`,
  `MyActionCard.vue`, `CheckInView.vue`.
- **Valid transitions**: `checkedIn → checkedOut` only, terminal (no re-check-in path
  exists in the mock).
- **Recommended backend enum name**: `AttendanceStatus`, `CheckInMethod`.

### QR token / error states

- **Defining file**: `features/attendance/utils/qrToken.js` (payload/expiry),
  `features/attendance/utils/attendanceErrors.js` (error codes surfaced to the UI).
- **States** (not a stored enum field, but a set of outcomes `decodeQrToken`/
  `isTokenExpired`/the service can produce): valid-and-fresh, malformed (`decodeQrToken`
  returns `null` → `INVALID_TOKEN`), expired (`isTokenExpired` → `EXPIRED_TOKEN`),
  ownership-mismatch (`organizerId` in the payload doesn't match the action's real
  owner → treated identically to a malformed token, `INVALID_TOKEN`).
- **TTL**: 10 minutes (`QR_TOKEN_TTL_MINUTES`).
- **Recommended backend enum name**: not a stored enum — these become HTTP error
  responses/exception types in a real API (see `attendanceErrorKey` mapping in
  service-contracts.md).

### Action urgency

- **Defining file**: inline in `organizerActions.service.js`
  (`URGENCY_LEVELS = ['normal', 'high', 'urgent']`) — **not** a dedicated
  `utils/*.js` enum file, unlike every other enum in the codebase.
- **Consumers**: `OrganizerActionForm.vue`, `ActionCard.vue` (`isEmphasized` visual
  treatment for `urgent`).
- **No transitions** (a free-form attribute set at create/edit time, not a lifecycle
  state).
- **Recommended backend enum name**: `ActionUrgency` — recommend giving it the same
  dedicated-file treatment as the other enums for consistency.

### Action category ids

- **Defining file**: `constants/actionCategories.js`.
- **Values** (5): `emergency`, `health`, `environment`, `social`, `animals` — each with
  `labelKey`, `descriptionKey`, `icon`, `accent` (a *theme color token*, not a category-
  specific color — see risks-and-open-decisions.md for the resulting color-collision
  with urgency badges, a UI concern noted here because it stems directly from this
  enum's structure).
- **Consumers**: `actionCategories.js` helpers (`getActionCategory`,
  `isValidCategoryId`), organization-application categories field, action
  create/edit form, actions list filter.
- **No lifecycle transitions** (a classification, not a status).
- **Recommended backend enum name**: `ActionCategory`.

### Report reasons / report status

- **Defining file**: `features/admin/utils/reportStatus.js`.
- **`REPORT_REASON`**: `INCORRECT_INFORMATION`, `UNSAFE_OR_INAPPROPRIATE`,
  `SUSPICIOUS_ORGANIZATION`, `ACTION_NO_LONGER_EXISTS`, `OTHER`.
- **`REPORT_STATUS`**: `OPEN: 'open'`, `INVESTIGATING: 'investigating'`,
  `RESOLVED: 'resolved'`, `DISMISSED: 'dismissed'`.
- **Consumers**: `reports.service.js`, `ReportActionCard.vue`, `AdminReportsView.vue`.
- **Valid transitions**: `open → investigating/resolved/dismissed`, `investigating →
  resolved/dismissed/open`, `resolved → investigating`, `dismissed → investigating`.
  Nothing is terminal — explicit design comment: "unlike organizer/organization
  moderation, report handling is expected to be revisited."
- **Invalid transitions**: `resolved → dismissed` or `dismissed → resolved` directly
  (must route back through `investigating` first); `resolved`/`dismissed → open`
  directly (same restriction).
- **Recommended backend enum name**: `ReportReason`, `ReportStatus`.

### Admin activity action types / target types

- **Defining file**: `features/admin/utils/activityLogTypes.js`.
- **`ACTIVITY_ACTION_TYPE`** (13 values): `USER_SUSPENDED`, `USER_REACTIVATED`,
  `ORGANIZATION_APPROVED`, `ORGANIZATION_REJECTED`, `ORGANIZATION_SUSPENDED`,
  `ORGANIZATION_RESTORED`, `ACTION_APPROVED`, `ACTION_REJECTED`, `ACTION_HIDDEN`,
  `ACTION_RESTORED`, `REPORT_STATUS_CHANGED`, `ORGANIZER_DEMOTED`,
  `ACTION_LIFECYCLE_CHANGED`.
- **`ACTIVITY_TARGET_TYPE`**: `USER`, `ORGANIZATION`, `ACTION`, `REPORT`.
- **Consumers**: every admin service that calls `logActivity` directly (see
  frontend-mock-inventory.md's "scattered activity logging" finding),
  `AdminActivityView.vue`, `activityDescribe.js`.
- **Note**: `ORGANIZER_DEMOTED` targets `USER` (the demoted user's id), not a dedicated
  "organizer" target type — there is no organization-target-type activity entry for a
  demotion, only a user-target-type one.
- **No transitions** (an append-only log, not a stateful entity).
- **Recommended backend enum name**: `AdminActivityActionType`, `AdminActivityTargetType`.

### Locales

- **Defining file**: `constants/locales.js`.
- **Values**: `SUPPORTED_LOCALES = ['el', 'en']`, `DEFAULT_LOCALE = 'el'`.
- **Frontend-only** — not part of any backend domain model beyond possibly
  `localePreference` on `User` (already listed above).

---

## Permanent structural rule (repeated here deliberately, it governs several models above)

One organizer owns exactly one organization; one organization has exactly one
organizer; there is no manager role; there is no multi-organizer/team concept. Every
model and enum above (`Organization.organizerUserId`, `Membership`,
`MEMBERSHIP_ROLE.OWNER`) already reflects this rule at the code level, and it must
carry through unchanged into the backend schema (a unique constraint, not a join
table). See `claude.md`'s "Permanent organization ownership rule" section.
