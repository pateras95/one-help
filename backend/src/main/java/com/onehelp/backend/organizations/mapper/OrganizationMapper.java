package com.onehelp.backend.organizations.mapper;

import com.onehelp.backend.organizations.dto.LocalizedText;
import com.onehelp.backend.organizations.dto.OrganizationResponse;
import com.onehelp.backend.organizations.entity.Organization;
import com.onehelp.backend.users.dto.UserSummaryResponse;
import com.onehelp.backend.users.mapper.UserMapper;
import com.onehelp.backend.users.repository.UserRepository;
import org.springframework.stereotype.Component;

/**
 * Hand-written (not MapStruct) because {@code organizer}/{@code reviewedBy} require a
 * {@link UserRepository} lookup, not a plain field copy — {@code organizerUserId} and
 * {@code reviewedBy} are raw ids on the entity (ADR-4: no JPA relationship, no
 * membership table) and are never returned as-is; they are always resolved into a safe
 * {@link UserSummaryResponse} first.
 */
@Component
public class OrganizationMapper {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    public OrganizationMapper(UserRepository userRepository, UserMapper userMapper) {
        this.userRepository = userRepository;
        this.userMapper = userMapper;
    }

    public OrganizationResponse toResponse(Organization org) {
        UserSummaryResponse organizer = userRepository
                .findById(org.getOrganizerUserId())
                .map(userMapper::toSummary)
                .orElse(null);
        UserSummaryResponse reviewedBy = org.getReviewedBy() == null
                ? null
                : userRepository.findById(org.getReviewedBy()).map(userMapper::toSummary).orElse(null);

        return new OrganizationResponse(
                org.getId(),
                organizer,
                new LocalizedText(org.getNameEl(), org.getNameEn()),
                new LocalizedText(org.getDescriptionEl(), org.getDescriptionEn()),
                org.getOrganizationType(),
                org.getContactEmail(),
                org.getPhone(),
                org.getWebsite(),
                org.getAddress(),
                org.getMunicipality(),
                org.getCategories(),
                org.getSupportingMessage(),
                org.getStatus(),
                org.getSubmittedAt(),
                org.getReviewedAt(),
                reviewedBy,
                org.getRejectionReason(),
                org.getPreviousRejectionReason(),
                org.getVersion());
    }
}
