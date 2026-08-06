package com.onehelp.backend.organizations.service;

import com.onehelp.backend.organizations.dto.OrganizationApplicationRequest;
import com.onehelp.backend.organizations.dto.OrganizationResponse;
import com.onehelp.backend.organizations.dto.OrganizerDemotionResponse;
import com.onehelp.backend.organizations.dto.UpdateOrganizationRequest;
import java.util.UUID;

/**
 * Volunteer application flow and organizer self-service — both operate on the same
 * {@code organizations} row for the caller (ADR-8), so {@code GET
 * /organizer-applications/me} and {@code GET /organizations/me} share one
 * implementation, per rest-api-design.md.
 */
public interface OrganizationService {

    /**
     * @throws com.onehelp.backend.organizations.exception.OrganizationNotFoundException
     *     if the caller has no application/organization on file
     */
    OrganizationResponse getForUser(UUID userId);

    /**
     * @throws com.onehelp.backend.organizations.exception.OrganizationAlreadyExistsException
     *     if the caller already has an application/organization (any status)
     * @throws com.onehelp.backend.organizations.exception.TermsNotAcceptedException if terms were not accepted
     * @throws com.onehelp.backend.organizations.exception.DuplicateOrganizationNameException
     *     if the name is already used by another organization
     */
    OrganizationResponse submitApplication(UUID userId, OrganizationApplicationRequest request);

    /**
     * @throws com.onehelp.backend.organizations.exception.OrganizationNotFoundException
     *     if unknown, or not owned by this caller (never discloses which)
     * @throws com.onehelp.backend.organizations.exception.OrganizationNotPendingException if not PENDING
     */
    OrganizationResponse updatePendingApplication(UUID userId, UUID applicationId, OrganizationApplicationRequest request);

    /**
     * @throws com.onehelp.backend.organizations.exception.OrganizationNotFoundException
     *     if unknown, or not owned by this caller
     * @throws com.onehelp.backend.organizations.exception.OrganizationNotRejectedException if not REJECTED
     */
    OrganizationResponse resubmitApplication(UUID userId, UUID applicationId, OrganizationApplicationRequest request);

    /**
     * {@code PATCH /organizations/me} — allowed only while {@code APPROVED} or
     * {@code SUSPENDED} (matches the mock's own gating exactly).
     *
     * @throws com.onehelp.backend.organizations.exception.OrganizerOrganizationMissingException
     *     if the caller has role ORGANIZER but no organization row (defensive)
     * @throws com.onehelp.backend.organizations.exception.OrganizationInvalidTransitionException
     *     if the organization is PENDING or REJECTED
     */
    OrganizationResponse updateOwnOrganization(UUID userId, UpdateOrganizationRequest request);

    /** {@code POST /organizations/me/demote} — see {@link OrganizerDemotionService}. */
    OrganizerDemotionResponse selfDemote(UUID userId);
}
