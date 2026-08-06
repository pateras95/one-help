package com.onehelp.backend.organizations.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.onehelp.backend.organizations.dto.LocalizedDescriptionRequest;
import com.onehelp.backend.organizations.dto.LocalizedNameRequest;
import com.onehelp.backend.organizations.dto.OrganizationApplicationRequest;
import com.onehelp.backend.organizations.dto.OrganizationResponse;
import com.onehelp.backend.organizations.dto.OrganizerDemotionResponse;
import com.onehelp.backend.organizations.dto.UpdateOrganizationRequest;
import com.onehelp.backend.organizations.entity.Organization;
import com.onehelp.backend.organizations.entity.OrganizationCategory;
import com.onehelp.backend.organizations.entity.OrganizationStatus;
import com.onehelp.backend.organizations.entity.OrganizationType;
import com.onehelp.backend.organizations.exception.DuplicateOrganizationNameException;
import com.onehelp.backend.organizations.exception.OrganizationAlreadyExistsException;
import com.onehelp.backend.organizations.exception.OrganizationInvalidTransitionException;
import com.onehelp.backend.organizations.exception.OrganizationNotFoundException;
import com.onehelp.backend.organizations.exception.OrganizationNotPendingException;
import com.onehelp.backend.organizations.exception.OrganizationNotRejectedException;
import com.onehelp.backend.organizations.exception.OrganizerOrganizationMissingException;
import com.onehelp.backend.organizations.exception.TermsNotAcceptedException;
import com.onehelp.backend.organizations.mapper.OrganizationMapper;
import com.onehelp.backend.organizations.repository.OrganizationRepository;
import com.onehelp.backend.organizations.service.OrganizerDemotionService;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Pure unit tests (Mockito-mocked collaborators, no Spring context, no database). */
@ExtendWith(MockitoExtension.class)
class OrganizationServiceImplTest {

    @Mock
    private OrganizationRepository organizationRepository;

    @Mock
    private OrganizationMapper organizationMapper;

    @Mock
    private OrganizerDemotionService organizerDemotionService;

