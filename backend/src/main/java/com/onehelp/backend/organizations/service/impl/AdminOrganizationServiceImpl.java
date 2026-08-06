package com.onehelp.backend.organizations.service.impl;

import com.onehelp.backend.auth.service.RefreshTokenService;
import com.onehelp.backend.common.exception.AccountSuspendedException;
import com.onehelp.backend.common.web.PageResponse;
import com.onehelp.backend.organizations.dto.OrganizationResponse;
import com.onehelp.backend.organizations.dto.OrganizerDemotionResponse;
import com.onehelp.backend.organizations.dto.RejectOrganizationRequest;
import com.onehelp.backend.organizations.dto.UpdateOrganizationRequest;
import com.onehelp.backend.organizations.entity.Organization;
import com.onehelp.backend.organizations.entity.OrganizationStatus;
import com.onehelp.backend.organizations.exception.DuplicateOrganizationNameException;
import com.onehelp.backend.organizations.exception.OrganizationInvalidTransitionException;
import com.onehelp.backend.organizations.exception.OrganizationNotFoundException;
import com.onehelp.backend.organizations.exception.OrganizerDemotionNotAllowedException;
import com.onehelp.backend.organizations.exception.OrganizerRoleRequiredException;
import com.onehelp.backend.organizations.exception.RejectionReasonRequiredException;
import com.onehelp.backend.organizations.mapper.OrganizationMapper;
import com.onehelp.backend.organizations.repository.OrganizationRepository;
import com.onehelp.backend.organizations.service.AdminOrganizationService;
import com.onehelp.backend.organizations.service.OrganizerDemotionService;
import com.onehelp.backend.users.entity.AccountStatus;
import com.onehelp.backend.users.entity.User;
import com.onehelp.backend.users.entity.UserRole;
import com.onehelp.backend.users.exception.UserNotFoundException;
import com.onehelp.backend.users.repository.UserRepository;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AdminOrganizationServiceImpl implements AdminOrganizationService {

    private static final int MAX_PAGE_SIZE = 100;

    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final OrganizationMapper organizationMapper;
    private final RefreshTokenService refreshTokenService;
    private final OrganizerDemotionService organizerDemotionService;

    public AdminOrganizationServiceImpl(
            OrganizationRepository organizationRepository,
            UserRepository userRepository,
            OrganizationMapper organizationMapper,
            RefreshTokenService refreshTokenService,
            OrganizerDemotionService organizerDemotionService) {
        this.organizationRepository = organizationRepository;
        this.userRepository = userRepository;
        this.organizationMapper = organizationMapper;
        this.refreshTokenService = refreshTokenService;
        this.organizerDemotionService = organizerDemotionService;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<OrganizationResponse> list(String search, OrganizationStatus status, Pageable pageable) {
        Pageable clamped = pageable.getPageSize() > MAX_PAGE_SIZE
                ? PageRequest.of(pageable.getPageNumber(), MAX_PAGE_SIZE, pageable.getSort())
                : pageable;
        String normalizedSearch = (search == null || search.isBlank()) ? null : search.trim();
        var page = organizationRepository.search(normalizedSearch, status, clamped).map(organizationMapper::toResponse);
        return PageResponse.of(page);
    }

    @Override
    @Transactional(readOnly = true)
    public OrganizationResponse getById(UUID organizationId) {
        Organization org =
                organizationRepository.findById(organizationId).orElseThrow(OrganizationNotFoundException::new);
        return organizationMapper.toResponse(org);
    }

    @Override
    public OrganizationResponse updateAdmin(UUID organizationId, UpdateOrganizationRequest request) {
        Organization org =
                organizationRepository.findById(organizationId).orElseThrow(OrganizationNotFoundException::new);
        if (organizationRepository.existsDuplicateName(request.name().el(), request.name().en(), org.getId())) {
            throw new DuplicateOrganizationNameException();
        }
        OrganizationFieldApplier.apply(org, request);
        return organizationMapper.toResponse(org);
    }

    @Override
    public OrganizationResponse approve(UUID adminUserId, UUID organizationId) {
        Organization org = organizationRepository
                .findByIdForUpdate(organizationId)
                .orElseThrow(OrganizationNotFoundException::new);
        if (org.getStatus() != OrganizationStatus.PENDING) {
            throw new OrganizationInvalidTransitionException();
        }

        User applicant = userRepository.findById(org.getOrganizerUserId()).orElseThrow(UserNotFoundException::new);
        if (applicant.getStatus() != AccountStatus.ACTIVE) {
            throw new AccountSuspendedException();
        }
        if (applicant.getRole() != UserRole.VOLUNTEER) {
            // Defensive only — structurally, a PENDING application's owner is always
            // still VOLUNTEER under this design (role only ever changes alongside an
            // organization-status change, in this same service).
            throw new OrganizationInvalidTransitionException();
        }

        org.setStatus(OrganizationStatus.APPROVED);
        org.setReviewedAt(Instant.now());
        org.setReviewedBy(adminUserId);

        applicant.setRole(UserRole.ORGANIZER);
        refreshTokenService.revokeAllForUser(applicant);

        return organizationMapper.toResponse(org);
    }

    @Override
    public OrganizationResponse reject(UUID adminUserId, UUID organizationId, RejectOrganizationRequest request) {
        Organization org = organizationRepository
                .findByIdForUpdate(organizationId)
                .orElseThrow(OrganizationNotFoundException::new);
        if (org.getStatus() != OrganizationStatus.PENDING) {
            throw new OrganizationInvalidTransitionException();
        }
        if (request.reason() == null || request.reason().isBlank()) {
            throw new RejectionReasonRequiredException();
        }

        org.setStatus(OrganizationStatus.REJECTED);
        org.setRejectionReason(request.reason().trim());
        org.setReviewedAt(Instant.now());
        org.setReviewedBy(adminUserId);

        return organizationMapper.toResponse(org);
    }

    @Override
    public OrganizationResponse suspend(UUID organizationId) {
        Organization org = organizationRepository
                .findByIdForUpdate(organizationId)
                .orElseThrow(OrganizationNotFoundException::new);
        if (org.getStatus() == OrganizationStatus.PENDING || org.getStatus() == OrganizationStatus.REJECTED) {
            throw new OrganizationInvalidTransitionException();
        }
        // Idempotent: already-SUSPENDED simply stays SUSPENDED, no error (Part 10).
        org.setStatus(OrganizationStatus.SUSPENDED);
        return organizationMapper.toResponse(org);
    }

    @Override
    public OrganizationResponse restore(UUID organizationId) {
        Organization org = organizationRepository
                .findByIdForUpdate(organizationId)
                .orElseThrow(OrganizationNotFoundException::new);
        if (org.getStatus() == OrganizationStatus.PENDING || org.getStatus() == OrganizationStatus.REJECTED) {
            throw new OrganizationInvalidTransitionException();
        }
        // Idempotent: already-APPROVED simply stays APPROVED, no error (Part 10).
        org.setStatus(OrganizationStatus.APPROVED);
        return organizationMapper.toResponse(org);
    }

    @Override
    public OrganizerDemotionResponse demoteOrganizer(UUID adminUserId, UUID organizationId) {
        Organization org =
                organizationRepository.findById(organizationId).orElseThrow(OrganizationNotFoundException::new);
        UUID targetUserId = org.getOrganizerUserId();
        if (adminUserId.equals(targetUserId)) {
            throw new OrganizerDemotionNotAllowedException();
        }
        User target = userRepository.findById(targetUserId).orElseThrow(UserNotFoundException::new);
        if (target.getRole() != UserRole.ORGANIZER) {
            throw new OrganizerRoleRequiredException();
        }
        return organizerDemotionService.demote(targetUserId, adminUserId);
    }
}
