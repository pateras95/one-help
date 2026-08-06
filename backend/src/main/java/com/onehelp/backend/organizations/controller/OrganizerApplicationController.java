package com.onehelp.backend.organizations.controller;

import com.onehelp.backend.common.security.CurrentUserProvider;
import com.onehelp.backend.common.web.ApiErrorResponse;
import com.onehelp.backend.organizations.dto.OrganizationApplicationRequest;
import com.onehelp.backend.organizations.dto.OrganizationResponse;
import com.onehelp.backend.organizations.service.OrganizationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * The volunteer organizer-application flow (submit / view own / edit-while-pending /
 * resubmit-after-rejection). Submitting is {@code VOLUNTEER}-only at the method-
 * security layer — an organizer, an administrator, or a suspended account is rejected
 * before any service logic runs (rest-api-design.md, security-and-authentication.md).
 * {@code GET .../me} is open to any authenticated role (any user may check their own
 * application state).
 */
@RestController
@RequestMapping("/api/v1/organizer-applications")
@PreAuthorize("isAuthenticated()")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Organizer Applications", description = "Volunteer organizer-application submission and review flow")
public class OrganizerApplicationController {

    private final OrganizationService organizationService;
    private final CurrentUserProvider currentUserProvider;

    public OrganizerApplicationController(OrganizationService organizationService, CurrentUserProvider currentUserProvider) {
        this.organizationService = organizationService;
        this.currentUserProvider = currentUserProvider;
    }

    @GetMapping("/me")
    @Operation(summary = "Get the authenticated user's own application/organization, at any status")
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                content = @Content(schema = @Schema(implementation = OrganizationResponse.class))),
        @ApiResponse(
                responseCode = "404",
                description = "organization.notFound",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public OrganizationResponse me() {
        return organizationService.getForUser(currentUserProvider.currentUserId());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('VOLUNTEER')")
    @Operation(summary = "Submit a new organizer application")
    @ApiResponses({
        @ApiResponse(
                responseCode = "201",
                content = @Content(schema = @Schema(implementation = OrganizationResponse.class))),
        @ApiResponse(
                responseCode = "409",
                description = "organization.alreadyHasOrganization | organization.duplicateName",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
        @ApiResponse(
                responseCode = "422",
                description = "validation.failed | organization.termsNotAccepted",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public OrganizationResponse submit(@Valid @RequestBody OrganizationApplicationRequest request) {
        return organizationService.submitApplication(currentUserProvider.currentUserId(), request);
    }

    @PatchMapping("/{applicationId}")
    @PreAuthorize("hasRole('VOLUNTEER')")
    @Operation(summary = "Edit an application while it is still pending review")
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                content = @Content(schema = @Schema(implementation = OrganizationResponse.class))),
        @ApiResponse(
                responseCode = "400",
                description = "organization.notPending",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
        @ApiResponse(
                responseCode = "404",
                description = "organization.notFound",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public OrganizationResponse updatePending(
            @PathVariable UUID applicationId, @Valid @RequestBody OrganizationApplicationRequest request) {
        return organizationService.updatePendingApplication(currentUserProvider.currentUserId(), applicationId, request);
    }

    @PostMapping("/{applicationId}/resubmit")
    @PreAuthorize("hasRole('VOLUNTEER')")
    @Operation(summary = "Edit and resubmit a rejected application, returning it to PENDING")
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                content = @Content(schema = @Schema(implementation = OrganizationResponse.class))),
        @ApiResponse(
                responseCode = "400",
                description = "organization.notRejected",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
        @ApiResponse(
                responseCode = "404",
                description = "organization.notFound",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public OrganizationResponse resubmit(
            @PathVariable UUID applicationId, @Valid @RequestBody OrganizationApplicationRequest request) {
        return organizationService.resubmitApplication(currentUserProvider.currentUserId(), applicationId, request);
    }
}
