package com.onehelp.backend.organizations.exception;

import com.onehelp.backend.common.exception.DomainException;
import org.springframework.http.HttpStatus;

/**
 * {@code organizer.organizationMissing}, 404 — a defensive check: under this design,
 * a user with role {@code ORGANIZER} always has exactly one organization row (they are
 * granted the role and the row is created/kept in the same transaction). This should
 * never actually trigger; it exists so a data inconsistency fails loudly with a clear
 * code instead of a null-pointer-shaped 500.
 */
public class OrganizerOrganizationMissingException extends DomainException {
    public OrganizerOrganizationMissingException() {
        super(
                "organizer.organizationMissing",
                HttpStatus.NOT_FOUND,
                "No organization was found for this organizer account.");
    }
}
