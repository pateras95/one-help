package com.onehelp.backend.organizations.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.onehelp.backend.auth.service.RefreshTokenService;
import com.onehelp.backend.common.exception.AccountSuspendedException;
import com.onehelp.backend.organizations.dto.OrganizerDemotionResponse;
import com.onehelp.backend.organizations.dto.RejectOrganizationRequest;
import com.onehelp.backend.organizations.entity.Organization;
import com.onehelp.backend.organizations.entity.OrganizationStatus;
import com.onehelp.backend.organizations.exception.OrganizationInvalidTransitionException;
import com.onehelp.backend.organizations.exception.OrganizationNotFoundException;
import com.onehelp.backend.organizations.exception.OrganizerDemotionNotAllowedException;
import com.onehelp.backend.organizations.exception.OrganizerRoleRequiredException;
import com.onehelp.backend.organizations.exception.RejectionReasonRequiredException;
import com.onehelp.backend.organizations.mapper.OrganizationMapper;
import com.onehelp.backend.organizations.repository.OrganizationRepository;
import com.onehelp.backend.organizations.service.OrganizerDemotionService;
import com.onehelp.backend.users.entity.AccountStatus;
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

@ExtendWith(MockitoExtension.class)
class AdminOrganizationServiceImplTest {

    @Mock
    private OrganizationRepository organizationRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private OrganizationMapper organizationMapper;

    @Mock
    private RefreshTokenService refreshTokenService;

    @Mock
    private OrganizerDemotionService organizerDemotionService;

