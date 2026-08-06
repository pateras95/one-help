package com.onehelp.backend.organizations.exception;

import com.onehelp.backend.common.exception.DomainException;
import org.springframework.http.HttpStatus;

/** {@code organization.notPending}, 400 — {@code PATCH /organizer-applications/{id}}
 * (edit-while-pending) is only valid while the application is still {@code PENDING}. */
public class OrganizationNotPendingException extends DomainException {
    public OrganizationNotPendingException() {
        super("organization.notPending", HttpStatus.BAD_REQUEST, "This application is no longer pending review.");
    }
}
