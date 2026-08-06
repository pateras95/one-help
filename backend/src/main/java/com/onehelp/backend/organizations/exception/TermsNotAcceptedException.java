package com.onehelp.backend.organizations.exception;

import com.onehelp.backend.common.exception.DomainException;
import org.springframework.http.HttpStatus;

/** {@code organization.termsNotAccepted}, 422 — required only at submission
 * (not re-checked on edit/resubmit, since terms were already accepted once). */
public class TermsNotAcceptedException extends DomainException {
    public TermsNotAcceptedException() {
        super("organization.termsNotAccepted", HttpStatus.UNPROCESSABLE_ENTITY, "You must accept the terms to apply.");
    }
}
