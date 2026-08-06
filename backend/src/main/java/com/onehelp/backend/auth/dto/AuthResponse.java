package com.onehelp.backend.auth.dto;

import com.onehelp.backend.users.dto.CurrentUserResponse;

/**
 * The refresh token is deliberately never a field here — it is delivered exclusively
 * via an {@code HttpOnly}/{@code Secure}/{@code SameSite=Strict} {@code Set-Cookie}
 * scoped to {@code /api/v1/auth/refresh} (ADR-1, dto-catalogue.md).
 */
public record AuthResponse(String accessToken, long expiresIn, CurrentUserResponse user) {}
