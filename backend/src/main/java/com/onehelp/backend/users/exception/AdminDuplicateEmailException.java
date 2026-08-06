package com.onehelp.backend.users.exception;

import com.onehelp.backend.common.exception.DomainException;
import org.springframework.http.HttpStatus;

/**
 * {@code admin.duplicateEmail}, 409 — an administrator edited a user's email to one
 * already used by a different account. Distinct from {@code auth.duplicateEmail}
 * (registration) per error-contract.md's already-approved
 * {@code UpdateUserRequest}/admin-edit design — the two contexts keep separate codes
 * even though the underlying rule (email must be unique) is the same one.
 */
public class AdminDuplicateEmailException extends DomainException {
    public AdminDuplicateEmailException() {
        super("admin.duplicateEmail", HttpStatus.CONFLICT, "An account with this email already exists.");
    }
}
