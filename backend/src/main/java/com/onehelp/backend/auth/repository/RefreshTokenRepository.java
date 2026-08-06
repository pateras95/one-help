package com.onehelp.backend.auth.repository;

import com.onehelp.backend.auth.entity.RefreshToken;
import com.onehelp.backend.users.entity.User;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    List<RefreshToken> findByUserAndRevokedAtIsNull(User user);

    /**
     * Bulk-revokes every currently-active refresh token for a user in one statement —
     * used by the forced-session-invalidation rule (ADR-3): admin suspension,
     * organizer demotion, and organization approval each revoke all of the affected
     * user's refresh tokens inside their own transaction.
     */
    @Modifying
    @Query("update RefreshToken r set r.revokedAt = :revokedAt "
            + "where r.user = :user and r.revokedAt is null")
    int revokeAllActiveForUser(@Param("user") User user, @Param("revokedAt") Instant revokedAt);
}
