# Database Schema

Complete MySQL 8.x (InnoDB) schema realizing `domain-model-and-state-machines.md` — see
ADR-17 for why MySQL replaced the originally-drafted PostgreSQL design. All primary
keys are `CHAR(36)` columns holding an application-generated Java `UUID`
(`UUID.randomUUID()`, generated in the entity/service layer before insert — see
§ UUID strategy below) — no strong reason to deviate for any table. All tables have
`created_at`/`updated_at DATETIME(6)` (UTC instants, never the session/server time
zone — see § Time, dates, and timezone policy below) and a `version BIGINT`
optimistic-locking column unless noted otherwise. Every table uses
`ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci` (accent-insensitive
and case-insensitive — see § Character set and collation below). No table in this
schema is soft-deleted **except** where explicitly noted (`organizations`/`actions`
are never deleted by anything other than the demotion cascade, and that cascade
performs a real hard delete — there is no "soft delete" concept anywhere in this
design, matching the mock's own tombstone-only mechanism collapsing into real deletes
once a real database exists).

---

## UUID strategy

MySQL 8 has no native `UUID` column type and no `gen_random_uuid()` function. The
application generates a Java `UUID` (`UUID.randomUUID()`, random v4) before every
insert and stores it as **`CHAR(36)`** (the canonical `8-4-4-4-12` hyphenated textual
form, e.g. `3fa85f64-5717-4562-b3fc-2c963f66afa6`), consistently across every table —
never `BINARY(16)`, and never mixed within the same schema. `CHAR(36)` was chosen over
the more storage-efficient `BINARY(16)` because this project explicitly favors
learning-friendliness and debuggability (values are human-readable directly in the
database, in logs, and in ad hoc queries, with no custom Hibernate `UserType`/JDBC
conversion layer to maintain) over the modest storage/index-size saving `BINARY(16)`
would provide at this data scale. The JPA mapping strategy (implemented in the
`common.persistence` package) maps `java.util.UUID` fields directly to `CHAR(36)`
columns.

## Character set and collation

Every table is created with `DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`.
`utf8mb4` is required for full Unicode support (Greek, emoji, all BMP/astral
characters); `utf8mb4_0900_ai_ci` is MySQL 8's accent-insensitive (`_ai_`),
case-insensitive (`_ci_`) collation, built on the Unicode 9.0 collation algorithm —
it correctly treats Greek letters with tonos/diacritics (e.g. `ά`/`α`, `έ`/`ε`) as
equal to their unaccented form for comparison and `LIKE` matching, and is
simultaneously case-insensitive for both Greek and English text, replacing
PostgreSQL's `unaccent` extension + `lower()` functional-index combination with a
single column-level (and therefore index-level) property. This is why `users.email`
below has a plain `UNIQUE` index rather than a `lower(email)` expression index: the
collation already makes the comparison case-insensitive.

## Enum types

MySQL 8 has no `CREATE TYPE ... AS ENUM` construct (PostgreSQL-only). Every enum in
this schema is represented as a plain `VARCHAR` column plus a `CHECK` constraint
listing the valid literals (enforced by MySQL 8.0.16+, which this schema requires —
see `system-architecture.md`). The Java side maps each column with
`@Enumerated(EnumType.STRING)` against a plain Java `enum`. No MySQL native
column-level `ENUM(...)` type is used, to avoid a second, harder-to-evolve
enum-definition mechanism living only in the database.

The `user_role` column supports **exactly** `'VOLUNTEER'`, `'ORGANIZER'`,
`'ADMINISTRATOR'` — there is no `MODERATOR` value, now or in any future migration (see
ADR-18). Every other enum below is unaffected by the MySQL migration except for its
representation (`VARCHAR` + `CHECK` instead of `CREATE TYPE ... AS ENUM`):

```sql
-- users.role            CHECK (role IN ('VOLUNTEER','ORGANIZER','ADMINISTRATOR'))
-- users.status          CHECK (status IN ('ACTIVE','SUSPENDED'))
-- organizations.status  CHECK (status IN ('PENDING','APPROVED','REJECTED','SUSPENDED'))
-- organizations.organization_type
--   CHECK (organization_type IN ('NGO','MUNICIPALITY','HEALTH_ORGANIZATION',
--     'VOLUNTEER_GROUP','ANIMAL_WELFARE','EDUCATIONAL_INSTITUTION',
--     'COMMUNITY_ASSOCIATION','OTHER'))
-- actions.category           CHECK (category IN ('EMERGENCY','HEALTH','ENVIRONMENT','SOCIAL','ANIMALS'))
-- actions.lifecycle_status   CHECK (lifecycle_status IN ('DRAFT','PUBLISHED','CLOSED','CANCELLED'))
-- action_moderation.status   CHECK (status IN ('PENDING_REVIEW','APPROVED','REJECTED','HIDDEN'))
-- actions.urgency             CHECK (urgency IN ('NORMAL','HIGH','URGENT'))
-- participations.status      CHECK (status IN ('CONFIRMED','CANCELLED'))
-- attendance.status          CHECK (status IN ('CHECKED_IN','CHECKED_OUT'))
-- attendance.check_in_method CHECK (check_in_method IN ('QR','MANUAL'))
-- action_reports.reason
--   CHECK (reason IN ('INCORRECT_INFORMATION','UNSAFE_OR_INAPPROPRIATE',
--     'SUSPICIOUS_ORGANIZATION','ACTION_NO_LONGER_EXISTS','OTHER'))
-- action_reports.status      CHECK (status IN ('OPEN','INVESTIGATING','RESOLVED','DISMISSED'))
-- admin_activity_log.action_type
--   CHECK (action_type IN ('USER_SUSPENDED','USER_REACTIVATED','USER_PROFILE_UPDATED',
--     'ORGANIZATION_APPROVED','ORGANIZATION_REJECTED','ORGANIZATION_SUSPENDED',
--     'ORGANIZATION_RESTORED','ACTION_CREATED','ACTION_UPDATED','ACTION_APPROVED',
--     'ACTION_REJECTED','ACTION_HIDDEN','ACTION_RESTORED','ACTION_LIFECYCLE_CHANGED',
--     'REPORT_STATUS_CHANGED','ORGANIZER_DEMOTED','ATTENDANCE_MANUAL_RECORDED'))
-- admin_activity_log.target_type
--   CHECK (target_type IN ('USER','ORGANIZATION','ACTION','REPORT','ATTENDANCE'))
```

