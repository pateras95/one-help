package com.onehelp.backend.organizations.controller;

import com.onehelp.backend.common.security.CurrentUserProvider;
import com.onehelp.backend.common.web.ApiErrorResponse;
import com.onehelp.backend.organizations.dto.OrganizationResponse;
import com.onehelp.backend.organizations.dto.OrganizerDemotionResponse;
import com.onehelp.backend.organizations.dto.UpdateOrganizationRequest;
import com.onehelp.backend.organizations.service.OrganizationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The organizer's own organization — self-view, self-edit, and self-demotion.
 * {@code ORGANIZER}-only at the class level: an organization id is never accepted from
 * the client here — the caller's own organization is always resolved from the
 * authenticated principal (security-and-authentication.md's "direct ids never
 * establish ownership" rule, applied by construction — there is no id to supply).
 */
@RestController
@RequestMapping("/api/v1/organizations")
@PreAuthorize("hasRole('ORGANIZER')")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Organizations", description = "The organizer's own organization")
public class OrganizationController {

    private final OrganizationService organizationService;
    private final CurrentUserProvider currentUserProvider;

    public OrganizationController(OrganizationService organizationService, CurrentUserProvider currentUserProvider) {
        this.organizationService = organizationService;
        this.currentUserProvider = currentUserProvider;
    }

    @GetMapping("/me")
    @Operation(summary = "Get the authenticated organizer's own organization")
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

    @PatchMapping("/me")
    @Operation(
            summary = "Edit the authenticated organizer's own organization",
            description = "Allowed only while the organization is APPROVED or SUSPENDED. Status, ownership, "
                    + "and review metadata are never editable here.")
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                content = @Content(schema = @Schema(implementation = OrganizationResponse.class))),
        @ApiResponse(
                responseCode = "400",
                description = "organization.invalidTransition",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
        @ApiResponse(
                responseCode = "409",
                description = "organization.duplicateName | common.staleWrite",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
        @ApiResponse(
                responseCode = "422",
                description = "validation.failed",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public OrganizationResponse updateMine(@Valid @RequestBody UpdateOrganizationRequest request) {
        return organizationService.updateOwnOrganization(currentUserProvider.currentUserId(), request);
    }

    @PostMapping("/me/demote")
    @Operation(
            summary = "Step down as organizer",
            description = "Deletes the organization, resets the caller's role to VOLUNTEER, and revokes every "
                    + "active refresh token. The caller must log in again; a new application may be submitted "
                    + "from scratch at any time afterward.")
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                content = @Content(schema = @Schema(implementation = OrganizerDemotionResponse.class)))
    })
    public OrganizerDemotionResponse demote() {
        return organizationService.selfDemote(currentUserProvider.currentUserId());
    }
}
