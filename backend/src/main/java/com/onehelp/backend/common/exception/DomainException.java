package com.onehelp.backend.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Base type for every domain-level business-rule violation (e.g. capacity full, an
 * invalid state transition, a duplicate/conflicting resource). Each concrete domain
 * module defines its own specific subclasses as that module is implemented — none
 * exist yet in this foundation phase.
 *
 * <p>{@code code} must be the stable, dot-namespaced, machine-readable value from
 * docs/backend-architecture/error-contract.md (e.g. {@code participation.actionFull}).
 * {@code message} must always be a safe, generic fallback — never an internal detail.
 */
public abstract class DomainException extends RuntimeException {

    private final String code;
    private final HttpStatus status;

    protected DomainException(String code, HttpStatus status, String message) {
        super(message);
        this.code = code;
        this.status = status;
    }

    public String getCode() {
        return code;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
