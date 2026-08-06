package com.onehelp.backend.organizations.dto;

import com.onehelp.backend.organizations.entity.OrganizationCategory;
import com.onehelp.backend.organizations.entity.OrganizationStatus;
import com.onehelp.backend.organizations.entity.OrganizationType;
import com.onehelp.backend.users.dto.UserSummaryResponse;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;

/**
 * The single response shape for the entire application/organization lifecycle
 * (ADR-8/dto-catalogue.md — {@code OrganizationApplicationResponse} and
 * {@code OrganizationResponse} are the same DTO). Returned by every volunteer,
 * organizer, and admin endpoint in this domain — sensitivity is "self or admin" in
 * every case (there is no public variant of this DTO; a public-safe organization
 * subset, when the future Actions phase needs one, is composed separately as a nested
 * field on that phase's own response, never this full shape).
 *
 * <p>{@code organizerUserId} is deliberately never a field here — always resolved into
 * {@code organizer}, a safe {@link UserSummaryResponse}, closing the mock's own "never
 * exposed to the client" note by making the resolved form the only form that exists.
 */
public record OrganizationResponse(
        UUID id,
        UserSummaryResponse organizer,
        LocalizedText name,
        LocalizedText description,
        OrganizationType organizationType,
        String contactEmail,
        String phone,
        String website,
        String address,
        String municipality,
        Set<OrganizationCategory> categories,
        String supportingMessage,
        OrganizationStatus status,
        Instant submittedAt,
        Instant reviewedAt,
        UserSummaryResponse reviewedBy,
        String rejectionReason,
        String previousRejectionReason,
        Long version) {}
