package com.onehelp.backend.organizations.controller;

import com.onehelp.backend.common.security.CurrentUserProvider;
import com.onehelp.backend.common.web.ApiErrorResponse;
import com.onehelp.backend.common.web.PageResponse;
import com.onehelp.backend.organizations.dto.OrganizationResponse;
import com.onehelp.backend.organizations.dto.OrganizerDemotionResponse;
import com.onehelp.backend.organizations.dto.RejectOrganizationRequest;
import com.onehelp.backend.organizations.dto.UpdateOrganizationRequest;
import com.onehelp.backend.organizations.entity.OrganizationStatus;
import com.onehelp.backend.organizations.service.AdminOrganizationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.SortDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Administrator-only organization and organizer-application review. Class-level
 * {@code @PreAuthorize} mirrors {@code AdminUsersController} exactly — a
 * non-administrator gets {@code common.forbidden} (403) before any method body runs;
 * an unauthenticated caller gets {@code common.unauthenticated} (401) from the filter
 * chain first. There is deliberately no endpoint here that assigns an arbitrary role —
 * approval only ever grants {@code ORGANIZER} to the application's own applicant,
 * demotion only ever resets to {@code VOLUNTEER} the organization's own current owner.
 */
@RestController
@RequestMapping("/api/v1/admin/organizations")
@PreAuthorize("hasRole('ADMINISTRATOR')")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Admin Organizations", description = "Administrator-only organization and application review")
public class AdminOrganizationsController {

    private final AdminOrganizationService adminOrganizationService;
    private final CurrentUserProvider currentUserProvider;

    public AdminOrganizationsController(
            AdminOrganizationService adminOrganizationService, CurrentUserProvider currentUserProvider) {
        this.adminOrganizationService = adminOrganizationService;
        this.currentUserProvider = currentUserProvider;
    }

    @GetMapping
    @Operation(
            summary = "List organizations and applications",
            description = "Paginated, with optional free-text search (both name locales) and a status filter "
                    + "(PENDING/APPROVED/REJECTED/SUSPENDED). Page size is capped at 100.")
    public PageResponse<OrganizationResponse> list(
            @Parameter(description = "Matches either name locale") @RequestParam(required = false) String search,
            @RequestParam(required = false) OrganizationStatus status,
            @PageableDefault(size = 20) @SortDefault(sort = "submittedAt", direction = Sort.Direction.DESC)
                    Pageable pageable) {
        return adminOrganizationService.list(search, status, pageable);
    }

    @GetMapping("/{organizationId}")
    @Operation(summary = "Get an organization/application's full detail")
    @ApiResponses({
        @ApiResponse(
                responseCode = "404",
                description = "organization.notFound",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public OrganizationResponse details(@PathVariable UUID organizationId) {
        return adminOrganizationService.getById(organizationId);
    }

    @PatchMapping("/{organizationId}")
    @Operation(
            summary = "Edit an organization's profile fields",
            description = "Owner, status, and review metadata are never editable here — a dedicated DTO with no "
                    + "such fields (mass-assignment prevention).")
    @ApiResponses({
        @ApiResponse(
                responseCode = "404",
                description = "organization.notFound",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
        @ApiResponse(
                responseCode = "409",
                description = "organization.duplicateName",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public OrganizationResponse update(
            @PathVariable UUID organizationId, @Valid @RequestBody UpdateOrganizationRequest request) {
        return adminOrganizationService.updateAdmin(organizationId, request);
    }

    @PostMapping("/{organizationId}/approve")
    @Operation(
            summary = "Approve a pending application",
            description = "Transactional: organization status -> APPROVED, applicant role VOLUNTEER -> ORGANIZER, "
                    + "reviewer/timestamp recorded, and every active refresh token for the applicant is revoked "
                    + "— they must log in again to receive an ORGANIZER-scoped session.")
    @ApiResponses({
        @ApiResponse(
                responseCode = "400",
                description = "organization.invalidTransition",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
        @ApiResponse(
                responseCode = "404",
                description = "organization.notFound",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public OrganizationResponse approve(@PathVariable UUID organizationId) {
        return adminOrganizationService.approve(currentUserProvider.currentUserId(), organizationId);
    }

    @PostMapping("/{organizationId}/reject")
    @Operation(summary = "Reject a pending application", description = "A rejection reason is always required.")
    @ApiResponses({
        @ApiResponse(
                responseCode = "400",
                description = "organization.invalidTransition",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
        @ApiResponse(
                responseCode = "404",
                description = "organization.notFound",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
        @ApiResponse(
                responseCode = "422",
                description = "organization.reasonRequired",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public OrganizationResponse reject(
            @PathVariable UUID organizationId, @RequestBody RejectOrganizationRequest request) {
        return adminOrganizationService.reject(currentUserProvider.currentUserId(), organizationId, request);
    }

    @PostMapping("/{organizationId}/suspend")
    @Operation(
            summary = "Suspend an organization",
            description = "Idempotent — suspending an already-suspended organization succeeds and returns the "
                    + "current state. The owner's own account/authentication is not affected — only the "
                    + "organization's public standing.")
    @ApiResponses({
        @ApiResponse(
                responseCode = "400",
                description = "organization.invalidTransition",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
        @ApiResponse(
                responseCode = "404",
                description = "organization.notFound",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public OrganizationResponse suspend(@PathVariable UUID organizationId) {
        return adminOrganizationService.suspend(organizationId);
    }

    @PostMapping("/{organizationId}/restore")
    @Operation(
            summary = "Restore a suspended organization",
            description = "Idempotent — restoring an already-approved organization succeeds and returns the "
                    + "current state.")
    @ApiResponses({
        @ApiResponse(
                responseCode = "400",
                description = "organization.invalidTransition",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
        @ApiResponse(
                responseCode = "404",
                description = "organization.notFound",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public OrganizationResponse restore(@PathVariable UUID organizationId) {
        return adminOrganizationService.restore(organizationId);
    }

    @PostMapping("/{organizationId}/demote")
    @Operation(
            summary = "Demote this organization's organizer back to volunteer",
            description = "Transactional: deletes the organization, resets the owner's role to VOLUNTEER, and "
                    + "revokes every active refresh token for them. Not a generic role-change operation — the "
                    + "only role this ever assigns is VOLUNTEER, and only to this organization's own current owner.")
    @ApiResponses({
        @ApiResponse(
                responseCode = "400",
                description = "organizer.demotionNotAllowed",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
        @ApiResponse(
                responseCode = "403",
                description = "organizer.notOrganizer",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
        @ApiResponse(
                responseCode = "404",
                description = "organization.notFound",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public OrganizerDemotionResponse demote(@PathVariable UUID organizationId) {
        return adminOrganizationService.demoteOrganizer(currentUserProvider.currentUserId(), organizationId);
    }
}
