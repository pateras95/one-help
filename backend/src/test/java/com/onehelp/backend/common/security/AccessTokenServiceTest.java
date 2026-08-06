package com.onehelp.backend.common.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.onehelp.backend.users.entity.AccountStatus;
import com.onehelp.backend.users.entity.User;
import com.onehelp.backend.users.entity.UserRole;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * Pure unit tests (no Spring context, no database) of the access-token round trip:
 * {@link Hs256TokenSigner} signs, {@link AccessTokenService} builds the OneHelp claim
 * shape and reads it back, and a tampered/foreign-key token is rejected.
 */
class AccessTokenServiceTest {

    private static AccessTokenService newService(String secret) {
        JwtProperties properties = new JwtProperties();
        properties.setSecret(secret);
        properties.setAccessTokenTtlMinutes(15);
        return new AccessTokenService(new Hs256TokenSigner(properties), properties);
    }

    private static User user(UUID id, UserRole role, AccountStatus status) {
        User user = new User(id, "Test", "User", "test@onehelp.local", "hash");
        user.setRole(role);
        user.setStatus(status);
        return user;
    }

    @Test
    void issuedTokenRoundTripsToTheOriginalClaims() {
        AccessTokenService service = newService("a".repeat(32));
        UUID userId = UUID.randomUUID();
        User user = user(userId, UserRole.ORGANIZER, AccountStatus.ACTIVE);

        AccessTokenService.IssuedAccessToken issued = service.issueFor(user);
        AccessTokenClaims claims = service.parse(issued.token());

        assertThat(issued.expiresInSeconds()).isEqualTo(15 * 60L);
        assertThat(claims.userId()).isEqualTo(userId);
        assertThat(claims.role()).isEqualTo(UserRole.ORGANIZER);
        assertThat(claims.status()).isEqualTo(AccountStatus.ACTIVE);
    }

    @Test
    void tokenSignedWithADifferentSecretIsRejected() {
        AccessTokenService issuer = newService("a".repeat(32));
        AccessTokenService verifier = newService("b".repeat(32));
        String token = issuer.issueFor(user(UUID.randomUUID(), UserRole.VOLUNTEER, AccountStatus.ACTIVE))
                .token();

        assertThatThrownBy(() -> verifier.parse(token)).isInstanceOf(TokenSigner.InvalidTokenException.class);
    }

    @Test
    void malformedTokenIsRejected() {
        AccessTokenService service = newService("a".repeat(32));

        assertThatThrownBy(() -> service.parse("not-a-jwt")).isInstanceOf(TokenSigner.InvalidTokenException.class);
    }
}
