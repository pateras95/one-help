package com.onehelp.backend.common.security;

import java.util.UUID;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Resolves the authenticated principal's user id from the security context
 * ({@link JwtAuthenticationFilter} sets it as the token's {@code sub} claim). Every
 * future module's "act as myself only" checks (organizer ownership, admin
 * self-protection, etc. — security-and-authentication.md § Authorization
 * architecture) go through this one seam rather than each re-reading
 * {@code SecurityContextHolder} directly.
 */
@Component
public class CurrentUserProvider {

    /** @throws IllegalStateException if called where no authenticated principal exists */
    public UUID currentUserId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalStateException("No authenticated principal in the current security context");
        }
        return UUID.fromString(authentication.getName());
    }
}
