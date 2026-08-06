package com.onehelp.backend.auth.controller;

import com.onehelp.backend.auth.dto.AuthResponse;
import com.onehelp.backend.auth.dto.LoginRequest;
import com.onehelp.backend.auth.dto.RegisterRequest;
import com.onehelp.backend.auth.service.AuthenticationService;
import com.onehelp.backend.auth.service.AuthenticationService.IssuedSession;
import com.onehelp.backend.common.security.CurrentUserProvider;
import com.onehelp.backend.common.security.JwtProperties;
import com.onehelp.backend.common.web.ApiErrorResponse;
import com.onehelp.backend.users.dto.CurrentUserResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Registration, login, refresh, logout, and current-user — the authentication
 * foundation (ADR-1). Every response follows dto-catalogue.md exactly: the refresh
 * token is never a JSON field, only a {@code Set-Cookie} scoped to
 * {@link #REFRESH_COOKIE_PATH} (this whole controller) so both {@code /refresh} and
 * {@code /logout} receive it from the browser.
 */
@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication", description = "Registration, login, refresh token rotation, logout, current user")
public class AuthController {

    private static final String REFRESH_COOKIE_NAME = "refreshToken";
    /**
     * Scoped to the whole {@code auth} controller, not just {@code /refresh} —
     * browsers only ever attach a cookie to requests whose path starts with the
     * cookie's {@code Path} attribute. A narrower {@code /api/v1/auth/refresh} scope
     * means the browser never sends the cookie to {@code POST /api/v1/auth/logout} at
     * all, so logout could never revoke it. {@code /api/v1/auth} is still narrow
     * enough that the cookie is never sent to {@code /register}, {@code /login}, or
     * {@code /me} (none of which need it), while covering both endpoints that do.
     */
    private static final String REFRESH_COOKIE_PATH = "/api/v1/auth";
    private static final String USER_AGENT_HEADER = "User-Agent";

    private final AuthenticationService authenticationService;
    private final CurrentUserProvider currentUserProvider;
    private final JwtProperties jwtProperties;

    @Value("${onehelp.security.refresh-cookie-secure:true}")
    private boolean refreshCookieSecure;

    public AuthController(
            AuthenticationService authenticationService,
            CurrentUserProvider currentUserProvider,
            JwtProperties jwtProperties) {
        this.authenticationService = authenticationService;
        this.currentUserProvider = currentUserProvider;
        this.jwtProperties = jwtProperties;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(
            summary = "Register a new volunteer account",
            description = "Always creates a VOLUNTEER — role is never accepted from the request body. "
                    + "Auto-logs in on success, exactly like login.",
            requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    content = @Content(examples = @ExampleObject(value = "{"
                            + "\"firstName\":\"Δήμητρα\",\"lastName\":\"Παπαδοπούλου\","
                            + "\"email\":\"new.volunteer@example.com\",\"password\":\"Str0ngPass!\"}"))))
    @ApiResponses({
        @ApiResponse(
                responseCode = "201",
                description = "Account created and logged in",
                content = @Content(schema = @Schema(implementation = AuthResponse.class))),
        @ApiResponse(
                responseCode = "409",
                description = "auth.duplicateEmail",
                content = @Content(
                        schema = @Schema(implementation = ApiErrorResponse.class),
                        examples = @ExampleObject(value = "{\"status\":409,\"code\":\"auth.duplicateEmail\","
                                + "\"message\":\"An account with this email already exists.\"}"))),
        @ApiResponse(
                responseCode = "422",
                description = "validation.failed (e.g. password shorter than 8 characters)",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public AuthResponse register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        IssuedSession session = authenticationService.register(request, httpRequest.getHeader(USER_AGENT_HEADER));
        setRefreshCookie(httpResponse, session.refreshToken());
        return toAuthResponse(session);
    }

    @PostMapping("/login")
    @Operation(
            summary = "Log in with email and password",
            requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    content = @Content(examples = @ExampleObject(
                            value = "{\"email\":\"volunteer@onehelp.local\",\"password\":\"Volunteer123!\"}"))))
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                description = "Authenticated",
                content = @Content(schema = @Schema(implementation = AuthResponse.class))),
        @ApiResponse(
                responseCode = "401",
                description = "auth.unknownEmail or auth.invalidPassword",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
        @ApiResponse(
                responseCode = "403",
                description = "auth.accountSuspended",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public AuthResponse login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        IssuedSession session = authenticationService.login(request, httpRequest.getHeader(USER_AGENT_HEADER));
        setRefreshCookie(httpResponse, session.refreshToken());
        return toAuthResponse(session);
    }

    @PostMapping("/refresh")
    @Operation(
            summary = "Rotate the refresh token and issue a new access token",
            description = "Reads the refreshToken cookie — no request body. Every call revokes the "
                    + "presented token and issues a new one (rotation); presenting an already-revoked "
                    + "(reused) token revokes the caller's entire session chain. The cookie is scoped "
                    + "to /api/v1/auth, so it is also sent to /auth/logout.")
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                description = "Rotated",
                content = @Content(schema = @Schema(implementation = AuthResponse.class))),
        @ApiResponse(
                responseCode = "401",
                description = "auth.invalidSession (missing, unrecognized, expired, or reused token)",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
        @ApiResponse(
                responseCode = "403",
                description = "auth.accountSuspended",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public AuthResponse refresh(
            @CookieValue(name = REFRESH_COOKIE_NAME, required = false) String refreshToken,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        IssuedSession session = authenticationService.refresh(refreshToken, httpRequest.getHeader(USER_AGENT_HEADER));
        setRefreshCookie(httpResponse, session.refreshToken());
        return toAuthResponse(session);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Log out", description = "Revokes the presented refresh token; the caller must "
            + "be authenticated. An already-issued access token still expires naturally within its TTL.")
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Logged out"),
        @ApiResponse(
                responseCode = "401",
                description = "common.unauthenticated",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public void logout(
            @CookieValue(name = REFRESH_COOKIE_NAME, required = false) String refreshToken,
            HttpServletResponse httpResponse) {
        authenticationService.logout(refreshToken, currentUserProvider.currentUserId());
        clearRefreshCookie(httpResponse);
    }

    @GetMapping("/me")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Get the authenticated user's current profile")
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                description = "Current user",
                content = @Content(schema = @Schema(implementation = CurrentUserResponse.class))),
        @ApiResponse(
                responseCode = "401",
                description = "common.unauthenticated, or auth.invalidSession if the account no longer exists",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
        @ApiResponse(
                responseCode = "403",
                description = "auth.accountSuspended",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public CurrentUserResponse me() {
        return authenticationService.getCurrentUser(currentUserProvider.currentUserId());
    }

    private AuthResponse toAuthResponse(IssuedSession session) {
        return new AuthResponse(session.accessToken(), session.expiresInSeconds(), session.user());
    }

    private void setRefreshCookie(HttpServletResponse response, String rawToken) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE_NAME, rawToken)
                .httpOnly(true)
                .secure(refreshCookieSecure)
                .sameSite("Strict")
                .path(REFRESH_COOKIE_PATH)
                .maxAge(Duration.ofDays(jwtProperties.getRefreshTokenTtlDays()))
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearRefreshCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(refreshCookieSecure)
                .sameSite("Strict")
                .path(REFRESH_COOKIE_PATH)
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
