package com.onehelp.backend.organizations.dto;

/**
 * {@code POST /organizations/me/demote}, {@code POST /admin/organizations/{id}/demote}
 * (rest-api-design.md). {@code actionsRemoved} is always {@code 0} in this phase —
 * there is no Actions backend yet (explicitly out of scope), so there is nothing to
 * remove beyond the organization row itself; this field is deliberately preserved in
 * the response shape so the future Actions phase can populate it truthfully without a
 * breaking contract change, rather than fabricating a nonzero count now.
 */
public record OrganizerDemotionResponse(LocalizedText organizationName, int actionsRemoved) {}
