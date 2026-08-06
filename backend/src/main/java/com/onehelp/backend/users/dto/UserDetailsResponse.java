package com.onehelp.backend.users.dto;

import com.onehelp.backend.users.entity.AccountStatus;
import com.onehelp.backend.users.entity.UserRole;
import java.time.Instant;
import java.util.UUID;

/**
 * Sensitivity: admin. `GET /admin/users/{id}`. Adds {@code updatedAt}/{@code version}
 * (needed by the edit UI's optimistic-lock awareness) to {@link UserSummaryResponse}'s
 * fields.
 *
 * <p>Deliberately has <b>no organization field</b> — organizer organization data does
 * not exist in the backend yet (the Organizations phase owns it). Adding even a
 * nullable placeholder here would imply a shape this phase cannot actually back;
 * omitted entirely rather than fabricated.
 */
public record UserDetailsResponse(
        UUID id,
        String firstName,
        String lastName,
        String email,
        UserRole role,
        AccountStatus status,
        String avatarInitials,
        String localePreference,
        Instant createdAt,
        Instant updatedAt,
        Long version) {}