This phase's Flyway migration (`V1__foundation_and_auth_schema.sql`) only creates
`users` and `refresh_tokens`; every other table above is documented here for
migration-planning continuity but is created by its own domain's future Flyway
migration, not by this phase.

---

## `users`

| Column | Type | Nullability | Default | Notes |
|---|---|---|---|---|
| `id` | `CHAR(36)` | NOT NULL | app-generated `UUID.randomUUID()` | PK |
| `first_name` | `VARCHAR(100)` | NOT NULL | — | |
| `last_name` | `VARCHAR(100)` | NOT NULL | — | |
| `email` | `VARCHAR(255)` | NOT NULL | — | see unique index below |
| `password_hash` | `VARCHAR(255)` | NOT NULL | — | bcrypt, never selected into any DTO |
| `role` | `VARCHAR(20)` | NOT NULL | `'VOLUNTEER'` | `CHECK (role IN ('VOLUNTEER','ORGANIZER','ADMINISTRATOR'))` — see ADR-14, ADR-18 |
| `status` | `VARCHAR(20)` | NOT NULL | `'ACTIVE'` | `CHECK (status IN ('ACTIVE','SUSPENDED'))` |
| `avatar_initials` | `VARCHAR(4)` | NULL | — | derivable; stored for convenience, not authoritative |
| `locale_preference` | `VARCHAR(5)` | NOT NULL | `'el'` | `CHECK (locale_preference IN ('el','en'))` |
| `created_at` | `DATETIME(6)` | NOT NULL | `UTC_TIMESTAMP(6)` | |
| `updated_at` | `DATETIME(6)` | NOT NULL | `UTC_TIMESTAMP(6)` | |
| `version` | `BIGINT` | NOT NULL | `0` | optimistic locking |

- **PK**: `id`.
- **Unique**: `UNIQUE INDEX ux_users_email ON users (email)` — case-insensitive
  uniqueness comes from the table's `utf8mb4_0900_ai_ci` collation (ADR-15, ADR-17), so
  no `lower(email)` expression index is needed as it was under PostgreSQL.
- **Indexes**: `INDEX ix_users_role ON users (role)`; `INDEX ix_users_status ON users (status)`.
- **Deletion strategy**: no delete endpoint exists anywhere in the design; users are
  only ever suspended (`status`), never removed. FKs from other tables to `users.id`
  therefore never need to handle a user-row deletion in practice, but are still given
  a deliberate `ON DELETE` policy per table below as defensive design.

---

## `refresh_tokens`

| Column | Type | Nullability | Default | Notes |
|---|---|---|---|---|
| `id` | `CHAR(36)` | NOT NULL | app-generated `UUID.randomUUID()` | PK |
| `user_id` | `CHAR(36)` | NOT NULL | — | FK → `users.id` |
| `token_hash` | `VARCHAR(255)` | NOT NULL | — | SHA-256 hex of the opaque refresh token; the raw token is never stored |
| `issued_at` | `DATETIME(6)` | NOT NULL | `UTC_TIMESTAMP(6)` | |
| `expires_at` | `DATETIME(6)` | NOT NULL | — | `issued_at + 30 days` |
| `revoked_at` | `DATETIME(6)` | NULL | — | set on logout, rotation, suspension, demotion, or reuse-detected |
| `replaced_by_token_id` | `CHAR(36)` | NULL | — | FK → `refresh_tokens.id`, self-referential rotation chain |
| `user_agent` | `VARCHAR(255)` | NULL | — | optional device metadata |

- **PK**: `id`.
- **FK**: `user_id → users.id ON DELETE CASCADE`; `replaced_by_token_id → refresh_tokens.id ON DELETE SET NULL`.
- **Unique**: `UNIQUE (token_hash)`.
- **Indexes**: `INDEX ix_refresh_tokens_user_id ON refresh_tokens (user_id)`;
  `INDEX ix_refresh_tokens_expires_at ON refresh_tokens (expires_at)` (for a periodic
  cleanup job removing long-expired rows — an operational nicety, not required for
  correctness).
