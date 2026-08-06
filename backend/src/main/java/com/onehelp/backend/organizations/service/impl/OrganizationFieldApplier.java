package com.onehelp.backend.organizations.service.impl;

import com.onehelp.backend.organizations.dto.LocalizedDescriptionRequest;
import com.onehelp.backend.organizations.dto.LocalizedNameRequest;
import com.onehelp.backend.organizations.dto.OrganizationApplicationRequest;
import com.onehelp.backend.organizations.dto.UpdateOrganizationRequest;
import com.onehelp.backend.organizations.entity.Organization;
import com.onehelp.backend.organizations.entity.OrganizationCategory;
import com.onehelp.backend.organizations.entity.OrganizationType;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Shared field-copy logic for {@link OrganizationApplicationRequest} and
 * {@link UpdateOrganizationRequest} — identical field sets (dto-catalogue.md), applied
 * by every write path (submit, edit-pending, resubmit, organizer self-edit, admin
 * edit) so the mapping rule is never duplicated five times.
 */
final class OrganizationFieldApplier {

    private OrganizationFieldApplier() {}

    static void apply(Organization org, OrganizationApplicationRequest request) {
        apply(
                org,
                request.name(),
                request.organizationType(),
                request.description(),
                request.contactEmail(),
                request.phone(),
                request.website(),
                request.address(),
                request.municipality(),
                request.categories(),
                request.supportingMessage());
    }

    static void apply(Organization org, UpdateOrganizationRequest request) {
        apply(
                org,
                request.name(),
                request.organizationType(),
                request.description(),
                request.contactEmail(),
                request.phone(),
                request.website(),
                request.address(),
                request.municipality(),
                request.categories(),
                request.supportingMessage());
    }

    private static void apply(
            Organization org,
            LocalizedNameRequest name,
            OrganizationType organizationType,
            LocalizedDescriptionRequest description,
            String contactEmail,
            String phone,
            String website,
            String address,
            String municipality,
            Set<OrganizationCategory> categories,
            String supportingMessage) {
        org.setNameEl(name.el().trim());
        org.setNameEn(name.en().trim());
        org.setOrganizationType(organizationType);
        org.setDescriptionEl(description.el().trim());
        org.setDescriptionEn(description.en().trim());
        org.setContactEmail(contactEmail.trim());
        org.setPhone(phone == null || phone.isBlank() ? null : phone.trim());
        org.setWebsite(website == null || website.isBlank() ? null : website.trim());
        org.setAddress(address.trim());
        org.setMunicipality(municipality.trim());
        org.setCategories(new LinkedHashSet<>(categories));
        org.setSupportingMessage(supportingMessage.trim());
    }
}
