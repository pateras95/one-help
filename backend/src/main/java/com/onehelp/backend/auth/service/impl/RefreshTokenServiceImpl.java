package com.onehelp.backend.auth.service.impl;

import com.onehelp.backend.auth.entity.RefreshToken;
import com.onehelp.backend.auth.repository.RefreshTokenRepository;
import com.onehelp.backend.auth.service.RefreshTokenService;
import com.onehelp.backend.common.security.JwtProperties;
import com.onehelp.backend.users.entity.User;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** SHA-256 hashing (database-schema.md § refresh_tokens) — fast and preimage-resistant,
 * appropriate for an already-high-entropy 256-bit random value (unlike a low-entropy
 * user password, which needs a slow adaptive hash such as BCrypt instead). */
@Service
public class RefreshTokenServiceImpl implements RefreshTokenService {

    private static final int TOKEN_BYTES = 32;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtProperties jwtProperties;

    public RefreshTokenServiceImpl(RefreshTokenRepository refreshTokenRepository, JwtProperties jwtProperties) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtProperties = jwtProperties;
    }

    @Override
    @Transactional
    public IssuedRefreshToken issue(User user, String userAgent) {
        String raw = generateRawToken();
        Instant now = Instant.now();
        RefreshToken entity = new RefreshToken(
                UUID.randomUUID(), user, hash(raw), now, now.plusSeconds(ttlSeconds()));
        entity.setUserAgent(userAgent);
        entity = refreshTokenRepository.save(entity);
        return new IssuedRefreshToken(raw, entity);
    }

    @Override
    @Transactional
    public IssuedRefreshToken rotate(RefreshToken previous, String userAgent) {
        IssuedRefreshToken next = issue(previous.getUser(), userAgent);
        previous.setRevokedAt(Instant.now());
        previous.setReplacedByToken(next.entity());
        refreshTokenRepository.save(previous);
        return next;
    }

    @Override
    @Transactional
    public void revoke(RefreshToken token) {
        token.setRevokedAt(Instant.now());
        refreshTokenRepository.save(token);
    }

    @Override
    @Transactional
    public void revokeAllForUser(User user) {
        refreshTokenRepository.revokeAllActiveForUser(user, Instant.now());
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<RefreshToken> findByRawToken(String rawToken) {
        return refreshTokenRepository.findByTokenHash(hash(rawToken));
    }

    private long ttlSeconds() {
        return jwtProperties.getRefreshTokenTtlDays() * 24L * 60L * 60L;
    }

    private static String generateRawToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 must always be available on the JVM", ex);
        }
    }
}