- No `version` column — this table is append/rotate-only, never concurrently edited
  field-by-field.

---

## `organizations`

| Column | Type | Nullability | Default | Notes |
|---|---|---|---|---|
| `id` | `CHAR(36)` | NOT NULL | app-generated `UUID.randomUUID()` | PK |
| `organizer_user_id` | `CHAR(36)` | NOT NULL | — | FK → `users.id`; see unique constraint (ADR-4) |
| `name_el` | `VARCHAR(120)` | NOT NULL | — | `CHECK (char_length(name_el) BETWEEN 2 AND 120)` |
| `name_en` | `VARCHAR(120)` | NOT NULL | — | same range check |
| `description_el` | `TEXT` | NOT NULL | — | `CHECK (char_length(description_el) BETWEEN 20 AND 2000)` |
| `description_en` | `TEXT` | NOT NULL | — | same range check |
| `organization_type` | `VARCHAR(30)` | NOT NULL | — | `CHECK (organization_type IN (...))` — see § Enum types |
| `contact_email` | `VARCHAR(255)` | NOT NULL | — | |
| `phone` | `VARCHAR(50)` | NULL | — | |
| `website` | `VARCHAR(255)` | NULL | — | |
| `address` | `VARCHAR(255)` | NOT NULL | — | |
| `municipality` | `VARCHAR(120)` | NOT NULL | — | |
| `supporting_message` | `TEXT` | NOT NULL | — | `CHECK (char_length(supporting_message) BETWEEN 20 AND 2000)` |
| `status` | `VARCHAR(20)` | NOT NULL | `'PENDING'` | `CHECK (status IN (...))` — see § Enum types |
| `submitted_at` | `DATETIME(6)` | NOT NULL | `UTC_TIMESTAMP(6)` | reset on resubmission |
| `reviewed_at` | `DATETIME(6)` | NULL | — | |
| `reviewed_by` | `CHAR(36)` | NULL | — | FK → `users.id` |
| `rejection_reason` | `TEXT` | NULL | — | see `CHECK` below |
| `previous_rejection_reason` | `TEXT` | NULL | — | set only on resubmission |
| `created_at`/`updated_at`/`version` | — | — | — | standard |

`categories` (PostgreSQL `action_category[]` in the original design) is **removed from
this table** and replaced by a normalized join table:

