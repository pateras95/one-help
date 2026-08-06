package com.onehelp.backend.auth.exception;

import com.onehelp.backend.common.exception.DomainException;
import org.springframework.http.HttpStatus;

/** {@code auth.duplicateEmail}, 409 — per error-contract.md. */
public class DuplicateEmailException extends DomainException {
    public DuplicateEmailException() {
        super("auth.duplicateEmail", HttpStatus.CONFLICT, "An account with this email already exists.");
    }
}
