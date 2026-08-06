package com.onehelp.backend.users.controller;

import com.onehelp.backend.common.security.CurrentUserProvider;
import com.onehelp.backend.common.web.ApiErrorResponse;
import com.onehelp.backend.users.dto.CurrentUserResponse;
import com.onehelp.backend.users.dto.UpdateCurrentUserRequest;
import com.onehelp.backend.users.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The canonical current-user profile endpoints. Distinct from
 * {@code GET /api/v1/auth/me} (kept, unchanged, for session/authentication
 * restoration — see {@code AuthController}): both resolve to the exact same
 * {@link UserService#getCurrentUser} implementation, so the two contracts can never
 * drift apart, but this controller is the one that also owns self-editing.
 */
@RestController
@RequestMapping("/api/v1/users")
@Tag(name = "Users", description = "Current-user profile")
public class UsersController {

    private final UserService userService;
    private final CurrentUserProvider currentUserProvider;

    public UsersController(UserService userService, CurrentUserProvider currentUserProvider) {
        this.userService = userService;
        this.currentUserProvider = currentUserProvider;
    }

    @GetMapping("/me")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Get the authenticated user's own profile")
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                content = @Content(schema = @Schema(implementation = CurrentUserResponse.class))),
        @ApiResponse(
                responseCode = "401",
                description = "common.unauthenticated",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
        @ApiResponse(
                responseCode = "403",
                description = "auth.accountSuspended",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public CurrentUserResponse me() {
        return userService.getCurrentUser(currentUserProvider.currentUserId());
    }

    @PatchMapping("/me")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(
            summary = "Edit the authenticated user's own profile",
            description = "firstName/lastName/localePreference only — role, status, email, and every other "
                    + "field are never editable here (mass-assignment prevention).")
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                content = @Content(schema = @Schema(implementation = CurrentUserResponse.class))),
        @ApiResponse(
                responseCode = "422",
                description = "validation.failed",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
        @ApiResponse(
                responseCode = "403",
                description = "auth.accountSuspended",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public CurrentUserResponse updateMe(@Valid @RequestBody UpdateCurrentUserRequest request) {
        return userService.updateCurrentUser(currentUserProvider.currentUserId(), request);
    }
}
