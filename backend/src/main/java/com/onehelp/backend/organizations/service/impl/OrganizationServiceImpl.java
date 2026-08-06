package com.onehelp.backend.organizations.service.impl;

import com.onehelp.backend.organizations.dto.OrganizationApplicationRequest;
import com.onehelp.backend.organizations.dto.OrganizationResponse;
import com.onehelp.backend.organizations.dto.OrganizerDemotionResponse;
import com.onehelp.backend.organizations.dto.UpdateOrganizationRequest;
import com.onehelp.backend.organizations.entity.Organization;
import com.onehelp.backend.organizations.entity.OrganizationStatus;
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
import com.onehelp.backend.organizations.service.OrganizationService;
import com.onehelp.backend.organizations.service.OrganizerDemotionService;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class OrganizationServiceImpl implements OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final OrganizationMapper organizationMapper;
    private final OrganizerDemotionService organizerDemotionService;

    public OrganizationServiceImpl(
            OrganizationRepository organizationRepository,
            OrganizationMapper organizationMapper,
            OrganizerDemotionService organizerDemotionService) {
        this.organizationRepository = organizationRepository;
        this.organizationMapper = organizationMapper;
        this.organizerDemotionService = organizerDemotionService;
    }

    @Override
    @Transactional(readOnly = true)
    public OrganizationResponse getForUser(UUID userId) {
        Organization org =
                organizationRepository.findByOrganizerUserId(userId).orElseThrow(OrganizationNotFoundException::new);
        return organizationMapper.toResponse(org);
    }

    @Override
    public OrganizationResponse submitApplication(UUID userId, OrganizationApplicationRequest request) {
        if (!Boolean.TRUE.equals(request.acceptedTerms())) {
            throw new TermsNotAcceptedException();
        }
        // Pre-check for a clean error message; the database's UNIQUE(organizer_user_id)
        // constraint (ADR-4/ADR-15) is the actual guarantee against a concurrent
        // double-submission race (transactions-and-integrity.md).
        if (organizationRepository.existsByOrganizerUserId(userId)) {
            throw new OrganizationAlreadyExistsException();
        }
        requireNameNotDuplicate(request.name().el(), request.name().en(), null);

        Organization org = new Organization(UUID.randomUUID(), userId);
        OrganizationFieldApplier.apply(org, request);
        org.setStatus(OrganizationStatus.PENDING);
        org.setSubmittedAt(Instant.now());
        org = organizationRepository.save(org);
        return organizationMapper.toResponse(org);
    }

    @Override
    public OrganizationResponse updatePendingApplication(
            UUID userId, UUID applicationId, OrganizationApplicationRequest request) {
        Organization org = loadOwnedByApplicant(userId, applicationId);
        if (org.getStatus() != OrganizationStatus.PENDING) {
            throw new OrganizationNotPendingException();
        }
        requireNameNotDuplicate(request.name().el(), request.name().en(), org.getId());
        OrganizationFieldApplier.apply(org, request);
        return organizationMapper.toResponse(org);
    }

    @Override
    public OrganizationResponse resubmitApplication(
            UUID userId, UUID applicationId, OrganizationApplicationRequest request) {
        Organization org = loadOwnedByApplicant(userId, applicationId);
        if (org.getStatus() != OrganizationStatus.REJECTED) {
            throw new OrganizationNotRejectedException();
        }
        requireNameNotDuplicate(request.name().el(), request.name().en(), org.getId());
        OrganizationFieldApplier.apply(org, request);
        org.setPreviousRejectionReason(org.getRejectionReason());
        org.setRejectionReason(null);
        org.setStatus(OrganizationStatus.PENDING);
        org.setSubmittedAt(Instant.now());
        return organizationMapper.toResponse(org);
    }

    @Override
    public OrganizationResponse updateOwnOrganization(UUID userId, UpdateOrganizationRequest request) {
        Organization org = organizationRepository
                .findByOrganizerUserId(userId)
                .orElseThrow(OrganizerOrganizationMissingException::new);
        if (org.getStatus() != OrganizationStatus.APPROVED && org.getStatus() != OrganizationStatus.SUSPENDED) {
            throw new OrganizationInvalidTransitionException();
        }
        requireNameNotDuplicate(request.name().el(), request.name().en(), org.getId());
        OrganizationFieldApplier.apply(org, request);
        return organizationMapper.toResponse(org);
    }

    @Override
    public OrganizerDemotionResponse selfDemote(UUID userId) {
        return organizerDemotionService.demote(userId, userId);
    }

    /** Direct ids never establish ownership on their own (security-and-authentication.md)
     * — an application that exists but belongs to someone else is 404, not 403, so a
     * caller probing another applicant's id learns nothing. */
    private Organization loadOwnedByApplicant(UUID userId, UUID applicationId) {
        Organization org =
                organizationRepository.findById(applicationId).orElseThrow(OrganizationNotFoundException::new);
        if (!org.getOrganizerUserId().equals(userId)) {
            throw new OrganizationNotFoundException();
        }
        return org;
    }

    private void requireNameNotDuplicate(String nameEl, String nameEn, UUID excludeId) {
        if (organizationRepository.existsDuplicateName(nameEl, nameEn, excludeId)) {
            throw new DuplicateOrganizationNameException();
        }
    }
}
