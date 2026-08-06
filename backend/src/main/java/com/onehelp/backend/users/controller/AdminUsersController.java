package com.onehelp.backend.users.controller;

import com.onehelp.backend.common.security.CurrentUserProvider;
import com.onehelp.backend.common.web.ApiErrorResponse;
import com.onehelp.backend.common.web.PageResponse;
import com.onehelp.backend.users.dto.UpdateAdminUserRequest;
import com.onehelp.backend.users.dto.UserDetailsResponse;
import com.onehelp.backend.users.dto.UserStatusChangeResponse;
import com.onehelp.backend.users.dto.UserSummaryResponse;
import com.onehelp.backend.users.entity.AccountStatus;
import com.onehelp.backend.users.entity.UserRole;
import com.onehelp.backend.users.service.UserService;
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
 * Administrator-only user management. {@code @PreAuthorize} at the class level
 * (Spring Security 6+ supports this) so every method here requires the
 * {@code ADMINISTRATOR} role without repeating the annotation five times — a
 * non-administrator gets {@code common.forbidden} (403) before any method body or
 * repository query ever runs; an unauthenticated caller gets
 * {@code common.unauthenticated} (401) from the filter chain first.
 *
 * <p>There is deliberately no endpoint here that changes {@code role} — no generic
 * role-change path exists anywhere in this API (see the phase report's § Permanent
 * Role Rules).
 */
@RestController
@RequestMapping("/api/v1/admin/users")
@PreAuthorize("hasRole('ADMINISTRATOR')")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Admin Users", description = "Administrator-only user directory and account management")
public class AdminUsersController {

    private final UserService userService;
    private final CurrentUserProvider currentUserProvider;

    public AdminUsersController(UserService userService, CurrentUserProvider currentUserProvider) {
        this.userService = userService;
        this.currentUserProvider = currentUserProvider;
    }

    @GetMapping
    @Operation(
            summary = "List users",
            description = "Paginated, with optional free-text search (first/last name, email — "
                    + "accent- and case-insensitive) and role/status filters. Page size is capped at 100.")
    @ApiResponses({
        @ApiResponse(responseCode = "200"),
        @ApiResponse(
                responseCode = "403",
                description = "common.forbidden",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public PageResponse<UserSummaryResponse> list(
            @Parameter(description = "Matches first name, last name, or email") @RequestParam(required = false)
                    String search,
            @RequestParam(required = false) UserRole role,
            @RequestParam(required = false) AccountStatus status,
            @PageableDefault(size = 20) @SortDefault(sort = "createdAt", direction = Sort.Direction.DESC)
                    Pageable pageable) {
        return userService.listUsers(search, role, status, pageable);
    }

    @GetMapping("/{userId}")
    @Operation(summary = "Get a user's full administrative detail")
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                content = @Content(schema = @Schema(implementation = UserDetailsResponse.class))),
        @ApiResponse(
                responseCode = "404",
                description = "users.notFound",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public UserDetailsResponse details(@PathVariable UUID userId) {
        return userService.getUserDetails(userId);
    }

    @PatchMapping("/{userId}")
    @Operation(
            summary = "Edit a user's profile",
            description = "firstName/lastName/email/localePreference only — role, status, and every other "
                    + "field are never editable here.")
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                content = @Content(schema = @Schema(implementation = UserDetailsResponse.class))),
        @ApiResponse(
                responseCode = "404",
                description = "users.notFound",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
        @ApiResponse(
                responseCode = "409",
                description = "admin.duplicateEmail",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
        @ApiResponse(
                responseCode = "422",
                description = "validation.failed",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public UserDetailsResponse update(@PathVariable UUID userId, @Valid @RequestBody UpdateAdminUserRequest request) {
        return userService.updateAdminUser(userId, request);
    }

    @PostMapping("/{userId}/suspend")
    @Operation(
            summary = "Suspend a user",
            description = "Revokes every active refresh token for the target, in the same transaction as the "
                    + "status change. Idempotent — suspending an already-suspended user succeeds and returns "
                    + "the current state, no error.")
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                content = @Content(schema = @Schema(implementation = UserStatusChangeResponse.class))),
        @ApiResponse(
                responseCode = "400",
                description = "users.selfSuspensionNotAllowed",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
        @ApiResponse(
                responseCode = "404",
                description = "users.notFound",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public UserStatusChangeResponse suspend(@PathVariable UUID userId) {
        return userService.suspendUser(currentUserProvider.currentUserId(), userId);
    }

    @PostMapping("/{userId}/reactivate")
    @Operation(
            summary = "Reactivate a suspended user",
            description = "Does not un-revoke any refresh token — the user must log in again from scratch. "
                    + "Idempotent — reactivating an already-active user succeeds and returns the current state.")
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                content = @Content(schema = @Schema(implementation = UserStatusChangeResponse.class))),
        @ApiResponse(
                responseCode = "404",
                description = "users.notFound",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public UserStatusChangeResponse reactivate(@PathVariable UUID userId) {
        return userService.reactivateUser(userId);
    }
}
