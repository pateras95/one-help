package com.onehelp.backend.auth.dto;

import com.onehelp.backend.users.dto.CurrentUserResponse;

/**
 * The refresh token is deliberately never a field here — it is delivered exclusively
 * via an {@code HttpOnly}/{@code Secure}/{@code SameSite=Strict} {@code Set-Cookie}
 * scoped to {@code /api/v1/auth} (ADR-1, dto-catalogue.md; the cookie path covers both
 * {@code /auth/refresh} and {@code /auth/logout} — see {@code AuthController}).
 */
public record AuthResponse(String accessToken, long expiresIn, CurrentUserResponse user) {}
