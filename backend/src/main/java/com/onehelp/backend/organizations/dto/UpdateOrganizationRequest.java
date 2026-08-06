package com.onehelp.backend.organizations.dto;

import com.onehelp.backend.organizations.entity.OrganizationCategory;
import com.onehelp.backend.organizations.entity.OrganizationType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Set;

/**
 * Same fields as {@link OrganizationApplicationRequest} minus {@code acceptedTerms}
 * (already accepted at submission) — used for both the organizer's own edit
 * ({@code PATCH /organizations/me}, allowed only while {@code APPROVED}/
 * {@code SUSPENDED}) and the administrator's edit
 * ({@code PATCH /admin/organizations/{id}}), per dto-catalogue.md. Deliberately has no
 * {@code status}/{@code organizerUserId}/{@code reviewedBy}/{@code id} field — mass-
 * assignment prevention; ownership and status are never editable through this DTO on
 * either endpoint.
 */
public record UpdateOrganizationRequest(
        @Valid @NotNull LocalizedNameRequest name,
        @NotNull OrganizationType organizationType,
        @Valid @NotNull LocalizedDescriptionRequest description,
        @NotBlank @Email @Size(max = 255) String contactEmail,
        @Size(max = 50) String phone,
        @Pattern(regexp = "^https?://.+\\..+$", message = "website must be a valid http(s) URL") String website,
        @NotBlank @Size(max = 255) String address,
        @NotBlank @Size(max = 120) String municipality,
        @NotEmpty Set<OrganizationCategory> categories,
        @NotBlank @Size(min = 20, max = 2000) String supportingMessage) {}
