package com.onehelp.backend.organizations.entity;

/**
 * The application IS the organization record (ADR-8) — this single enum covers both
 * the pre-approval application lifecycle and the post-approval operating status. See
 * docs/backend-architecture/domain-model-and-state-machines.md § OrganizationStatus
 * for the full transition table.
 *
 * <p>Valid transitions: {@code PENDING -> APPROVED}, {@code PENDING -> REJECTED},
 * {@code REJECTED -> PENDING} (resubmission only), {@code APPROVED <-> SUSPENDED}.
 * {@code REJECTED -> APPROVED/SUSPENDED} directly, and {@code PENDING -> SUSPENDED},
 * are both invalid.
 */
public enum OrganizationStatus {
    PENDING,
    APPROVED,
    REJECTED,
    SUSPENDED
}
