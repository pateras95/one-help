package com.onehelp.backend.organizations.exception;

import com.onehelp.backend.common.exception.DomainException;
import org.springframework.http.HttpStatus;

/** {@code organization.notFound}, 404. */
public class OrganizationNotFoundException extends DomainException {
    public OrganizationNotFoundException() {
        super("organization.notFound", HttpStatus.NOT_FOUND, "No organization or application was found.");
    }
}
