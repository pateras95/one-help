package com.onehelp.backend.organizations.exception;

import com.onehelp.backend.common.exception.DomainException;
import org.springframework.http.HttpStatus;

/**
 * {@code organization.alreadyHasOrganization}, 409 — the caller already has an
 * organization record (any status: pending, approved, rejected, or suspended). The
 * database's {@code UNIQUE (organizer_user_id)} constraint (ADR-4/ADR-15) is the final
 * guarantee against a race between two concurrent submissions; this exception is the
 * clean, translated message for the common (non-racing) case.
 */
public class OrganizationAlreadyExistsException extends DomainException {
    public OrganizationAlreadyExistsException() {
        super(
                "organization.alreadyHasOrganization",
                HttpStatus.CONFLICT,
                "You already have an organizer application or organization on file.");
    }
}
