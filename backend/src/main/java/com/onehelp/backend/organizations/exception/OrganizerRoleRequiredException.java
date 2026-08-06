package com.onehelp.backend.organizations.exception;

import com.onehelp.backend.common.exception.DomainException;
import org.springframework.http.HttpStatus;

/** {@code organizer.notOrganizer}, 403 — an administrator attempted to demote a user
 * whose role is not currently {@code ORGANIZER} (`POST /admin/organizations/{id}/demote`
 * targets an organization, but the defensive check re-verifies the owner's live role). */
public class OrganizerRoleRequiredException extends DomainException {
    public OrganizerRoleRequiredException() {
        super("organizer.notOrganizer", HttpStatus.FORBIDDEN, "This user is not currently an organizer.");
    }
}
