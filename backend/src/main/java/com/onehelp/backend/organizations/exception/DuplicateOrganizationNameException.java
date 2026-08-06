package com.onehelp.backend.organizations.exception;

import com.onehelp.backend.common.exception.DomainException;
import org.springframework.http.HttpStatus;

/** {@code organization.duplicateName}, 409 — a soft business check (no unique
 * constraint on name; error-contract.md), not a hard database rule. */
public class DuplicateOrganizationNameException extends DomainException {
    public DuplicateOrganizationNameException() {
        super("organization.duplicateName", HttpStatus.CONFLICT, "An organization with this name already exists.");
    }
}
