package com.onehelp.backend.organizations.service.impl;

import com.onehelp.backend.auth.service.RefreshTokenService;
import com.onehelp.backend.organizations.dto.LocalizedText;
import com.onehelp.backend.organizations.dto.OrganizerDemotionResponse;
import com.onehelp.backend.organizations.entity.Organization;
import com.onehelp.backend.organizations.exception.OrganizerOrganizationMissingException;
import com.onehelp.backend.organizations.repository.OrganizationRepository;
import com.onehelp.backend.organizations.service.OrganizerDemotionService;
import com.onehelp.backend.users.entity.User;
import com.onehelp.backend.users.entity.UserRole;
import com.onehelp.backend.users.exception.UserNotFoundException;
import com.onehelp.backend.users.repository.UserRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The single transactional demotion cascade (transactions-and-integrity.md
 * § Organizer demotion cascade). Because no Actions/participation/attendance/reports
 * tables exist yet (explicitly out of scope for this phase), the only cascade step
 * that actually exists today is deleting the {@code organizations} row itself —
 * {@code actionsRemoved} is always {@code 0}. When the Actions phase lands, this
 * method is where the additional cascade calls
 * (participation/attendance/reports/actions deletion, per the transactions doc) must
 * be added, inside this same transaction, before the organization row is deleted.
 */
@Service
public class OrganizerDemotionServiceImpl implements OrganizerDemotionService {

    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final RefreshTokenService refreshTokenService;

    public OrganizerDemotionServiceImpl(
            OrganizationRepository organizationRepository,
            UserRepository userRepository,
            RefreshTokenService refreshTokenService) {
        this.organizationRepository = organizationRepository;
        this.userRepository = userRepository;
        this.refreshTokenService = refreshTokenService;
    }

    @Override
    @Transactional
    public OrganizerDemotionResponse demote(UUID organizerUserId, UUID initiatedBy) {
        Organization organization = organizationRepository
                .findByOrganizerUserIdForUpdate(organizerUserId)
                .orElseThrow(OrganizerOrganizationMissingException::new);
        User organizer = userRepository.findById(organizerUserId).orElseThrow(UserNotFoundException::new);

        LocalizedText organizationName = new LocalizedText(organization.getNameEl(), organization.getNameEn());

        organizationRepository.delete(organization);
        organizer.setRole(UserRole.VOLUNTEER);
        refreshTokenService.revokeAllForUser(organizer);

        return new OrganizerDemotionResponse(organizationName, 0);
    }
}
