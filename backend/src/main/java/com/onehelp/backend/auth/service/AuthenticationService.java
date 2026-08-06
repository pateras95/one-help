package com.onehelp.backend.auth.service;

import com.onehelp.backend.auth.dto.LoginRequest;
import com.onehelp.backend.auth.dto.RegisterRequest;
import com.onehelp.backend.users.dto.CurrentUserResponse;
import java.util.UUID;

public interface AuthenticationService {

    IssuedSession register(RegisterRequest request, String userAgent);

    IssuedSession login(LoginRequest request, String userAgent);

    /** @throws com.onehelp.backend.auth.exception.InvalidSessionException on a missing,
     *     unrecognized, expired, or reused refresh token */
    IssuedSession refresh(String rawRefreshToken, String userAgent);

    /** Revokes {@code rawRefreshToken} only if it belongs to {@code currentUserId} —
     * silently a no-op otherwise (never discloses whether a token exists for someone
     * else). */
    void logout(String rawRefreshToken, UUID currentUserId);

    CurrentUserResponse getCurrentUser(UUID currentUserId);

    /**
     * The refresh token is returned here (not in {@link com.onehelp.backend.auth.dto.AuthResponse})
     * so the controller — not the service — is the one place responsible for turning
     * it into a {@code Set-Cookie} header (ADR-1).
     */
    record IssuedSession(String accessToken, long expiresInSeconds, String refreshToken, CurrentUserResponse user) {}
}