```sql
CREATE TABLE organization_categories (
  organization_id CHAR(36) NOT NULL,
  category        VARCHAR(20) NOT NULL,
  PRIMARY KEY (organization_id, category),
  CONSTRAINT chk_organization_categories_category
    CHECK (category IN ('EMERGENCY','HEALTH','ENVIRONMENT','SOCIAL','ANIMALS')),
  CONSTRAINT fk_organization_categories_organization
    FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

A join table (rather than a MySQL `JSON` array) was chosen because organization
categories are directly used to **filter** the organization/action list endpoints
(per `rest-api-design.md`), and a join table lets that filter use a normal indexed
`WHERE category = ?` / `JOIN` instead of a `JSON_CONTAINS` scan — this is the
"normalize when the field is used for filtering/indexing/constraints" rule from
ADR-17. "At least one category" (the old `array_length(categories, 1) > 0` `CHECK`)
becomes an application/service-layer invariant enforced on write, since MySQL cannot
express "at least one child row exists" as a table-level `CHECK` on the parent.

- **PK**: `id`.
- **FK**: `organizer_user_id → users.id ON DELETE RESTRICT` (defensive — users are
  never deleted in practice, but this prevents an accidental orphan if that ever
  changed); `reviewed_by → users.id ON DELETE SET NULL`.
- **Unique**: `UNIQUE (organizer_user_id)` — the entire enforcement mechanism for the
  permanent 1:1 rule (ADR-4, ADR-15).
- **Check**: `CHECK (status <> 'REJECTED' OR rejection_reason IS NOT NULL)`.
- **Indexes**: `INDEX ix_organizations_status ON organizations (status)`.

**Implementation note (Organizations & Organizer Applications phase)**: implemented
essentially verbatim as `V2__organizations_schema.sql` — the `organizations` and
`organization_categories` tables above match this design exactly, including the
join-table normalization of categories. No `V1` change was needed. `Organization.
organizerUserId`/`.reviewedBy` are mapped as raw `UUID` columns on the JPA entity, not
`@ManyToOne` relationships — a Hibernate-level implementation choice, not a schema
deviation (the FK constraints themselves are exactly as specified).

---

## `actions`

| Column | Type | Nullability | Default | Notes |
|---|---|---|---|---|
| `id` | `CHAR(36)` | NOT NULL | app-generated `UUID.randomUUID()` | PK |
| `organization_id` | `CHAR(36)` | NOT NULL | — | FK → `organizations.id` |
| `category` | `VARCHAR(20)` | NOT NULL | — | `CHECK (category IN (...))` — see § Enum types |
| `title_el` / `title_en` | `VARCHAR(200)` | NOT NULL | — | |
| `description_el` / `description_en` | `TEXT` | NOT NULL | — | |
| `location_name_el` / `location_name_en` | `VARCHAR(200)` | NOT NULL | — | |
| `municipality_el` / `municipality_en` | `VARCHAR(120)` | NOT NULL | — | |
| `latitude` | `DOUBLE` | NULL | — | `CHECK (latitude BETWEEN -90 AND 90)` |
| `longitude` | `DOUBLE` | NULL | — | `CHECK (longitude BETWEEN -180 AND 180)` |
| `start_at` | `DATETIME(6)` | NOT NULL | — | see Time/Timezone Policy below |
| `end_at` | `DATETIME(6)` | NULL | — | |
| `timezone` | `VARCHAR(50)` | NOT NULL | `'Europe/Athens'` | IANA tz name |
| `capacity` | `INT` | NOT NULL | — | `CHECK (capacity > 0)` |
| `urgency` | `VARCHAR(10)` | NOT NULL | `'NORMAL'` | `CHECK (urgency IN ('NORMAL','HIGH','URGENT'))` |
| `required_equipment_el` | `JSON` | NOT NULL | `(JSON_ARRAY())` | |
| `required_equipment_en` | `JSON` | NOT NULL | `(JSON_ARRAY())` | |
| `lifecycle_status` | `VARCHAR(20)` | NOT NULL | `'DRAFT'` | `CHECK (lifecycle_status IN (...))` — see § Enum types |
| `created_at`/`updated_at`/`version` | — | — | — | standard |

`required_equipment_el`/`_en` (PostgreSQL `TEXT[]` in the original design) become
plain MySQL **`JSON`** columns storing a JSON array of strings, rather than a
normalized child table — unlike `organization_categories` above, this list is never
filtered, indexed, or joined against anywhere in `rest-api-design.md`; it is only ever
read and displayed whole as part of a single action's detail view, so a normalized
table would add a join with no query benefit (the "normalize only when actually
queried/filtered/constrained" half of ADR-17's JSON-vs-relational rule).

- **PK**: `id`.
- **FK**: `organization_id → organizations.id ON DELETE CASCADE` — this cascade is
  intentional and is what the organizer-demotion transaction relies on when it deletes
  the `organizations` row (see `transactions-and-integrity.md`); no ad hoc "delete
  organization" endpoint exists anywhere else, so this cascade only ever fires from
  that one deliberate, transactional operation.
- **Check**: `CHECK ((latitude IS NULL) = (longitude IS NULL))`.
- **No `registered_count` column** — computed at read time (ADR-5).
- **Indexes**: `INDEX ix_actions_organization_id ON actions (organization_id)`;
  `INDEX ix_actions_lifecycle_status ON actions (lifecycle_status)`;
  `INDEX ix_actions_category ON actions (category)`;
  `INDEX ix_actions_start_at ON actions (start_at)`.
  MySQL 8 has no partial/filtered index, so the PostgreSQL
  `INDEX ix_actions_public_candidate ON actions (lifecycle_status) WHERE
  lifecycle_status IN ('PUBLISHED','CLOSED')` optimization is dropped; the plain
  `ix_actions_lifecycle_status` index above already lets MySQL use an index range scan
  for `lifecycle_status IN ('PUBLISHED','CLOSED')` when the `v_public_actions` view
  (below) is queried — a full covering partial index was a PostgreSQL-specific
  micro-optimization, not a correctness requirement.

---

## `action_moderation`

1:1 child of `actions` — see ADR-7.

| Column | Type | Nullability | Default | Notes |
|---|---|---|---|---|
| `action_id` | `CHAR(36)` | NOT NULL | — | PK, FK → `actions.id` |
| `status` | `VARCHAR(20)` | NOT NULL | `'PENDING_REVIEW'` | `CHECK (status IN (...))` — see § Enum types; seed data overrides to `APPROVED` explicitly at insert time |
| `reason` | `TEXT` | NULL | — | see `CHECK` below |
| `reviewed_at` | `DATETIME(6)` | NULL | — | |
| `reviewed_by` | `CHAR(36)` | NULL | — | FK → `users.id` |
| `updated_at` | `DATETIME(6)` | NOT NULL | `UTC_TIMESTAMP(6)` | |

- **PK/FK**: `action_id` is both, `ON DELETE CASCADE` (deleted alongside its action).
- **FK**: `reviewed_by → users.id ON DELETE SET NULL`.
- **Check**: `CHECK (status <> 'REJECTED' OR reason IS NOT NULL)`.
- **Indexes**: `INDEX ix_action_moderation_status ON action_moderation (status)`.

## `action_moderation_history`

Append-only audit trail, per ADR-7.

| Column | Type | Nullability | Default | Notes |
|---|---|---|---|---|
| `id` | `CHAR(36)` | NOT NULL | app-generated `UUID.randomUUID()` | PK |
| `action_id` | `CHAR(36)` | NOT NULL | — | FK → `actions.id` |
| `from_status` | `VARCHAR(20)` | NOT NULL | — | `CHECK (from_status IN (...))` |
| `to_status` | `VARCHAR(20)` | NOT NULL | — | `CHECK (to_status IN (...))` |
| `reason` | `TEXT` | NULL | — | |
| `changed_by` | `CHAR(36)` | NOT NULL | — | FK → `users.id` |
| `changed_at` | `DATETIME(6)` | NOT NULL | `UTC_TIMESTAMP(6)` | |

- **FK**: `action_id → actions.id ON DELETE CASCADE`; `changed_by → users.id ON DELETE
  RESTRICT` (an admin's identity in an audit row is never silently orphaned).
- **Indexes**: `INDEX ix_action_moderation_history_action_id ON action_moderation_history (action_id)`.

---

## `participations`

| Column | Type | Nullability | Default | Notes |
|---|---|---|---|---|
| `id` | `CHAR(36)` | NOT NULL | app-generated `UUID.randomUUID()` | PK |
| `user_id` | `CHAR(36)` | NOT NULL | — | FK → `users.id` |
| `action_id` | `CHAR(36)` | NOT NULL | — | FK → `actions.id` |
| `status` | `VARCHAR(20)` | NOT NULL | `'CONFIRMED'` | `CHECK (status IN ('CONFIRMED','CANCELLED'))` |
| `joined_at` | `DATETIME(6)` | NOT NULL | `UTC_TIMESTAMP(6)` | |
| `cancelled_at` | `DATETIME(6)` | NULL | — | see `CHECK` below |
| `active_confirmation_key` | `CHAR(73)` | **GENERATED ALWAYS AS** `(CASE WHEN status = 'CONFIRMED' THEN CONCAT(user_id, ':', action_id) ELSE NULL END) STORED` | — | MySQL-compatible replacement for PostgreSQL's partial unique index — see note below |
| `created_at`/`updated_at`/`version` | — | — | — | standard |

- **PK**: `id`.
- **FK**: `user_id → users.id ON DELETE CASCADE`; `action_id → actions.id ON DELETE CASCADE`.
- **Check**: `CHECK (status <> 'CANCELLED' OR cancelled_at IS NOT NULL)` — closes the
  mock's own validation gap (`docs/backend-discovery/domain-models.md` § Participation).

**MySQL replacement for the PostgreSQL partial unique index (ADR-15, ADR-17)**: the
rule "only one `CONFIRMED` participation may exist per user and action, while
cancelled history remains allowed" was originally enforced by
`UNIQUE INDEX ux_participations_confirmed ON participations (user_id, action_id)
WHERE status = 'CONFIRMED'`, a partial index — MySQL 8 has no partial/filtered
index. The MySQL-safe, database-enforced equivalent is a **generated (computed)
column plus a regular unique index**:

```sql
ALTER TABLE participations
  ADD COLUMN active_confirmation_key CHAR(73)
    GENERATED ALWAYS AS (
      CASE WHEN status = 'CONFIRMED' THEN CONCAT(user_id, ':', action_id) ELSE NULL END
    ) STORED,
  ADD UNIQUE INDEX ux_participations_active_confirmation (active_confirmation_key);
