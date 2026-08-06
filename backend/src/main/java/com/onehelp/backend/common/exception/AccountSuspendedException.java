package com.onehelp.backend.common.exception;

import org.springframework.http.HttpStatus;

/**
 * {@code auth.accountSuspended}, 403 — per error-contract.md. Lives in {@code common}
 * (not {@code auth}, where it was first introduced) because both the {@code auth}
 * domain (login, refresh, `/auth/me`) and the {@code users} domain (`/users/me`) throw
 * it — a suspended account is rejected identically by every endpoint that re-reads
 * live account state, regardless of which domain owns that endpoint.
 */
public class AccountSuspendedException extends DomainException {
    public AccountSuspendedException() {
        super("auth.accountSuspended", HttpStatus.FORBIDDEN, "This account has been suspended.");
    }
}
