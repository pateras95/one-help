package com.onehelp.backend.auth.exception;

import com.onehelp.backend.common.exception.DomainException;
import org.springframework.http.HttpStatus;

/** {@code auth.invalidSession}, 401 — per error-contract.md. Covers a missing,
 * unrecognized, expired, or reused (already-rotated) refresh token. */
public class InvalidSessionException extends DomainException {
    public InvalidSessionException() {
        super("auth.invalidSession", HttpStatus.UNAUTHORIZED, "Your session has expired. Please log in again.");
    }
}
