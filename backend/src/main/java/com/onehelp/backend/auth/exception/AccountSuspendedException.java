package com.onehelp.backend.auth.exception;

import com.onehelp.backend.common.exception.DomainException;
import org.springframework.http.HttpStatus;

/** {@code auth.accountSuspended}, 403 — per error-contract.md. Checked before issuing
 * any token, on both login and refresh. */
public class AccountSuspendedException extends DomainException {
    public AccountSuspendedException() {
        super("auth.accountSuspended", HttpStatus.FORBIDDEN, "This account has been suspended.");
    }
}
