package com.onehelp.backend.users.exception;

import com.onehelp.backend.common.exception.DomainException;
import org.springframework.http.HttpStatus;

/**
 * {@code users.selfSuspensionNotAllowed}, 400 — an administrator may never suspend
 * their own account. Checked before the target row is even loaded/locked
 * (transactions-and-integrity.md § User suspension).
 */
public class SelfSuspensionNotAllowedException extends DomainException {
    public SelfSuspensionNotAllowedException() {
        super("users.selfSuspensionNotAllowed", HttpStatus.BAD_REQUEST, "You cannot suspend your own account.");
    }
}
