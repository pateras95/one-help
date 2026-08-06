package com.onehelp.backend.auth.service;

import com.onehelp.backend.auth.entity.RefreshToken;
import com.onehelp.backend.users.entity.User;
import java.util.Optional;

/**
 * Opaque refresh-token lifecycle (ADR-1): generation, SHA-256 hashing (only the hash
 * is ever persisted — the raw value exists only in the response cookie), rotation,
 * and revocation.
 */
public interface RefreshTokenService {

    IssuedRefreshToken issue(User user, String userAgent);

    /** Rotates {@code previous}: revokes it, links it to a freshly-issued replacement. */
    IssuedRefreshToken rotate(RefreshToken previous, String userAgent);

    void revoke(RefreshToken token);

    /** Bulk-revokes every active token for a user — used on reuse detection (ADR-1). */
    void revokeAllForUser(User user);

    Optional<RefreshToken> findByRawToken(String rawToken);

    record IssuedRefreshToken(String rawToken, RefreshToken entity) {}
}