    private AdminOrganizationServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new AdminOrganizationServiceImpl(
                organizationRepository, userRepository, organizationMapper, refreshTokenService, organizerDemotionService);
    }

    private static User volunteer(UUID id) {
        User user = new User(id, "A", "B", "a@onehelp.local", "hash");
        user.setRole(UserRole.VOLUNTEER);
        user.setStatus(AccountStatus.ACTIVE);
        return user;
    }

    @Test
    void approveRejectsWhenNotPending() {
        UUID orgId = UUID.randomUUID();
        Organization org = new Organization(orgId, UUID.randomUUID());
        org.setStatus(OrganizationStatus.APPROVED);
        when(organizationRepository.findByIdForUpdate(orgId)).thenReturn(Optional.of(org));

        assertThatThrownBy(() -> service.approve(UUID.randomUUID(), orgId))
                .isInstanceOf(OrganizationInvalidTransitionException.class);
    }

    @Test
    void approveRejectsWhenApplicantIsSuspended() {
        UUID applicantId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();
        Organization org = new Organization(orgId, applicantId);
        org.setStatus(OrganizationStatus.PENDING);
        User applicant = volunteer(applicantId);
        applicant.setStatus(AccountStatus.SUSPENDED);
        when(organizationRepository.findByIdForUpdate(orgId)).thenReturn(Optional.of(org));
        when(userRepository.findById(applicantId)).thenReturn(Optional.of(applicant));

        assertThatThrownBy(() -> service.approve(UUID.randomUUID(), orgId)).isInstanceOf(AccountSuspendedException.class);
    }

    @Test
    void approveTransitionsOrganizationAndPromotesApplicant() {
        UUID applicantId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();
        Organization org = new Organization(orgId, applicantId);
        org.setStatus(OrganizationStatus.PENDING);
        User applicant = volunteer(applicantId);
        when(organizationRepository.findByIdForUpdate(orgId)).thenReturn(Optional.of(org));
        when(userRepository.findById(applicantId)).thenReturn(Optional.of(applicant));
        when(organizationMapper.toResponse(org)).thenReturn(null);

        service.approve(adminId, orgId);

        assertThat(org.getStatus()).isEqualTo(OrganizationStatus.APPROVED);
        assertThat(org.getReviewedBy()).isEqualTo(adminId);
        assertThat(org.getReviewedAt()).isNotNull();
        assertThat(applicant.getRole()).isEqualTo(UserRole.ORGANIZER);
        verify(refreshTokenService).revokeAllForUser(applicant);
    }

    @Test
    void rejectRequiresANonBlankReason() {
        UUID orgId = UUID.randomUUID();
        Organization org = new Organization(orgId, UUID.randomUUID());
        org.setStatus(OrganizationStatus.PENDING);
        when(organizationRepository.findByIdForUpdate(orgId)).thenReturn(Optional.of(org));

        assertThatThrownBy(() -> service.reject(UUID.randomUUID(), orgId, new RejectOrganizationRequest("  ")))
                .isInstanceOf(RejectionReasonRequiredException.class);
    }

    @Test
    void rejectSetsReasonAndKeepsRoleUnchanged() {
        UUID orgId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();
        Organization org = new Organization(orgId, UUID.randomUUID());
        org.setStatus(OrganizationStatus.PENDING);
        when(organizationRepository.findByIdForUpdate(orgId)).thenReturn(Optional.of(org));
        when(organizationMapper.toResponse(org)).thenReturn(null);

        service.reject(adminId, orgId, new RejectOrganizationRequest("Incomplete documentation"));

        assertThat(org.getStatus()).isEqualTo(OrganizationStatus.REJECTED);
        assertThat(org.getRejectionReason()).isEqualTo("Incomplete documentation");
        assertThat(org.getReviewedBy()).isEqualTo(adminId);
    }

    @Test
    void suspendRejectsPendingOrRejectedOrganizations() {
        UUID orgId = UUID.randomUUID();
        Organization org = new Organization(orgId, UUID.randomUUID());
        org.setStatus(OrganizationStatus.PENDING);
        when(organizationRepository.findByIdForUpdate(orgId)).thenReturn(Optional.of(org));

        assertThatThrownBy(() -> service.suspend(orgId)).isInstanceOf(OrganizationInvalidTransitionException.class);
    }

    @Test
    void suspendIsIdempotentOnAnAlreadySuspendedOrganization() {
        UUID orgId = UUID.randomUUID();
        Organization org = new Organization(orgId, UUID.randomUUID());
        org.setStatus(OrganizationStatus.SUSPENDED);
        when(organizationRepository.findByIdForUpdate(orgId)).thenReturn(Optional.of(org));
        when(organizationMapper.toResponse(org)).thenReturn(null);

        service.suspend(orgId);

        assertThat(org.getStatus()).isEqualTo(OrganizationStatus.SUSPENDED);
    }

    @Test
    void restoreIsIdempotentOnAnAlreadyApprovedOrganization() {
        UUID orgId = UUID.randomUUID();
        Organization org = new Organization(orgId, UUID.randomUUID());
        org.setStatus(OrganizationStatus.APPROVED);
        when(organizationRepository.findByIdForUpdate(orgId)).thenReturn(Optional.of(org));
        when(organizationMapper.toResponse(org)).thenReturn(null);

        service.restore(orgId);

        assertThat(org.getStatus()).isEqualTo(OrganizationStatus.APPROVED);
    }

    @Test
    void demoteOrganizerRejectsWhenAdminIsTheOrganizationsOwnOwner() {
        UUID adminId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();
        Organization org = new Organization(orgId, adminId);
        when(organizationRepository.findById(orgId)).thenReturn(Optional.of(org));

        assertThatThrownBy(() -> service.demoteOrganizer(adminId, orgId))
                .isInstanceOf(OrganizerDemotionNotAllowedException.class);
    }

    @Test
    void demoteOrganizerRejectsWhenTargetIsNoLongerAnOrganizer() {
        UUID adminId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();
        Organization org = new Organization(orgId, targetId);
        User target = volunteer(targetId); // role VOLUNTEER, not ORGANIZER
        when(organizationRepository.findById(orgId)).thenReturn(Optional.of(org));
        when(userRepository.findById(targetId)).thenReturn(Optional.of(target));

        assertThatThrownBy(() -> service.demoteOrganizer(adminId, orgId))
                .isInstanceOf(OrganizerRoleRequiredException.class);
    }

    @Test
    void demoteOrganizerDelegatesToSharedDemotionService() {
        UUID adminId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();
        Organization org = new Organization(orgId, targetId);
        User target = volunteer(targetId);
        target.setRole(UserRole.ORGANIZER);
        OrganizerDemotionResponse expected = new OrganizerDemotionResponse(null, 0);
        when(organizationRepository.findById(orgId)).thenReturn(Optional.of(org));
        when(userRepository.findById(targetId)).thenReturn(Optional.of(target));
        when(organizerDemotionService.demote(targetId, adminId)).thenReturn(expected);

        OrganizerDemotionResponse actual = service.demoteOrganizer(adminId, orgId);

        assertThat(actual).isSameAs(expected);
    }

    @Test
    void getByIdThrows404OnUnknownOrganization() {
        UUID orgId = UUID.randomUUID();
        when(organizationRepository.findById(orgId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getById(orgId)).isInstanceOf(OrganizationNotFoundException.class);
    }
}