    private OrganizationServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new OrganizationServiceImpl(organizationRepository, organizationMapper, organizerDemotionService);
    }

    private static OrganizationApplicationRequest validApplicationRequest(boolean acceptedTerms) {
        return new OrganizationApplicationRequest(
                new LocalizedNameRequest("Ελπίδα", "Hope"),
                OrganizationType.NGO,
                new LocalizedDescriptionRequest(
                        "Μια οργάνωση που βοηθάει εθελοντές.", "An organization that helps volunteers."),
                "contact@hope.example",
                "2101234567",
                "https://hope.example",
                "Some address 12",
                "Athens",
                Set.of(OrganizationCategory.SOCIAL),
                "We would like to help volunteers coordinate better in our community.",
                acceptedTerms);
    }

    private static UpdateOrganizationRequest validUpdateRequest() {
        return new UpdateOrganizationRequest(
                new LocalizedNameRequest("Ελπίδα", "Hope"),
                OrganizationType.NGO,
                new LocalizedDescriptionRequest(
                        "Μια οργάνωση που βοηθάει εθελοντές.", "An organization that helps volunteers."),
                "contact@hope.example",
                "2101234567",
                "https://hope.example",
                "Some address 12",
                "Athens",
                Set.of(OrganizationCategory.SOCIAL),
                "We would like to help volunteers coordinate better in our community.");
    }

    @Test
    void getForUserThrowsWhenNoneExists() {
        UUID userId = UUID.randomUUID();
        when(organizationRepository.findByOrganizerUserId(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getForUser(userId)).isInstanceOf(OrganizationNotFoundException.class);
    }

    @Test
    void submitApplicationRejectsWhenTermsNotAccepted() {
        UUID userId = UUID.randomUUID();

        assertThatThrownBy(() -> service.submitApplication(userId, validApplicationRequest(false)))
                .isInstanceOf(TermsNotAcceptedException.class);
    }

    @Test
    void submitApplicationRejectsWhenAlreadyHasOneOnFile() {
        UUID userId = UUID.randomUUID();
        when(organizationRepository.existsByOrganizerUserId(userId)).thenReturn(true);

        assertThatThrownBy(() -> service.submitApplication(userId, validApplicationRequest(true)))
                .isInstanceOf(OrganizationAlreadyExistsException.class);
    }

    @Test
    void submitApplicationRejectsADuplicateName() {
        UUID userId = UUID.randomUUID();
        when(organizationRepository.existsByOrganizerUserId(userId)).thenReturn(false);
        when(organizationRepository.existsDuplicateName("Ελπίδα", "Hope", null)).thenReturn(true);

        assertThatThrownBy(() -> service.submitApplication(userId, validApplicationRequest(true)))
                .isInstanceOf(DuplicateOrganizationNameException.class);
    }

    @Test
    void submitApplicationCreatesAPendingOrganization() {
        UUID userId = UUID.randomUUID();
        when(organizationRepository.existsByOrganizerUserId(userId)).thenReturn(false);
        when(organizationRepository.existsDuplicateName(any(), any(), any())).thenReturn(false);
        when(organizationRepository.save(any(Organization.class))).thenAnswer(inv -> inv.getArgument(0));
        when(organizationMapper.toResponse(any())).thenReturn(null);

        service.submitApplication(userId, validApplicationRequest(true));

        ArgumentCaptor<Organization> captor = ArgumentCaptor.forClass(Organization.class);
        verify(organizationRepository).save(captor.capture());
        Organization saved = captor.getValue();
        assertThat(saved.getOrganizerUserId()).isEqualTo(userId);
        assertThat(saved.getStatus()).isEqualTo(OrganizationStatus.PENDING);
        assertThat(saved.getNameEl()).isEqualTo("Ελπίδα");
        assertThat(saved.getSubmittedAt()).isNotNull();
    }

    @Test
    void updatePendingApplicationRejectsWhenNotOwnedByCaller() {
        UUID userId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        Organization other = new Organization(applicationId, UUID.randomUUID());
        when(organizationRepository.findById(applicationId)).thenReturn(Optional.of(other));

        assertThatThrownBy(() -> service.updatePendingApplication(userId, applicationId, validApplicationRequest(true)))
                .isInstanceOf(OrganizationNotFoundException.class);
    }

    @Test
    void updatePendingApplicationRejectsWhenNotPending() {
        UUID userId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        Organization org = new Organization(applicationId, userId);
        org.setStatus(OrganizationStatus.APPROVED);
        when(organizationRepository.findById(applicationId)).thenReturn(Optional.of(org));

        assertThatThrownBy(() -> service.updatePendingApplication(userId, applicationId, validApplicationRequest(true)))
                .isInstanceOf(OrganizationNotPendingException.class);
    }

    @Test
    void resubmitApplicationMovesRejectedBackToPendingAndTracksPreviousReason() {
        UUID userId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        Organization org = new Organization(applicationId, userId);
        org.setStatus(OrganizationStatus.REJECTED);
        org.setRejectionReason("Missing details");
        when(organizationRepository.findById(applicationId)).thenReturn(Optional.of(org));
        when(organizationRepository.existsDuplicateName(any(), any(), any())).thenReturn(false);
        when(organizationMapper.toResponse(any())).thenReturn(null);

        service.resubmitApplication(userId, applicationId, validApplicationRequest(true));

        assertThat(org.getStatus()).isEqualTo(OrganizationStatus.PENDING);
        assertThat(org.getPreviousRejectionReason()).isEqualTo("Missing details");
        assertThat(org.getRejectionReason()).isNull();
    }

    @Test
    void resubmitApplicationRejectsWhenNotRejected() {
        UUID userId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        Organization org = new Organization(applicationId, userId);
        org.setStatus(OrganizationStatus.PENDING);
        when(organizationRepository.findById(applicationId)).thenReturn(Optional.of(org));

        assertThatThrownBy(() -> service.resubmitApplication(userId, applicationId, validApplicationRequest(true)))
                .isInstanceOf(OrganizationNotRejectedException.class);
    }

    @Test
    void updateOwnOrganizationThrowsWhenOrganizerHasNoOrganizationRow() {
        UUID userId = UUID.randomUUID();
        when(organizationRepository.findByOrganizerUserId(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateOwnOrganization(userId, validUpdateRequest()))
                .isInstanceOf(OrganizerOrganizationMissingException.class);
    }

    @Test
    void updateOwnOrganizationRejectsWhilePendingOrRejected() {
        UUID userId = UUID.randomUUID();
        Organization org = new Organization(UUID.randomUUID(), userId);
        org.setStatus(OrganizationStatus.PENDING);
        when(organizationRepository.findByOrganizerUserId(userId)).thenReturn(Optional.of(org));

        assertThatThrownBy(() -> service.updateOwnOrganization(userId, validUpdateRequest()))
                .isInstanceOf(OrganizationInvalidTransitionException.class);
    }

    @Test
    void updateOwnOrganizationSucceedsWhileApprovedOrSuspended() {
        UUID userId = UUID.randomUUID();
        Organization org = new Organization(UUID.randomUUID(), userId);
        org.setStatus(OrganizationStatus.SUSPENDED);
        when(organizationRepository.findByOrganizerUserId(userId)).thenReturn(Optional.of(org));
        when(organizationRepository.existsDuplicateName(any(), any(), any())).thenReturn(false);
        when(organizationMapper.toResponse(any())).thenReturn(null);

        service.updateOwnOrganization(userId, validUpdateRequest());

        assertThat(org.getNameEl()).isEqualTo("Ελπίδα");
        assertThat(org.getStatus()).isEqualTo(OrganizationStatus.SUSPENDED);
    }

    @Test
    void selfDemoteDelegatesToOrganizerDemotionServiceWithMatchingIds() {
        UUID userId = UUID.randomUUID();
        OrganizerDemotionResponse expected = new OrganizerDemotionResponse(null, 0);
        when(organizerDemotionService.demote(userId, userId)).thenReturn(expected);

        OrganizerDemotionResponse actual = service.selfDemote(userId);

        assertThat(actual).isSameAs(expected);
    }

    @Test
    void submitApplicationNeverPersistsRoleOrIdFromClient() {
        // Defensive: OrganizationApplicationRequest has no role/id/status field at
        // all, so there is nothing to accidentally mass-assign — this test documents
        // that guarantee by asserting the created entity's status is always PENDING
        // regardless of any attempt to influence it via the request shape.
        UUID userId = UUID.randomUUID();
        when(organizationRepository.existsByOrganizerUserId(userId)).thenReturn(false);
        when(organizationRepository.existsDuplicateName(any(), any(), any())).thenReturn(false);
        when(organizationRepository.save(any(Organization.class))).thenAnswer(inv -> inv.getArgument(0));
        when(organizationMapper.toResponse(any())).thenAnswer(inv -> {
            Organization org = inv.getArgument(0);
            return new OrganizationResponse(
                    org.getId(), // id
                    null, // organizer
                    null, // name
                    null, // description
                    null, // organizationType
                    null, // contactEmail
                    null, // phone
                    null, // website
                    null, // address
                    null, // municipality
                    null, // categories
                    null, // supportingMessage
                    org.getStatus(), // status
                    null, // submittedAt
                    null, // reviewedAt
                    null, // reviewedBy
                    null, // rejectionReason
                    null, // previousRejectionReason
                    null); // version
        });

        OrganizationResponse response = service.submitApplication(userId, validApplicationRequest(true));

        assertThat(response.status()).isEqualTo(OrganizationStatus.PENDING);
    }
}
