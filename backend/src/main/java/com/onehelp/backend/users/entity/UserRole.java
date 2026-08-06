package com.onehelp.backend.users.entity;

/**
 * The product supports exactly these three roles, permanently — there is no
 * MODERATOR role, now or in any future phase (see
 * docs/backend-architecture/architecture-decisions.md, ADR-18).
 */
public enum UserRole {
    VOLUNTEER,
    ORGANIZER,
    ADMINISTRATOR
}
