package com.onehelp.backend.users.entity;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/**
 * Proves the backend {@code UserRole} enum contains exactly the three supported
 * roles and no more — in particular, no {@code MODERATOR} value (ADR-18). Pure unit
 * test, no Spring context, no database.
 */
class UserRoleTest {

    @Test
    void containsExactlyTheThreeSupportedRoles() {
        assertThat(UserRole.values())
                .extracting(Enum::name)
                .containsExactlyInAnyOrder("VOLUNTEER", "ORGANIZER", "ADMINISTRATOR");
    }

    @Test
    void hasNoModeratorValue() {
        assertThat(UserRole.values()).extracting(Enum::name).doesNotContain("MODERATOR");
    }
}
