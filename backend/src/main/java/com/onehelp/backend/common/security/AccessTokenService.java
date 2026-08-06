package com.onehelp.backend.common.security;

import com.onehelp.backend.users.entity.AccountStatus;
import com.onehelp.backend.users.entity.User;
import com.onehelp.backend.users.entity.UserRole;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Builds and reads the OneHelp access-token claim shape (ADR-1): {@code sub} (user
 * id), {@code role}, {@code status}, {@code jti}, plus the standard {@code iat}/
 * {@code exp} handled by {@link TokenSigner}.
 */
@Service
public class AccessTokenService {

    private static final String CLAIM_ROLE = "role";
    private static final String CLAIM_STATUS = "status";

    private final TokenSigner tokenSigner;
    private final JwtProperties jwtProperties;

    public AccessTokenService(TokenSigner tokenSigner, JwtProperties jwtProperties) {
        this.tokenSigner = tokenSigner;
        this.jwtProperties = jwtProperties;
    }

    /** @return the signed access token and its TTL in seconds. */
    public IssuedAccessToken issueFor(User user) {
        Instant issuedAt = Instant.now();
        Instant expiresAt = issuedAt.plusSeconds(ttlSeconds());
        Map<String, Object> claims = Map.of(
                "sub", user.getId().toString(),
                CLAIM_ROLE, user.getRole().name(),
                CLAIM_STATUS, user.getStatus().name(),
                "jti", UUID.randomUUID().toString());
        String token = tokenSigner.sign(claims, issuedAt, expiresAt);
        return new IssuedAccessToken(token, ttlSeconds());
    }

    /** @throws TokenSigner.InvalidTokenException if the token is invalid, malformed, or expired */
    public AccessTokenClaims parse(String token) {
        Map<String, Object> claims = tokenSigner.verify(token);
        UUID userId = UUID.fromString((String) claims.get("sub"));
        UserRole role = UserRole.valueOf((String) claims.get(CLAIM_ROLE));
        AccountStatus status = AccountStatus.valueOf((String) claims.get(CLAIM_STATUS));
        return new AccessTokenClaims(userId, role, status);
    }

    public long ttlSeconds() {
        return jwtProperties.getAccessTokenTtlMinutes() * 60L;
    }

    public record IssuedAccessToken(String token, long expiresInSeconds) {}
}
