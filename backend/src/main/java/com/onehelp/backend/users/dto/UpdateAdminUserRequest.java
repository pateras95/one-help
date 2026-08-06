package com.onehelp.backend.users.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Fields an administrator may edit on another user's account (`PATCH
 * /admin/users/{id}`). {@code email} is included here — unlike
 * {@link UpdateCurrentUserRequest} — matching the already-approved
 * {@code UpdateUserRequest} shape in dto-catalogue.md and the existing frontend admin
 * edit dialog's actual fields; {@code localePreference} is additionally accepted
 * (optional) per this phase's own brief, though no current UI sends it yet.
 *
 * <p>{@code role} is never a field on this DTO — mass-assignment prevention; there is
 * no generic role-change path anywhere in this API (organizer promotion only happens
 * via the future Organizations phase's approval flow, demotion only via its own
 * dedicated cascade, neither of which exists yet).
 */
public record UpdateAdminUserRequest(
        @NotBlank @Size(max = 100) String firstName,
        @NotBlank @Size(max = 100) String lastName,
        @NotBlank @Email @Size(max = 255) String email,
        @Pattern(regexp = "el|en", message = "localePreference must be 'el' or 'en'") String localePreference) {}
