package com.onehelp.backend.organizations.exception;

import com.onehelp.backend.common.exception.DomainException;
import org.springframework.http.HttpStatus;

/** {@code organizer.demotionNotAllowed}, 400 — an administrator may never demote
 * themselves through the admin demotion operation (structurally defensive: an
 * administrator can never simultaneously hold the {@code ORGANIZER} role under the
 * permanent single-role rule, but the check is explicit rather than assumed). */
public class OrganizerDemotionNotAllowedException extends DomainException {
    public OrganizerDemotionNotAllowedException() {
        super("organizer.demotionNotAllowed", HttpStatus.BAD_REQUEST, "You cannot demote yourself.");
    }
}
