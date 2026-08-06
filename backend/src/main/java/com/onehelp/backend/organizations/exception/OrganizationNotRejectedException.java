package com.onehelp.backend.organizations.exception;

import com.onehelp.backend.common.exception.DomainException;
import org.springframework.http.HttpStatus;

/** {@code organization.notRejected}, 400 — resubmission is only valid from
 * {@code REJECTED}. */
public class OrganizationNotRejectedException extends DomainException {
    public OrganizationNotRejectedException() {
        super("organization.notRejected", HttpStatus.BAD_REQUEST, "This application has not been rejected.");
    }
}
