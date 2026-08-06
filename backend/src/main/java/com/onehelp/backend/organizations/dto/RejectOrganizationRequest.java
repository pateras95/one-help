package com.onehelp.backend.organizations.dto;

import jakarta.validation.constraints.Size;

/**
 * {@code POST /admin/organizations/{id}/reject}. {@code reason} has no
 * {@code @NotBlank} here deliberately — a blank reason is checked service-side and
 * raises the specific {@code organization.reasonRequired} (422) code
 * (error-contract.md), not the generic {@code validation.failed}.
 */
public record RejectOrganizationRequest(@Size(max = 2000) String reason) {}
