package com.onehelp.backend.users.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Self-editable profile fields only (`PATCH /users/me`). Deliberately excludes
 * {@code email} — self-service email changes are not approved by the current
 * architecture (security-and-authentication.md never designs a verified-email-change
 * flow) — and, separately, {@code role}/{@code status}/{@code passwordHash}/
 * {@code id}/{@code createdAt}/{@code version} are never fields on any
 * client-submittable DTO at all (mass-assignment prevention).
 */
public record UpdateCurrentUserRequest(
        @NotBlank @Size(max = 100) String firstName,
        @NotBlank @Size(max = 100) String lastName,
        @Pattern(regexp = "el|en", message = "localePreference must be 'el' or 'en'") String localePreference) {}
