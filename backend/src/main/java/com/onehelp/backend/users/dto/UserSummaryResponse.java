package com.onehelp.backend.users.dto;

import com.onehelp.backend.users.entity.AccountStatus;
import com.onehelp.backend.users.entity.UserRole;
import java.time.Instant;
import java.util.UUID;

/** Sensitivity: admin. One row of the admin user list (`GET /admin/users`). */
public record UserSummaryResponse(
        UUID id,
        String firstName,
        String lastName,
        String email,
        UserRole role,
        AccountStatus status,
        String avatarInitials,
        Instant createdAt) {}
