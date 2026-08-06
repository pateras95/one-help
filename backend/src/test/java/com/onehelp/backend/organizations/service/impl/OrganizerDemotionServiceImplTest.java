package com.onehelp.backend.organizations.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.onehelp.backend.auth.service.RefreshTokenService;
import com.onehelp.backend.organizations.dto.OrganizerDemotionResponse;
import com.onehelp.backend.organizations.entity.Organization;
import com.onehelp.backend.organizations.exception.OrganizerOrganizationMissingException;
import com.onehelp.backend.organizations.repository.OrganizationRepository;
import com.onehelp.backend.users.entity.User;
import com.onehelp.backend.users.entity.UserRole;
import com.onehelp.backend.users.repository.UserRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Pure unit tests for the single shared demotion cascade
 * (transactions-and-integrity.md § Organizer demotion cascade). The real-MySQL
 * integration test additionally proves the end-to-end effect (organization gone, role
 * reset, login blocked until re-authentication) — this class proves the service-level
 * logic in isolation.
 */
@ExtendWith(MockitoExtension.class)
class OrganizerDemotionServiceImplTest {

    @Mock
    private OrganizationRepository organizationRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefreshTokenService refreshTokenService;

    private OrganizerDemotionServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new OrganizerDemotionServiceImpl(organizationRepository, userRepository, refreshTokenService);
    }

    @Test
    void demoteThrowsWhenNoOrganizationExists() {
        UUID organizerUserId = UUID.randomUUID();
        when(organizationRepository.findByOrganizerUserIdForUpdate(organizerUserId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.demote(organizerUserId, organizerUserId))
                .isInstanceOf(OrganizerOrganizationMissingException.class);
    }

    @Test
    void demoteDeletesTheOrganizationResetsRoleAndRevokesTokens() {
        UUID organizerUserId = UUID.randomUUID();
        Organization organization = new Organization(UUID.randomUUID(), organizerUserId);
        organization.setNameEl("Ελπίδα");
        organization.setNameEn("Hope");
        User organizer = new User(organizerUserId, "Org", "Anizer", "org@onehelp.local", "hash");
        organizer.setRole(UserRole.ORGANIZER);

        when(organizationRepository.findByOrganizerUserIdForUpdate(organizerUserId))
                .thenReturn(Optional.of(organization));
        when(userRepository.findById(organizerUserId)).thenReturn(Optional.of(organizer));

        OrganizerDemotionResponse response = service.demote(organizerUserId, organizerUserId);

        verify(organizationRepository).delete(organization);
        verify(refreshTokenService).revokeAllForUser(organizer);
        assertThat(organizer.getRole()).isEqualTo(UserRole.VOLUNTEER);
        assertThat(response.organizationName().el()).isEqualTo("Ελπίδα");
        assertThat(response.organizationName().en()).isEqualTo("Hope");
        assertThat(response.actionsRemoved()).isZero();
    }

    @Test
    void demoteWorksIdenticallyForSelfServiceAndAdminInitiated() {
        UUID organizerUserId = UUID.randomUUID();
        UUID adminUserId = UUID.randomUUID();
        Organization organization = new Organization(UUID.randomUUID(), organizerUserId);
        User organizer = new User(organizerUserId, "Org", "Anizer", "org@onehelp.local", "hash");
        organizer.setRole(UserRole.ORGANIZER);

        when(organizationRepository.findByOrganizerUserIdForUpdate(organizerUserId))
                .thenReturn(Optional.of(organization));
        when(userRepository.findById(organizerUserId)).thenReturn(Optional.of(organizer));

        service.demote(organizerUserId, adminUserId);

        assertThat(organizer.getRole()).isEqualTo(UserRole.VOLUNTEER);
        verify(organizationRepository).delete(organization);
    }
}
