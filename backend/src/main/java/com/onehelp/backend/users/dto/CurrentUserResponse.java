package com.onehelp.backend.users.dto;

import com.onehelp.backend.users.entity.AccountStatus;
import com.onehelp.backend.users.entity.UserRole;
import java.time.Instant;
import java.util.UUID;

/** Sensitivity: self. Maps {@code User}, per dto-catalogue.md. */
public record CurrentUserResponse(
        UUID id,
        String firstName,
        String lastName,
        String email,
        UserRole role,
        AccountStatus status,
        String avatarInitials,
        String localePreference,
        Instant createdAt) {}
