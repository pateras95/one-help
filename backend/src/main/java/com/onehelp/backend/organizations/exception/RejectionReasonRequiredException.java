package com.onehelp.backend.organizations.exception;

import com.onehelp.backend.common.exception.DomainException;
import org.springframework.http.HttpStatus;

/** {@code organization.reasonRequired}, 422. */
public class RejectionReasonRequiredException extends DomainException {
    public RejectionReasonRequiredException() {
        super("organization.reasonRequired", HttpStatus.UNPROCESSABLE_ENTITY, "A rejection reason is required.");
    }
}
