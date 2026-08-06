-- Foundation schema: users and refresh_tokens only.
-- Organizations, actions, participation, attendance, reports, and admin activity are
-- each introduced by their own future Flyway migration (see
-- docs/backend-architecture/database-schema.md).
--
-- MySQL 8.x / InnoDB. UUID primary keys are application-generated (java.util.UUID)
-- and stored as CHAR(36) (see database-schema.md § UUID strategy) — never
-- gen_random_uuid()/pgcrypto. Every timestamp is DATETIME(6), a UTC instant written
-- by the application (see database-schema.md § Time, dates, and timezone policy) —
-- never TIMESTAMPTZ, which MySQL does not support. Every table uses utf8mb4 with the
-- utf8mb4_0900_ai_ci collation (accent-insensitive and case-insensitive, correct for
-- Greek tonos/diacritics and English). role/status use VARCHAR + CHECK, not a native
-- ENUM type (MySQL has no CREATE TYPE ... AS ENUM) — the role CHECK enforces exactly
-- the three supported roles; there is no MODERATOR value (ADR-18).

CREATE TABLE users (
    id                 CHAR(36)     NOT NULL,
    first_name         VARCHAR(100) NOT NULL,
    last_name          VARCHAR(100) NOT NULL,
    email              VARCHAR(255) NOT NULL,
    password_hash      VARCHAR(255) NOT NULL,
    role               VARCHAR(20)  NOT NULL DEFAULT 'VOLUNTEER',
    status             VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    avatar_initials    VARCHAR(4)   NULL,
    locale_preference  VARCHAR(5)   NOT NULL DEFAULT 'el',
    created_at         DATETIME(6)  NOT NULL,
    updated_at         DATETIME(6)  NOT NULL,
    version            BIGINT       NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT uk_users_email UNIQUE (email),
    CONSTRAINT chk_users_role
        CHECK (role IN ('VOLUNTEER', 'ORGANIZER', 'ADMINISTRATOR')),
    CONSTRAINT chk_users_status
        CHECK (status IN ('ACTIVE', 'SUSPENDED')),
    CONSTRAINT chk_users_locale_preference
        CHECK (locale_preference IN ('el', 'en'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE INDEX ix_users_role ON users (role);
CREATE INDEX ix_users_status ON users (status);

CREATE TABLE refresh_tokens (
    id                    CHAR(36)     NOT NULL,
    user_id               CHAR(36)     NOT NULL,
    token_hash            VARCHAR(255) NOT NULL,
    issued_at             DATETIME(6)  NOT NULL,
    expires_at            DATETIME(6)  NOT NULL,
    revoked_at            DATETIME(6)  NULL,
    replaced_by_token_id  CHAR(36)     NULL,
    user_agent            VARCHAR(255) NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_refresh_tokens_token_hash UNIQUE (token_hash),
    CONSTRAINT fk_refresh_tokens_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_refresh_tokens_replaced_by
        FOREIGN KEY (replaced_by_token_id) REFERENCES refresh_tokens (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE INDEX ix_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX ix_refresh_tokens_expires_at ON refresh_tokens (expires_at);
