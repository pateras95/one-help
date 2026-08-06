package com.onehelp.backend.common.security;

import java.time.Instant;
import java.util.Map;

/**
 * Signs and verifies compact tokens. HS256 is the only implementation for the MVP
 * (ADR-2) — isolated behind this interface so a future RS256 implementation can
 * replace it without touching any call site.
 */
public interface TokenSigner {

    /**
     * @param claims claim name/value pairs to embed (e.g. {@code sub}, {@code role})
     * @param issuedAt token issuance instant
     * @param expiresAt token expiry instant
     * @return a signed, compact token string
     */
    String sign(Map<String, Object> claims, Instant issuedAt, Instant expiresAt);

    /**
     * @param token a compact token string
     * @return the verified claims
     * @throws InvalidTokenException if the signature is invalid, the token is
     *     malformed, or the token has expired
     */
    Map<String, Object> verify(String token);

    /** Thrown when a token fails signature verification, is malformed, or has expired. */
    class InvalidTokenException extends RuntimeException {
        public InvalidTokenException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
