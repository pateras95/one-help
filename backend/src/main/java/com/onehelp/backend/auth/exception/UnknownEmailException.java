package com.onehelp.backend.auth.exception;

import com.onehelp.backend.common.exception.DomainException;
import org.springframework.http.HttpStatus;

/** {@code auth.unknownEmail}, 401 — per error-contract.md. */
public class UnknownEmailException extends DomainException {
    public UnknownEmailException() {
        super("auth.unknownEmail", HttpStatus.UNAUTHORIZED, "Invalid email or password.");
    }
}
