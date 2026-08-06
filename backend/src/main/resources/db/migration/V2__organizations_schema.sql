-- Organizations and organizer applications (docs/backend-architecture/database-schema.md
-- § organizations, ADR-4, ADR-8). One table covers the entire pending/approved/
-- rejected/suspended lifecycle (ADR-8 — the application IS the organization record,
-- no separate organizer_applications table). The 1:1 organizer-owns-one-organization
-- rule (ADR-4/ADR-15) is enforced here via `UNIQUE (organizer_user_id)` — the sole
-- enforcement mechanism, no membership table.
--
-- Actions, participation, attendance, reports, and admin activity are each introduced
-- by their own future Flyway migration — not created here (this phase's explicit
-- scope, see docs/reports/2026-08-06-organizations-and-organizer-applications-integration.md).

CREATE TABLE organizations (
    id                          CHAR(36)     NOT NULL,
    organizer_user_id           CHAR(36)     NOT NULL,
    name_el                     VARCHAR(120) NOT NULL,
    name_en                     VARCHAR(120) NOT NULL,
    description_el              TEXT         NOT NULL,
    description_en              TEXT         NOT NULL,
    organization_type           VARCHAR(30)  NOT NULL,
    contact_email               VARCHAR(255) NOT NULL,
    phone                       VARCHAR(50)  NULL,
    website                     VARCHAR(255) NULL,
    address                     VARCHAR(255) NOT NULL,
    municipality                VARCHAR(120) NOT NULL,
    supporting_message          TEXT         NOT NULL,
    status                      VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    submitted_at                DATETIME(6)  NOT NULL,
    reviewed_at                 DATETIME(6)  NULL,
    reviewed_by                 CHAR(36)     NULL,
    rejection_reason            TEXT         NULL,
    previous_rejection_reason   TEXT         NULL,
    created_at                  DATETIME(6)  NOT NULL,
    updated_at                  DATETIME(6)  NOT NULL,
    version                     BIGINT       NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT uk_organizations_organizer_user_id UNIQUE (organizer_user_id),
    CONSTRAINT fk_organizations_organizer
        FOREIGN KEY (organizer_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_organizations_reviewed_by
        FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_organizations_status
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED')),
    CONSTRAINT chk_organizations_organization_type
        CHECK (organization_type IN ('NGO', 'MUNICIPALITY', 'HEALTH_ORGANIZATION',
            'VOLUNTEER_GROUP', 'ANIMAL_WELFARE', 'EDUCATIONAL_INSTITUTION',
            'COMMUNITY_ASSOCIATION', 'OTHER')),
    CONSTRAINT chk_organizations_name_el_length
        CHECK (CHAR_LENGTH(name_el) BETWEEN 2 AND 120),
    CONSTRAINT chk_organizations_name_en_length
        CHECK (CHAR_LENGTH(name_en) BETWEEN 2 AND 120),
    CONSTRAINT chk_organizations_description_el_length
        CHECK (CHAR_LENGTH(description_el) BETWEEN 20 AND 2000),
    CONSTRAINT chk_organizations_description_en_length
        CHECK (CHAR_LENGTH(description_en) BETWEEN 20 AND 2000),
    CONSTRAINT chk_organizations_supporting_message_length
        CHECK (CHAR_LENGTH(supporting_message) BETWEEN 20 AND 2000),
    CONSTRAINT chk_organizations_rejection_reason_required
        CHECK (status <> 'REJECTED' OR rejection_reason IS NOT NULL)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE INDEX ix_organizations_status ON organizations (status);

-- Normalized categories join table (ADR-17: filtered/queried data is normalized, not
-- stored as JSON). Values are shared with the future Actions module's ActionCategory
-- enum (docs/backend-architecture/domain-model-and-state-machines.md), reused
-- identically here as an organization's self-declared focus areas.
CREATE TABLE organization_categories (
    organization_id CHAR(36)    NOT NULL,
    category        VARCHAR(20) NOT NULL,
    PRIMARY KEY (organization_id, category),
    CONSTRAINT chk_organization_categories_category
        CHECK (category IN ('EMERGENCY', 'HEALTH', 'ENVIRONMENT', 'SOCIAL', 'ANIMALS')),
    CONSTRAINT fk_organization_categories_organization
        FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
