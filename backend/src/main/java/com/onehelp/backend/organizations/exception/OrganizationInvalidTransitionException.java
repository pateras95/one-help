package com.onehelp.backend.organizations.exception;

import com.onehelp.backend.common.exception.DomainException;
import org.springframework.http.HttpStatus;

/**
 * {@code organization.invalidTransition}, 400 — the requested status change is not
 * legal from the organization's current status
 * (domain-model-and-state-machines.md § OrganizationStatus's transition table), e.g.
 * approving/rejecting an application that is not {@code PENDING}, or suspending one
 * that has never been {@code APPROVED}.
 */
public class OrganizationInvalidTransitionException extends DomainException {
    public OrganizationInvalidTransitionException() {
        super("organization.invalidTransition", HttpStatus.BAD_REQUEST, "This status change is not allowed right now.");
    }
}