```

`active_confirmation_key` is `NULL` for every `CANCELLED` row, and MySQL's `UNIQUE`
index (like every SQL unique index, including PostgreSQL's) treats multiple `NULL`
values as **not** duplicates — so any number of historical `CANCELLED` rows for the
same `(user_id, action_id)` pair are allowed, while at most one row can ever hold a
given `CONFIRMED` `(user_id, action_id)` pair, because a second insert/update
producing the same non-null generated value collides on the unique index. Because the
constraint lives on the generated column itself, it is enforced by InnoDB at the
storage-engine level under row-level locking — safe under concurrent
`POST /api/v1/actions/{id}/participations` requests for the same user+action, not just
a service-level pre-check (a service-level pre-check is still used for a clean
`participation.alreadyJoined` error message, per `error-contract.md`, but the database
constraint is the actual guarantee against a race between two concurrent requests).
- **Indexes**: `INDEX ix_participations_action_id ON participations (action_id)`
  (doubles as the basis for the live `registeredCount` computation, ADR-5);
  `INDEX ix_participations_user_id ON participations (user_id)`.

---

## `attendance`

| Column | Type | Nullability | Default | Notes |
|---|---|---|---|---|
| `id` | `CHAR(36)` | NOT NULL | app-generated `UUID.randomUUID()` | PK |
| `participation_id` | `CHAR(36)` | NOT NULL | — | FK → `participations.id`, `UNIQUE` |
| `action_id` | `CHAR(36)` | NOT NULL | — | FK → `actions.id`; denormalized from `participation_id` for query convenience (never independently updated) |
| `user_id` | `CHAR(36)` | NOT NULL | — | FK → `users.id`; denormalized, same rationale |
| `status` | `VARCHAR(20)` | NOT NULL | `'CHECKED_IN'` | `CHECK (status IN ('CHECKED_IN','CHECKED_OUT'))` |
| `checked_in_at` | `DATETIME(6)` | NOT NULL | `UTC_TIMESTAMP(6)` | |
| `checked_out_at` | `DATETIME(6)` | NULL | — | see `CHECK` below |
| `check_in_method` | `VARCHAR(10)` | NOT NULL | — | `CHECK (check_in_method IN ('QR','MANUAL'))` |
| `recorded_by_organizer_id` | `CHAR(36)` | NULL | — | FK → `users.id`; see `CHECK` below |
| `created_at`/`updated_at`/`version` | — | — | — | standard |

- **PK**: `id`.
- **FK**: `participation_id → participations.id ON DELETE CASCADE`, `UNIQUE`
  (one attendance row per participation, ever — ADR-15); `action_id → actions.id ON
  DELETE CASCADE`; `user_id → users.id ON DELETE CASCADE`; `recorded_by_organizer_id →
  users.id ON DELETE SET NULL`.
- **Check**: `CHECK ((check_in_method = 'MANUAL') = (recorded_by_organizer_id IS NOT
  NULL))`; `CHECK (status <> 'CHECKED_OUT' OR checked_out_at IS NOT NULL)`.
- **Indexes**: `INDEX ix_attendance_action_id ON attendance (action_id)`.

---

## `qr_check_in_tokens`

Server-side "current token pointer," per ADR-6 — not the JWT itself, and not a history
table (always overwritten).

| Column | Type | Nullability | Default | Notes |
|---|---|---|---|---|
| `action_id` | `CHAR(36)` | NOT NULL | — | PK, FK → `actions.id` |
| `token_id` | `CHAR(36)` | NOT NULL | — | matches the JWT's `jti` claim |
| `issued_at` | `DATETIME(6)` | NOT NULL | `UTC_TIMESTAMP(6)` | |
| `expires_at` | `DATETIME(6)` | NOT NULL | — | `issued_at + 10 minutes` |
| `issued_by_organizer_id` | `CHAR(36)` | NOT NULL | — | FK → `users.id` |

- **PK/FK**: `action_id`, `ON DELETE CASCADE`.
- **FK**: `issued_by_organizer_id → users.id ON DELETE RESTRICT`.
- No `version`/history — an upsert always replaces the row on regenerate, matching the
  mock's `upsertQrSession` exactly. MySQL has no `INSERT ... ON CONFLICT ... DO
  UPDATE` (PostgreSQL syntax); the equivalent is
  `INSERT INTO qr_check_in_tokens (...) VALUES (...) ON DUPLICATE KEY UPDATE
  token_id = VALUES(token_id), issued_at = VALUES(issued_at), expires_at =
  VALUES(expires_at), issued_by_organizer_id = VALUES(issued_by_organizer_id)`,
  relying on `action_id`'s primary key for the "duplicate key" match.

---

## `action_reports`

| Column | Type | Nullability | Default | Notes |
|---|---|---|---|---|
| `id` | `CHAR(36)` | NOT NULL | app-generated `UUID.randomUUID()` | PK |
| `action_id` | `CHAR(36)` | NOT NULL | — | FK → `actions.id` |
| `reporter_user_id` | `CHAR(36)` | NOT NULL | — | FK → `users.id` |
| `reason` | `VARCHAR(30)` | NOT NULL | — | `CHECK (reason IN (...))` — see § Enum types |
| `description` | `TEXT` | NULL | — | |
| `status` | `VARCHAR(20)` | NOT NULL | `'OPEN'` | `CHECK (status IN ('OPEN','INVESTIGATING','RESOLVED','DISMISSED'))` |
| `created_at` | `DATETIME(6)` | NOT NULL | `UTC_TIMESTAMP(6)` | |
| `resolved_at` | `DATETIME(6)` | NULL | — | |
| `resolved_by` | `CHAR(36)` | NULL | — | FK → `users.id` |
| `resolution_note` | `TEXT` | NULL | — | not cleared on reopen, see state-machine doc |
| `active_report_key` | `CHAR(73)` | **GENERATED ALWAYS AS** `(CASE WHEN status IN ('OPEN','INVESTIGATING') THEN CONCAT(reporter_user_id, ':', action_id) ELSE NULL END) STORED` | — | MySQL-compatible replacement for PostgreSQL's partial unique index — see note below |
| `version` | `BIGINT` | NOT NULL | `0` | |

- **PK**: `id`.
- **FK**: `action_id → actions.id ON DELETE CASCADE`; `reporter_user_id → users.id ON
  DELETE CASCADE`; `resolved_by → users.id ON DELETE SET NULL`.

**MySQL replacement for the PostgreSQL partial unique index (ADR-12, ADR-15, ADR-17)**:
same technique as `participations.active_confirmation_key` above. The original
`UNIQUE INDEX ux_action_reports_active ON action_reports (reporter_user_id, action_id)
WHERE status IN ('OPEN', 'INVESTIGATING')` becomes:

```sql
ALTER TABLE action_reports
  ADD COLUMN active_report_key CHAR(73)
    GENERATED ALWAYS AS (
      CASE WHEN status IN ('OPEN','INVESTIGATING')
        THEN CONCAT(reporter_user_id, ':', action_id) ELSE NULL END
    ) STORED,
  ADD UNIQUE INDEX ux_action_reports_active (active_report_key);
