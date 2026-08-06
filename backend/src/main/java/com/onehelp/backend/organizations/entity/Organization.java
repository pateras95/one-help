package com.onehelp.backend.organizations.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * The application IS the organization record (ADR-8) — one row covers the entire
 * pending/approved/rejected/suspended lifecycle. {@code organizerUserId} is a raw
 * foreign key (not a JPA relationship) — deliberately, matching ADR-4's "no separate
 * membership table" decision: the unique constraint on this column alone is the entire
 * representation of "one organizer owns exactly one organization, one organization has
 * exactly one organizer." It is never exposed directly by any DTO — always resolved
 * into a {@code UserSummaryResponse} by the mapper.
 *
 * <p>See docs/backend-architecture/database-schema.md § organizations for the physical
 * schema this entity maps onto.
 */
@Entity
@Table(name = "organizations")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
public class Organization {

    @Id
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "id", columnDefinition = "CHAR(36)", updatable = false, nullable = false)
    private UUID id;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "organizer_user_id", columnDefinition = "CHAR(36)", nullable = false, updatable = false)
    private UUID organizerUserId;

    @Column(name = "name_el", nullable = false, length = 120)
    private String nameEl;

    @Column(name = "name_en", nullable = false, length = 120)
    private String nameEn;

    @Column(name = "description_el", nullable = false, columnDefinition = "TEXT")
    private String descriptionEl;

    @Column(name = "description_en", nullable = false, columnDefinition = "TEXT")
    private String descriptionEn;

    @Enumerated(EnumType.STRING)
    @Column(name = "organization_type", nullable = false, length = 30)
    private OrganizationType organizationType;

    @Column(name = "contact_email", nullable = false, length = 255)
    private String contactEmail;

    @Column(name = "phone", length = 50)
    private String phone;

    @Column(name = "website", length = 255)
    private String website;

    @Column(name = "address", nullable = false, length = 255)
    private String address;

    @Column(name = "municipality", nullable = false, length = 120)
    private String municipality;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "organization_categories", joinColumns = @JoinColumn(name = "organization_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 20)
    private Set<OrganizationCategory> categories = new LinkedHashSet<>();

    @Column(name = "supporting_message", nullable = false, columnDefinition = "TEXT")
    private String supportingMessage;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private OrganizationStatus status = OrganizationStatus.PENDING;

    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "reviewed_by", columnDefinition = "CHAR(36)")
    private UUID reviewedBy;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "previous_rejection_reason", columnDefinition = "TEXT")
    private String previousRejectionReason;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    protected Organization() {
        // required by JPA
    }

    public Organization(UUID id, UUID organizerUserId) {
        this.id = id;
        this.organizerUserId = organizerUserId;
    }
}
