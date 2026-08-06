package com.onehelp.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Registration is always a volunteer — {@code role} is deliberately not a field on
 * this DTO (mass-assignment prevention, security-and-authentication.md), matching the
 * mock's own {@code register()} always hardcoding {@code ROLES.VOLUNTEER}.
 */
public record RegisterRequest(
        @NotBlank @Size(max = 100) String firstName,
        @NotBlank @Size(max = 100) String lastName,
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(min = 8) String password) {}