```

Same reasoning as `participations`: `NULL` for `RESOLVED`/`DISMISSED` rows (any number
allowed), a real, non-null, InnoDB-enforced unique value for at most one active
(`OPEN`/`INVESTIGATING`) report per reporter/action — this is the actual guarantee
under concurrent requests, not just the service-layer pre-check.

- **Own-action reporting restriction**: **not** a `CHECK` constraint (would require a
  cross-table subquery, which plain `CHECK` cannot express in either PostgreSQL or
  MySQL). Enforced at the service layer (`reports` module, comparing
  `reporterUserId` against the resolved action's owning organizer). A row-level
  trigger is noted as a possible future hardening option, not required for MVP —
  documented here rather than silently assumed safe.
- **Indexes**: `INDEX ix_action_reports_action_id ON action_reports (action_id)`;
  `INDEX ix_action_reports_status ON action_reports (status)`.

---

## `admin_activity_log`

Append-only, per `domain-model-and-state-machines.md`.

| Column | Type | Nullability | Default | Notes |
|---|---|---|---|---|
| `id` | `CHAR(36)` | NOT NULL | app-generated `UUID.randomUUID()` | PK |
| `admin_user_id` | `CHAR(36)` | NOT NULL | — | FK → `users.id` |
| `action_type` | `VARCHAR(40)` | NOT NULL | — | `CHECK (action_type IN (...))` — see § Enum types |
| `target_type` | `VARCHAR(20)` | NOT NULL | — | `CHECK (target_type IN ('USER','ORGANIZATION','ACTION','REPORT','ATTENDANCE'))` |
| `target_id` | `CHAR(36)` | NOT NULL | — | polymorphic, no FK (see note below) |
| `metadata` | `JSON` | NOT NULL | `(JSON_OBJECT())` | MySQL `JSON`, replacing PostgreSQL `JSONB` — see note below |
| `created_at` | `DATETIME(6)` | NOT NULL | `UTC_TIMESTAMP(6)` | |

- **PK**: `id`.
- **FK**: `admin_user_id → users.id ON DELETE RESTRICT`.
- **`metadata` column type (ADR-17)**: MySQL 8 has no `JSONB` binary type (PostgreSQL-only);
  its plain `JSON` type stores a validated JSON document as text internally (MySQL
  does not offer a separate pre-parsed binary storage format the way PostgreSQL's
  `JSONB` does) and is the correct choice here regardless, since `metadata` is
  free-form, per-action-type audit context that is only ever read back whole for
  display — never filtered, indexed, or queried by a specific key anywhere in
  `rest-api-design.md` — so there is no query/indexing requirement that would justify
  normalizing it into dedicated columns.
- **No FK on `target_id`**: it is polymorphic (interpreted per `target_type`); a
  generic `CHECK`/FK cannot span multiple target tables in either PostgreSQL or MySQL
  without a trigger. Accepted as an explicit, documented limitation of an append-only
  log — referential integrity here is app-level only (the exact same limitation the
  mock itself has, not a regression).
- **Indexes**: `INDEX ix_admin_activity_log_created_at ON admin_activity_log
  (created_at DESC)` (list ordering); `INDEX ix_admin_activity_log_target ON
  admin_activity_log (target_type, target_id)`; `INDEX ix_admin_activity_log_admin_user_id
  ON admin_activity_log (admin_user_id)`.

---

## View: `v_public_actions`

The single authoritative public-visibility policy (ADR-13), backing every public
read path.

```sql
CREATE VIEW v_public_actions AS
SELECT a.*
FROM actions a
JOIN action_moderation am ON am.action_id = a.id
JOIN organizations o ON o.id = a.organization_id
WHERE a.lifecycle_status IN ('PUBLISHED', 'CLOSED')
  AND am.status = 'APPROVED'
  AND o.status = 'APPROVED';
