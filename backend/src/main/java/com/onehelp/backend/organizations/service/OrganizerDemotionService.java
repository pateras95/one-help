package com.onehelp.backend.organizations.service;

import com.onehelp.backend.organizations.dto.OrganizerDemotionResponse;
import java.util.UUID;

/**
 * The single, shared transactional demotion cascade (transactions-and-integrity.md
 * § Organizer demotion cascade) — used identically by both self-service demotion
 * ({@code initiatedBy == organizerUserId}) and administrator-triggered demotion
 * ({@code initiatedBy} is the admin's id), so the two call sites can never drift.
 */
public interface OrganizerDemotionService {

    /**
     * Deletes the organizer's organization (real hard delete, not a tombstone),
     * resets their role to {@code VOLUNTEER}, and revokes every active refresh token
     * for that user, all in one transaction. {@code actionsRemoved} on the response is
     * always {@code 0} in this phase (no Actions backend exists yet).
     *
     * @throws com.onehelp.backend.organizations.exception.OrganizerOrganizationMissingException
     *     if no organization row exists for this organizer (defensive — should never
     *     happen under this design)
     */
    OrganizerDemotionResponse demote(UUID organizerUserId, UUID initiatedBy);
}
