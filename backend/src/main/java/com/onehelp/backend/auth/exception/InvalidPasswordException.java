package com.onehelp.backend.auth.exception;

import com.onehelp.backend.common.exception.DomainException;
import org.springframework.http.HttpStatus;

/** {@code auth.invalidPassword}, 401 — per error-contract.md. */
public class InvalidPasswordException extends DomainException {
    public InvalidPasswordException() {
        super("auth.invalidPassword", HttpStatus.UNAUTHORIZED, "Invalid email or password.");
    }
}