```

Every public/map/admin-summary read of "is this action visible" queries this view
(via `ActionVisibilityQueryService`) — no controller or service re-derives this
boolean independently (closing risk #16). Participation *eligibility* is a related but
separate, narrower filter (`lifecycle_status = 'PUBLISHED'` only, excluding `CLOSED`)
applied on top of this same view by `ParticipationEligibilityService` (ADR-10) — never
duplicated as its own independent boolean expression elsewhere.

---

## Referential integrity summary (`ON DELETE` policy by relationship)

| Child table . column | Parent | Policy | Reasoning |
|---|---|---|---|
| `organizations.organizer_user_id` | `users` | `RESTRICT` | users are never deleted; defensive only |
| `actions.organization_id` | `organizations` | `CASCADE` | organization removal only ever happens via the demotion transaction, which intends exactly this cascade |
| `action_moderation.action_id` | `actions` | `CASCADE` | 1:1 child, must disappear with its action |
| `action_moderation_history.action_id` | `actions` | `CASCADE` | audit trail of a specific action, meaningless once the action is gone |
| `participations.action_id` | `actions` | `CASCADE` | matches the demotion cascade's explicit participation-deletion step |
| `participations.user_id` | `users` | `CASCADE` | defensive; users are never deleted in practice |
| `attendance.participation_id` | `participations` | `CASCADE` | matches the demotion cascade's explicit attendance-deletion step |
| `attendance.action_id` / `.user_id` | `actions` / `users` | `CASCADE` | denormalized copies, must stay consistent with the row's own lifecycle |
| `qr_check_in_tokens.action_id` | `actions` | `CASCADE` | matches the demotion cascade's explicit QR-invalidation step |
| `action_reports.action_id` | `actions` | `CASCADE` | matches the demotion cascade's explicit report-deletion step (see `transactions-and-integrity.md` for the *policy choice* of delete-vs-archive) |
| `action_reports.reporter_user_id` | `users` | `CASCADE` | defensive; users are never deleted in practice |
| `admin_activity_log.admin_user_id` | `users` | `RESTRICT` | an audit trail must never silently lose its actor |
| `refresh_tokens.user_id` | `users` | `CASCADE` | defensive; users are never deleted in practice |

**No blind `CASCADE ALL`** — every cascade above is deliberately chosen because it
matches an operation the application already performs explicitly and transactionally
(the demotion cascade); no table cascades "because it seemed convenient." Full detail
of the transaction itself, including why the database cascades are a *complement* to
(not a replacement for) the application-level transaction boundary, is in
`transactions-and-integrity.md`.

---

## Time, dates, and timezone policy

Resolves Part 17.

- **Storage (ADR-17)**: MySQL 8 has no `TIMESTAMPTZ` type. Every temporal column in
  this schema is `DATETIME(6)` (microsecond precision, no built-in timezone
  conversion), and the application guarantees every value written to it is always a
  **UTC instant** — never a naive/local timestamp, and never the ambiguous MySQL
  `TIMESTAMP` type (which auto-converts using the *connection's* session time zone on
  every read/write, a footgun if any connection in the pool is ever misconfigured, and
  which also range-limits to the year 2038). `DATETIME(6)` was chosen specifically
  because it stores exactly the bytes it's given with no implicit conversion, so as
  long as every writer (JDBC driver, Hibernate, the application clock) is pinned to
  UTC, the column's contents are unambiguously UTC without depending on the MySQL
  server's own configured time zone. The JDBC URL, Hibernate, and the JVM's default
  time zone are all pinned to UTC (see `system-architecture.md` and
  `local-development-and-integration.md`) so this guarantee holds end to end.
- **API representation**: every timestamp in a JSON response is ISO-8601 with an
  explicit UTC offset (`2026-08-03T14:00:00Z`) — never a preformatted, locale-specific
  string (closing the mock's own "stored translated values" risk category for dates;
  the mock never actually stored preformatted dates either — `date.js`'s
  `relativeDateString` is fixture-generation-only — but this is stated here explicitly
  as a forward requirement, not left implicit).
- **Action scheduling model**: `actions.start_at DATETIME(6) NOT NULL` + optional
  `actions.end_at DATETIME(6) NULL` + `actions.timezone VARCHAR(50) DEFAULT
  'Europe/Athens'`. This **replaces** the mock's separate `date` (`YYYY-MM-DD`) +
  `startTime` (`HH:MM`) string pair with one real UTC instant plus an explicit IANA
  timezone for correct local-time display and correct check-in-window math across a
  potential daylight-saving boundary. `timezone` is stored per-action (not assumed
  globally) so if the product ever expands beyond Greece, existing data does not need
  a migration.
- **Upcoming/past classification**: computed at read time as `start_at > UTC_TIMESTAMP(6)`
  (or, for the "past" tab, `start_at <= UTC_TIMESTAMP(6)`) — never a stored
  boolean/status field (matches the mock's own `isPastDate` being a pure function over
  `date`, not a stored value).
- **Check-in window** (ADR-11): computed as
  `[start_at - INTERVAL 30 MINUTE, start_at + INTERVAL 180 MINUTE]` (MySQL's
  `DATE_SUB`/`DATE_ADD`-equivalent inline interval syntax, replacing PostgreSQL's
  `start_at - INTERVAL '30 minutes'` literal form), compared against
  `UTC_TIMESTAMP(6)` — both sides are `DATETIME(6)` UTC instants, so the action's own
  `timezone` column only matters for *display* (converting `start_at` to local
  wall-clock time for the organizer/volunteer to read), never for the window
  arithmetic itself (instant comparison is timezone-agnostic by construction).
- **Action closing**: a lifecycle transition (`PUBLISHED → CLOSED`), not a time-based
  automatic state — no scheduled job flips actions to `CLOSED` when their time passes;
  "past" is purely a read-time classification, exactly matching current mock behavior
  (there is no auto-close feature in the mock and none is introduced here).
- **Reporting timestamps** (`action_reports.created_at`, etc.): `UTC_TIMESTAMP(6)` at
  write time, no timezone conversion needed since these are point-in-time
  administrative records, not user-facing schedule data.
- **JDBC/Hibernate/application configuration**: the JDBC URL includes
  `serverTimezone=UTC`, `spring.jpa.properties.hibernate.jdbc.time_zone=UTC` pins
  Hibernate's own timestamp binding to UTC, and the application process itself pins
  its JVM default time zone to UTC at startup — three independent, redundant
  UTC-pinning layers so no single misconfiguration silently reintroduces server-local
  time (see `system-architecture.md` § Technology stack and
  `local-development-and-integration.md`).
