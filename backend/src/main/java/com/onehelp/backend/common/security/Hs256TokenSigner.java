package com.onehelp.backend.common.security;

import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Component;

/**
 * HS256 {@link TokenSigner} (ADR-2), keyed from {@link JwtProperties#getSecret()}
 * (environment-sourced, never committed).
 */
@Component
public class Hs256TokenSigner implements TokenSigner {

    private final SecretKey key;

    public Hs256TokenSigner(JwtProperties jwtProperties) {
        this.key = Keys.hmacShaKeyFor(jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public String sign(Map<String, Object> claims, Instant issuedAt, Instant expiresAt) {
        return Jwts.builder()
                .claims(claims)
                .issuedAt(Date.from(issuedAt))
                .expiration(Date.from(expiresAt))
                .signWith(key)
                .compact();
    }

    @Override
    public Map<String, Object> verify(String token) {
        try {
            return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
        } catch (JwtException | IllegalArgumentException ex) {
            throw new InvalidTokenException("Access token failed verification", ex);
        }
    }
}
