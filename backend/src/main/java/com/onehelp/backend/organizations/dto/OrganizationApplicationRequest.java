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
 * Used identically for submit ({@code POST /organizer-applications}), edit-while-
 * pending ({@code PATCH /organizer-applications/{id}}), and resubmit
 * ({@code POST /organizer-applications/{id}/resubmit}) — same shape, three endpoints
 * (dto-catalogue.md). {@code acceptedTerms} is only bean-validated as {@code @NotNull}
 * here; the "must be {@code true}" rule is checked service-side, and only on submit
 * (an already-accepted application isn't re-asked to accept terms on every edit).
 *
 * <p>{@code organizationType}/{@code categories} use canonical enum ids, never
 * translated labels (Part 6) — an invalid literal fails Jackson enum binding, handled
 * by {@link com.onehelp.backend.common.exception.GlobalExceptionHandler} as a 422
 * {@code validation.failed}, never a raw 500.
 */
public record OrganizationApplicationRequest(
        @Valid @NotNull LocalizedNameRequest name,
        @NotNull OrganizationType organizationType,
        @Valid @NotNull LocalizedDescriptionRequest description,
        @NotBlank @Email @Size(max = 255) String contactEmail,
        @Size(max = 50) String phone,
        @Pattern(regexp = "^https?://.+\\..+$", message = "website must be a valid http(s) URL") String website,
        @NotBlank @Size(max = 255) String address,
        @NotBlank @Size(max = 120) String municipality,
        @NotEmpty Set<OrganizationCategory> categories,
        @NotBlank @Size(min = 20, max = 2000) String supportingMessage,
        Boolean acceptedTerms) {}
