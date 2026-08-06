package com.onehelp.backend.organizations.service;

import com.onehelp.backend.common.web.PageResponse;
import com.onehelp.backend.organizations.dto.OrganizationResponse;
import com.onehelp.backend.organizations.dto.OrganizerDemotionResponse;
import com.onehelp.backend.organizations.dto.RejectOrganizationRequest;
import com.onehelp.backend.organizations.dto.UpdateOrganizationRequest;
import com.onehelp.backend.organizations.entity.OrganizationStatus;
import java.util.UUID;
import org.springframework.data.domain.Pageable;

public interface AdminOrganizationService {

    /** Paginated, optional search (both name locales) and status filter. Page size is
     * silently clamped to 100. */
    PageResponse<OrganizationResponse> list(String search, OrganizationStatus status, Pageable pageable);

    /** @throws com.onehelp.backend.organizations.exception.OrganizationNotFoundException if unknown */
    OrganizationResponse getById(UUID organizationId);

    /** @throws com.onehelp.backend.organizations.exception.OrganizationNotFoundException if unknown
     * @throws com.onehelp.backend.organizations.exception.DuplicateOrganizationNameException if renamed to a taken name */
    OrganizationResponse updateAdmin(UUID organizationId, UpdateOrganizationRequest request);

    /**
     * @throws com.onehelp.backend.organizations.exception.OrganizationNotFoundException if unknown
     * @throws com.onehelp.backend.organizations.exception.OrganizationInvalidTransitionException if not PENDING
     */
    OrganizationResponse approve(UUID adminUserId, UUID organizationId);

    /**
     * @throws com.onehelp.backend.organizations.exception.OrganizationNotFoundException if unknown
     * @throws com.onehelp.backend.organizations.exception.OrganizationInvalidTransitionException if not PENDING
     * @throws com.onehelp.backend.organizations.exception.RejectionReasonRequiredException if reason is blank
     */
    OrganizationResponse reject(UUID adminUserId, UUID organizationId, RejectOrganizationRequest request);

    /**
     * Idempotent — suspending an already-suspended organization succeeds and returns
     * the current state.
     *
     * @throws com.onehelp.backend.organizations.exception.OrganizationNotFoundException if unknown
     * @throws com.onehelp.backend.organizations.exception.OrganizationInvalidTransitionException
     *     if PENDING or REJECTED (must be approved first)
     */
    OrganizationResponse suspend(UUID organizationId);

    /** Idempotent — restoring an already-approved organization succeeds and returns
     * the current state. Same exceptions as {@link #suspend}. */
    OrganizationResponse restore(UUID organizationId);

    /**
     * {@code POST /admin/organizations/{id}/demote} — not a generic role-change
     * operation; the only role this ever assigns is {@code VOLUNTEER}, and only to the
     * organization's own current owner.
     *
     * @throws com.onehelp.backend.organizations.exception.OrganizationNotFoundException if unknown
     * @throws com.onehelp.backend.organizations.exception.OrganizerDemotionNotAllowedException
     *     if the admin is somehow the organization's own owner
     * @throws com.onehelp.backend.organizations.exception.OrganizerRoleRequiredException
     *     if the owner's live role is not ORGANIZER (defensive)
     */
    OrganizerDemotionResponse demoteOrganizer(UUID adminUserId, UUID organizationId);
}
