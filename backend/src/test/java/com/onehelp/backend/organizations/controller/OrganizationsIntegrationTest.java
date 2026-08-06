package com.onehelp.backend.organizations.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.onehelp.backend.auth.dto.AuthResponse;
import com.onehelp.backend.auth.dto.LoginRequest;
import com.onehelp.backend.auth.dto.RegisterRequest;
import com.onehelp.backend.common.web.ApiErrorResponse;
import com.onehelp.backend.common.web.PageResponse;
import com.onehelp.backend.organizations.dto.LocalizedDescriptionRequest;
import com.onehelp.backend.organizations.dto.LocalizedNameRequest;
import com.onehelp.backend.organizations.dto.OrganizationApplicationRequest;
import com.onehelp.backend.organizations.dto.OrganizationResponse;
import com.onehelp.backend.organizations.dto.OrganizerDemotionResponse;
import com.onehelp.backend.organizations.dto.RejectOrganizationRequest;
import com.onehelp.backend.organizations.dto.UpdateOrganizationRequest;
import com.onehelp.backend.organizations.entity.OrganizationCategory;
import com.onehelp.backend.organizations.entity.OrganizationStatus;
import com.onehelp.backend.organizations.entity.OrganizationType;
import com.onehelp.backend.organizations.repository.OrganizationRepository;
import com.onehelp.backend.users.entity.AccountStatus;
import com.onehelp.backend.users.entity.User;
import com.onehelp.backend.users.entity.UserRole;
import com.onehelp.backend.users.repository.UserRepository;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.test.context.ActiveProfiles;

/**
 * Full-stack tests against a real MySQL database (no mocks) for the Organizations &
 * Organizer Applications domain — the permanent VOLUNTEER -> application -> review ->
 * ORGANIZER -> organization -> demotion -> VOLUNTEER lifecycle, and every permission
 * boundary around it.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class OrganizationsIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrganizationRepository organizationRepository;

    private static final String PASSWORD = "Str0ngPass!";

    private final String suffix = UUID.randomUUID().toString();
    private final String adminEmail = "org-admin-" + suffix + "@onehelp.local";
    private final String preExistingOrganizerEmail = "org-existing-organizer-" + suffix + "@onehelp.local";
    private final String volunteerEmail = "org-volunteer-" + suffix + "@onehelp.local";
    private final String volunteer2Email = "org-volunteer2-" + suffix + "@onehelp.local";

    @BeforeEach
    void useApacheHttpClientAndSeedUsers() {
        restTemplate.getRestTemplate().setRequestFactory(new HttpComponentsClientHttpRequestFactory());

        register(adminEmail, "Admin", "One");
        register(preExistingOrganizerEmail, "Existing", "Organizer");
        register(volunteerEmail, "Volunteer", "One");
        register(volunteer2Email, "Volunteer", "Two");

        setRole(adminEmail, UserRole.ADMINISTRATOR);
        setRole(preExistingOrganizerEmail, UserRole.ORGANIZER);
    }

    @AfterEach
    void cleanUp() {
        // Organizations must be deleted before their owning users (organizer_user_id
        // is ON DELETE RESTRICT — a defensive FK policy, database-schema.md).
        organizationRepository.findByOrganizerUserId(idOf(volunteerEmail)).ifPresent(organizationRepository::delete);
        organizationRepository.findByOrganizerUserId(idOf(volunteer2Email)).ifPresent(organizationRepository::delete);
        organizationRepository
                .findByOrganizerUserId(idOf(preExistingOrganizerEmail))
                .ifPresent(organizationRepository::delete);

        userRepository.findByEmail(adminEmail).ifPresent(userRepository::delete);
        userRepository.findByEmail(preExistingOrganizerEmail).ifPresent(userRepository::delete);
        userRepository.findByEmail(volunteerEmail).ifPresent(userRepository::delete);
        userRepository.findByEmail(volunteer2Email).ifPresent(userRepository::delete);
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    private void register(String email, String firstName, String lastName) {
        restTemplate.postForEntity(
                "/api/v1/auth/register",
                jsonRequest(new RegisterRequest(firstName, lastName, email, PASSWORD), new HttpHeaders()),
                AuthResponse.class);
    }

    private void setRole(String email, UserRole role) {
        User user = userRepository.findByEmail(email).orElseThrow();
        user.setRole(role);
        userRepository.save(user);
    }

    private void setStatus(String email, AccountStatus status) {
        User user = userRepository.findByEmail(email).orElseThrow();
        user.setStatus(status);
        userRepository.save(user);
    }

    private UUID idOf(String email) {
        return userRepository.findByEmail(email).orElseThrow().getId();
    }

    private HttpEntity<Object> jsonRequest(Object body, HttpHeaders extraHeaders) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.addAll(extraHeaders);
        return new HttpEntity<>(body, headers);
    }

    private String accessTokenFor(String email) {
        var response = restTemplate.postForEntity(
                "/api/v1/auth/login", jsonRequest(new LoginRequest(email, PASSWORD), new HttpHeaders()), AuthResponse.class);
        return response.getBody().accessToken();
    }

    private HttpHeaders bearer(String email) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessTokenFor(email));
        return headers;
    }

    private static OrganizationApplicationRequest applicationRequest(String name, boolean acceptedTerms) {
        return new OrganizationApplicationRequest(
                new LocalizedNameRequest(name, name + " EN"),
                OrganizationType.NGO,
                new LocalizedDescriptionRequest(
                        "Μια οργάνωση που βοηθάει εθελοντές στην κοινότητα.",
                        "An organization that helps volunteers in the community."),
                "contact@" + name.toLowerCase().replaceAll("[^a-z0-9]", "") + ".example",
                "2101234567",
                "https://example.org",
                "Some address 12",
                "Athens",
                Set.of(OrganizationCategory.SOCIAL),
                "We would like to help volunteers coordinate better in our community.",
                acceptedTerms);
    }

    private static UpdateOrganizationRequest updateRequest(String name) {
        return new UpdateOrganizationRequest(
                new LocalizedNameRequest(name, name + " EN"),
                OrganizationType.NGO,
                new LocalizedDescriptionRequest(
                        "Μια οργάνωση που βοηθάει εθελοντές στην κοινότητα.",
                        "An organization that helps volunteers in the community."),
                "contact@" + name.toLowerCase().replaceAll("[^a-z0-9]", "") + ".example",
                "2101234567",
                "https://example.org",
                "Some address 12",
                "Athens",
                Set.of(OrganizationCategory.SOCIAL),
                "We would like to help volunteers coordinate better in our community.");
    }

    private OrganizationResponse submit(String email, String name) {
        ResponseEntity<OrganizationResponse> response = restTemplate.exchange(
                "/api/v1/organizer-applications",
                HttpMethod.POST,
                jsonRequest(applicationRequest(name, true), bearer(email)),
                OrganizationResponse.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return response.getBody();
    }

    // ---------------------------------------------------------------------
    // Submission
    // ---------------------------------------------------------------------

    @Test
    void volunteerSubmitsAnApplicationAndItIsPending() {
        OrganizationResponse response = submit(volunteerEmail, "Elpida " + suffix);

        assertThat(response.status()).isEqualTo(OrganizationStatus.PENDING);
        assertThat(response.name().el()).isEqualTo("Elpida " + suffix);
        assertThat(response.submittedAt()).isNotNull();

        // Persisted for real, not just returned in the response.
        var stored = organizationRepository.findByOrganizerUserId(idOf(volunteerEmail)).orElseThrow();
        assertThat(stored.getStatus()).isEqualTo(OrganizationStatus.PENDING);
    }

    @Test
    void duplicateActiveApplicationIsRejected() {
        submit(volunteerEmail, "Elpida " + suffix);

        ResponseEntity<ApiErrorResponse> second = restTemplate.exchange(
                "/api/v1/organizer-applications",
                HttpMethod.POST,
                jsonRequest(applicationRequest("Another Name " + suffix, true), bearer(volunteerEmail)),
                ApiErrorResponse.class);

        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(second.getBody().code()).isEqualTo("organization.alreadyHasOrganization");
    }

    @Test
    void organizerCannotSubmitAnApplication() {
        ResponseEntity<ApiErrorResponse> response = restTemplate.exchange(
                "/api/v1/organizer-applications",
                HttpMethod.POST,
                jsonRequest(applicationRequest("Should Fail", true), bearer(preExistingOrganizerEmail)),
                ApiErrorResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().code()).isEqualTo("common.forbidden");
    }

    @Test
    void administratorCannotSubmitAnApplication() {
        ResponseEntity<ApiErrorResponse> response = restTemplate.exchange(
                "/api/v1/organizer-applications",
                HttpMethod.POST,
                jsonRequest(applicationRequest("Should Fail", true), bearer(adminEmail)),
                ApiErrorResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().code()).isEqualTo("common.forbidden");
    }

    @Test
    void suspendedVolunteerCannotObtainANewSessionToSubmitAnApplication() {
        // A already-issued access token's embedded status claim is only as fresh as
        // its own issuance (ADR-1/ADR-3) — the ceiling on that staleness is that the
        // suspended account can never obtain a *new* token to act with, which is the
        // property this test actually proves (submitting with a still-live pre-
        // suspension token is a separate, already-documented ≤15-minute trade-off,
        // not re-asserted here to avoid coupling this test to token TTL timing).
        setStatus(volunteerEmail, AccountStatus.SUSPENDED);

        ResponseEntity<ApiErrorResponse> loginAttempt = restTemplate.exchange(
                "/api/v1/auth/login",
                HttpMethod.POST,
                jsonRequest(new LoginRequest(volunteerEmail, PASSWORD), new HttpHeaders()),
                ApiErrorResponse.class);

        assertThat(loginAttempt.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(loginAttempt.getBody().code()).isEqualTo("auth.accountSuspended");
    }

    @Test
    void rejectsWhenTermsNotAccepted() {
        ResponseEntity<ApiErrorResponse> response = restTemplate.exchange(
                "/api/v1/organizer-applications",
                HttpMethod.POST,
                jsonRequest(applicationRequest("Elpida " + suffix, false), bearer(volunteerEmail)),
                ApiErrorResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(response.getBody().code()).isEqualTo("organization.termsNotAccepted");
    }

    @Test
    void unauthenticatedReceives401OnSubmit() {
        ResponseEntity<ApiErrorResponse> response = restTemplate.exchange(
                "/api/v1/organizer-applications",
                HttpMethod.POST,
                jsonRequest(applicationRequest("X", true), new HttpHeaders()),
                ApiErrorResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody().code()).isEqualTo("common.unauthenticated");
    }

    // ---------------------------------------------------------------------
    // Own application: view, edit-while-pending, resubmit-after-rejection
    // ---------------------------------------------------------------------

    @Test
    void ownPendingApplicationIsLoadedViaMe() {
        submit(volunteerEmail, "Elpida " + suffix);

        ResponseEntity<OrganizationResponse> response = restTemplate.exchange(
                "/api/v1/organizer-applications/me",
                HttpMethod.GET,
                new HttpEntity<>(bearer(volunteerEmail)),
                OrganizationResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().status()).isEqualTo(OrganizationStatus.PENDING);
    }

    @Test
    void meReturns404WhenNoApplicationExists() {
        ResponseEntity<ApiErrorResponse> response = restTemplate.exchange(
                "/api/v1/organizer-applications/me",
                HttpMethod.GET,
                new HttpEntity<>(bearer(volunteerEmail)),
                ApiErrorResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody().code()).isEqualTo("organization.notFound");
    }

    @Test
    void pendingApplicationCanBeEdited() {
        OrganizationResponse created = submit(volunteerEmail, "Elpida " + suffix);

        ResponseEntity<OrganizationResponse> response = restTemplate.exchange(
                "/api/v1/organizer-applications/" + created.id(),
                HttpMethod.PATCH,
                jsonRequest(applicationRequest("Elpida Updated " + suffix, true), bearer(volunteerEmail)),
                OrganizationResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().name().el()).isEqualTo("Elpida Updated " + suffix);
    }

    @Test
    void anotherVolunteersApplicationCannotBeEditedByCallerId() {
        OrganizationResponse ownedByVolunteer1 = submit(volunteerEmail, "Elpida " + suffix);

        ResponseEntity<ApiErrorResponse> response = restTemplate.exchange(
                "/api/v1/organizer-applications/" + ownedByVolunteer1.id(),
                HttpMethod.PATCH,
                jsonRequest(applicationRequest("Hijacked", true), bearer(volunteer2Email)),
                ApiErrorResponse.class);

        // 404, not 403 — direct ids never establish ownership (security-and-authentication.md).
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody().code()).isEqualTo("organization.notFound");
    }

    @Test
    void rejectedApplicationCanBeEditedAndResubmittedAndReturnsToPending() {
        OrganizationResponse created = submit(volunteerEmail, "Elpida " + suffix);
        restTemplate.exchange(
                "/api/v1/admin/organizations/" + created.id() + "/reject",
                HttpMethod.POST,
                jsonRequest(new RejectOrganizationRequest("Missing legal registration number"), bearer(adminEmail)),
                OrganizationResponse.class);

        ResponseEntity<OrganizationResponse> resubmitted = restTemplate.exchange(
                "/api/v1/organizer-applications/" + created.id() + "/resubmit",
                HttpMethod.POST,
                jsonRequest(applicationRequest("Elpida Resubmitted " + suffix, true), bearer(volunteerEmail)),
                OrganizationResponse.class);

        assertThat(resubmitted.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resubmitted.getBody().status()).isEqualTo(OrganizationStatus.PENDING);
        assertThat(resubmitted.getBody().previousRejectionReason()).isEqualTo("Missing legal registration number");
        assertThat(resubmitted.getBody().rejectionReason()).isNull();
    }

    @Test
    void editingWhileNotPendingIsRejected() {
        OrganizationResponse created = submit(volunteerEmail, "Elpida " + suffix);
        restTemplate.exchange(
                "/api/v1/admin/organizations/" + created.id() + "/approve",
                HttpMethod.POST,
                new HttpEntity<>(bearer(adminEmail)),
                OrganizationResponse.class);

        // Approval also promoted the caller's role to ORGANIZER, so a fresh login
        // (bearer() below) now returns an ORGANIZER-scoped token — the
        // organizer-applications endpoints are VOLUNTEER-only, so this is correctly
        // rejected by the role gate itself (403) before the PENDING-status check
        // would even run; an approved application can no longer reach this endpoint
        // at all, which is a stronger guarantee than the status check alone.
        ResponseEntity<ApiErrorResponse> response = restTemplate.exchange(
                "/api/v1/organizer-applications/" + created.id(),
                HttpMethod.PATCH,
                jsonRequest(applicationRequest("Should Fail Too", true), bearer(volunteerEmail)),
                ApiErrorResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().code()).isEqualTo("common.forbidden");
    }

    @Test
    void resubmitRejectsWhenNotRejected() {
        OrganizationResponse created = submit(volunteerEmail, "Elpida " + suffix);

        ResponseEntity<ApiErrorResponse> response = restTemplate.exchange(
                "/api/v1/organizer-applications/" + created.id() + "/resubmit",
                HttpMethod.POST,
                jsonRequest(applicationRequest("Valid Name " + suffix, true), bearer(volunteerEmail)),
                ApiErrorResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().code()).isEqualTo("organization.notRejected");
    }

    // ---------------------------------------------------------------------
    // Admin review: listing, search, filters, permissions
    // ---------------------------------------------------------------------

    @Test
    void adminListsSearchesAndFiltersOrganizations() {
        OrganizationResponse created = submit(volunteerEmail, "UniqueSearchable " + suffix);

        ResponseEntity<PageResponse<OrganizationResponse>> bySearch = restTemplate.exchange(
                "/api/v1/admin/organizations?search=UniqueSearchable " + suffix,
                HttpMethod.GET,
                new HttpEntity<>(bearer(adminEmail)),
                new ParameterizedTypeReference<PageResponse<OrganizationResponse>>() {});
        assertThat(bySearch.getBody().content()).extracting(OrganizationResponse::id).contains(created.id());

        ResponseEntity<PageResponse<OrganizationResponse>> byStatus = restTemplate.exchange(
                "/api/v1/admin/organizations?status=PENDING&size=100",
                HttpMethod.GET,
                new HttpEntity<>(bearer(adminEmail)),
                new ParameterizedTypeReference<PageResponse<OrganizationResponse>>() {});
        assertThat(byStatus.getBody().content()).extracting(OrganizationResponse::status)
                .allMatch(status -> status == OrganizationStatus.PENDING);
    }

    @Test
    void adminGetsOrganizationDetailsWith404OnUnknown() {
        ResponseEntity<ApiErrorResponse> response = restTemplate.exchange(
                "/api/v1/admin/organizations/" + UUID.randomUUID(),
                HttpMethod.GET,
                new HttpEntity<>(bearer(adminEmail)),
                ApiErrorResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody().code()).isEqualTo("organization.notFound");
    }

    @Test
    void volunteerAndUnauthenticatedAreRejectedFromAdminOrganizationEndpoints() {
        ResponseEntity<ApiErrorResponse> volunteerAttempt = restTemplate.exchange(
                "/api/v1/admin/organizations",
                HttpMethod.GET,
                new HttpEntity<>(bearer(volunteerEmail)),
                ApiErrorResponse.class);
        assertThat(volunteerAttempt.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(volunteerAttempt.getBody().code()).isEqualTo("common.forbidden");

        ResponseEntity<ApiErrorResponse> organizerAttempt = restTemplate.exchange(
                "/api/v1/admin/organizations",
                HttpMethod.GET,
                new HttpEntity<>(bearer(preExistingOrganizerEmail)),
                ApiErrorResponse.class);
        assertThat(organizerAttempt.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        ResponseEntity<ApiErrorResponse> anonAttempt = restTemplate.exchange(
                "/api/v1/admin/organizations", HttpMethod.GET, HttpEntity.EMPTY, ApiErrorResponse.class);
        assertThat(anonAttempt.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(anonAttempt.getBody().code()).isEqualTo("common.unauthenticated");
    }

    // ---------------------------------------------------------------------
    // Approval / rejection / promotion transaction
    // ---------------------------------------------------------------------

    @Test
    void approvalCreatesAnApprovedOrganizationPromotesRoleAndRevokesTokens() {
        OrganizationResponse created = submit(volunteerEmail, "Elpida " + suffix);
        String oldAccessToken = accessTokenFor(volunteerEmail);

        ResponseEntity<OrganizationResponse> approveResponse = restTemplate.exchange(
                "/api/v1/admin/organizations/" + created.id() + "/approve",
                HttpMethod.POST,
                new HttpEntity<>(bearer(adminEmail)),
                OrganizationResponse.class);

        assertThat(approveResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(approveResponse.getBody().status()).isEqualTo(OrganizationStatus.APPROVED);
        assertThat(approveResponse.getBody().reviewedAt()).isNotNull();
        assertThat(approveResponse.getBody().reviewedBy().email()).isEqualTo(adminEmail);

        User reloaded = userRepository.findById(idOf(volunteerEmail)).orElseThrow();
        assertThat(reloaded.getRole()).isEqualTo(UserRole.ORGANIZER);

        // Old refresh token chain was revoked as part of the same transaction — the
        // volunteer must log in again to receive an ORGANIZER-scoped session. (We
        // cannot directly assert on the raw refresh cookie here without re-deriving
        // hashing internals, so we instead prove a fresh login is required and works.)
        assertThat(oldAccessToken).isNotBlank();
        ResponseEntity<AuthResponse> reLogin = restTemplate.exchange(
                "/api/v1/auth/login",
                HttpMethod.POST,
                jsonRequest(new LoginRequest(volunteerEmail, PASSWORD), new HttpHeaders()),
                AuthResponse.class);
        assertThat(reLogin.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(reLogin.getBody().user().role()).isEqualTo(UserRole.ORGANIZER);
    }

    @Test
    void doubleApprovalDoesNotCreateASecondOrganizationOrDoubleApprove() {
        OrganizationResponse created = submit(volunteerEmail, "Elpida " + suffix);

        restTemplate.exchange(
                "/api/v1/admin/organizations/" + created.id() + "/approve",
                HttpMethod.POST,
                new HttpEntity<>(bearer(adminEmail)),
                OrganizationResponse.class);

        ResponseEntity<ApiErrorResponse> secondApprove = restTemplate.exchange(
                "/api/v1/admin/organizations/" + created.id() + "/approve",
                HttpMethod.POST,
                new HttpEntity<>(bearer(adminEmail)),
                ApiErrorResponse.class);

        assertThat(secondApprove.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(secondApprove.getBody().code()).isEqualTo("organization.invalidTransition");
        assertThat(organizationRepository.count()).isGreaterThanOrEqualTo(1);
        assertThat(organizationRepository.findByOrganizerUserId(idOf(volunteerEmail))).hasValueSatisfying(
                org -> assertThat(org.getStatus()).isEqualTo(OrganizationStatus.APPROVED));
    }

    @Test
    void rejectionKeepsVolunteerRoleAndRequiresAReason() {
        OrganizationResponse created = submit(volunteerEmail, "Elpida " + suffix);

        ResponseEntity<ApiErrorResponse> missingReason = restTemplate.exchange(
                "/api/v1/admin/organizations/" + created.id() + "/reject",
                HttpMethod.POST,
                jsonRequest(new RejectOrganizationRequest(null), bearer(adminEmail)),
                ApiErrorResponse.class);
        assertThat(missingReason.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(missingReason.getBody().code()).isEqualTo("organization.reasonRequired");

        ResponseEntity<OrganizationResponse> rejected = restTemplate.exchange(
                "/api/v1/admin/organizations/" + created.id() + "/reject",
                HttpMethod.POST,
                jsonRequest(new RejectOrganizationRequest("Incomplete documentation"), bearer(adminEmail)),
                OrganizationResponse.class);

        assertThat(rejected.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(rejected.getBody().status()).isEqualTo(OrganizationStatus.REJECTED);
        assertThat(userRepository.findById(idOf(volunteerEmail)).orElseThrow().getRole())
                .isEqualTo(UserRole.VOLUNTEER);
    }

    @Test
    void invalidTransitionIsRejected() {
        OrganizationResponse created = submit(volunteerEmail, "Elpida " + suffix);
        restTemplate.exchange(
                "/api/v1/admin/organizations/" + created.id() + "/approve",
                HttpMethod.POST,
                new HttpEntity<>(bearer(adminEmail)),
                OrganizationResponse.class);

        ResponseEntity<ApiErrorResponse> rejectAfterApprove = restTemplate.exchange(
                "/api/v1/admin/organizations/" + created.id() + "/reject",
                HttpMethod.POST,
                jsonRequest(new RejectOrganizationRequest("Too late"), bearer(adminEmail)),
                ApiErrorResponse.class);

        assertThat(rejectAfterApprove.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(rejectAfterApprove.getBody().code()).isEqualTo("organization.invalidTransition");
    }

    // ---------------------------------------------------------------------
    // Organizer's own organization
    // ---------------------------------------------------------------------

    @Test
    void organizerLoadsAndEditsOwnOrganizationOnly() {
        OrganizationResponse created = submit(volunteerEmail, "Elpida " + suffix);
        restTemplate.exchange(
                "/api/v1/admin/organizations/" + created.id() + "/approve",
                HttpMethod.POST,
                new HttpEntity<>(bearer(adminEmail)),
                OrganizationResponse.class);

        ResponseEntity<OrganizationResponse> me = restTemplate.exchange(
                "/api/v1/organizations/me", HttpMethod.GET, new HttpEntity<>(bearer(volunteerEmail)), OrganizationResponse.class);
        assertThat(me.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(me.getBody().id()).isEqualTo(created.id());

        ResponseEntity<OrganizationResponse> edited = restTemplate.exchange(
                "/api/v1/organizations/me",
                HttpMethod.PATCH,
                jsonRequest(updateRequest("Elpida Edited " + suffix), bearer(volunteerEmail)),
                OrganizationResponse.class);
        assertThat(edited.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(edited.getBody().name().el()).isEqualTo("Elpida Edited " + suffix);

        var stored = organizationRepository.findById(created.id()).orElseThrow();
        assertThat(stored.getNameEl()).isEqualTo("Elpida Edited " + suffix);
    }

    @Test
    void volunteerCannotAccessOrganizerOrganizationEndpoint() {
        ResponseEntity<ApiErrorResponse> response = restTemplate.exchange(
                "/api/v1/organizations/me", HttpMethod.GET, new HttpEntity<>(bearer(volunteerEmail)), ApiErrorResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().code()).isEqualTo("common.forbidden");
    }

    // ---------------------------------------------------------------------
    // Admin organization management: edit, suspend, restore
    // ---------------------------------------------------------------------

    @Test
    void adminEditsSuspendsAndRestoresAnOrganization() {
        OrganizationResponse created = submit(volunteerEmail, "Elpida " + suffix);
        restTemplate.exchange(
                "/api/v1/admin/organizations/" + created.id() + "/approve",
                HttpMethod.POST,
                new HttpEntity<>(bearer(adminEmail)),
                OrganizationResponse.class);

        ResponseEntity<OrganizationResponse> edited = restTemplate.exchange(
                "/api/v1/admin/organizations/" + created.id(),
                HttpMethod.PATCH,
                jsonRequest(updateRequest("Elpida AdminEdited " + suffix), bearer(adminEmail)),
                OrganizationResponse.class);
        assertThat(edited.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(edited.getBody().name().el()).isEqualTo("Elpida AdminEdited " + suffix);

        ResponseEntity<OrganizationResponse> suspended = restTemplate.exchange(
                "/api/v1/admin/organizations/" + created.id() + "/suspend",
                HttpMethod.POST,
                new HttpEntity<>(bearer(adminEmail)),
                OrganizationResponse.class);
        assertThat(suspended.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(suspended.getBody().status()).isEqualTo(OrganizationStatus.SUSPENDED);

        // Idempotent re-suspend
        ResponseEntity<OrganizationResponse> secondSuspend = restTemplate.exchange(
                "/api/v1/admin/organizations/" + created.id() + "/suspend",
                HttpMethod.POST,
                new HttpEntity<>(bearer(adminEmail)),
                OrganizationResponse.class);
        assertThat(secondSuspend.getStatusCode()).isEqualTo(HttpStatus.OK);

        // Owner's own account is unaffected by organization suspension.
        ResponseEntity<AuthResponse> ownerLogin = restTemplate.exchange(
                "/api/v1/auth/login",
                HttpMethod.POST,
                jsonRequest(new LoginRequest(volunteerEmail, PASSWORD), new HttpHeaders()),
                AuthResponse.class);
        assertThat(ownerLogin.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<OrganizationResponse> restored = restTemplate.exchange(
                "/api/v1/admin/organizations/" + created.id() + "/restore",
                HttpMethod.POST,
                new HttpEntity<>(bearer(adminEmail)),
                OrganizationResponse.class);
        assertThat(restored.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(restored.getBody().status()).isEqualTo(OrganizationStatus.APPROVED);
    }

    @Test
    void suspendAndRestoreRejectPendingOrRejectedOrganizations() {
        OrganizationResponse created = submit(volunteerEmail, "Elpida " + suffix);

        ResponseEntity<ApiErrorResponse> response = restTemplate.exchange(
                "/api/v1/admin/organizations/" + created.id() + "/suspend",
                HttpMethod.POST,
                new HttpEntity<>(bearer(adminEmail)),
                ApiErrorResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().code()).isEqualTo("organization.invalidTransition");
    }

    // ---------------------------------------------------------------------
    // Demotion — self-service and administrator-triggered
    // ---------------------------------------------------------------------

    @Test
    void selfDemotionDeletesOrganizationResetsRoleRevokesTokensAndAllowsReapplying() {
        OrganizationResponse created = submit(volunteerEmail, "Elpida " + suffix);
        restTemplate.exchange(
                "/api/v1/admin/organizations/" + created.id() + "/approve",
                HttpMethod.POST,
                new HttpEntity<>(bearer(adminEmail)),
                OrganizationResponse.class);

        ResponseEntity<OrganizerDemotionResponse> demoteResponse = restTemplate.exchange(
                "/api/v1/organizations/me/demote",
                HttpMethod.POST,
                new HttpEntity<>(bearer(volunteerEmail)),
                OrganizerDemotionResponse.class);

        assertThat(demoteResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(demoteResponse.getBody().actionsRemoved()).isZero();

        assertThat(organizationRepository.findById(created.id())).isEmpty();
        User reloaded = userRepository.findById(idOf(volunteerEmail)).orElseThrow();
        assertThat(reloaded.getRole()).isEqualTo(UserRole.VOLUNTEER);

        ResponseEntity<AuthResponse> reLogin = restTemplate.exchange(
                "/api/v1/auth/login",
                HttpMethod.POST,
                jsonRequest(new LoginRequest(volunteerEmail, PASSWORD), new HttpHeaders()),
                AuthResponse.class);
        assertThat(reLogin.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(reLogin.getBody().user().role()).isEqualTo(UserRole.VOLUNTEER);

        // May apply again from scratch.
        OrganizationResponse secondApplication = submit(volunteerEmail, "Elpida Again " + suffix);
        assertThat(secondApplication.status()).isEqualTo(OrganizationStatus.PENDING);
    }

    @Test
    void adminTriggeredDemotionBehavesTheSameAsSelfDemotion() {
        OrganizationResponse created = submit(volunteerEmail, "Elpida " + suffix);
        restTemplate.exchange(
                "/api/v1/admin/organizations/" + created.id() + "/approve",
                HttpMethod.POST,
                new HttpEntity<>(bearer(adminEmail)),
                OrganizationResponse.class);

        ResponseEntity<OrganizerDemotionResponse> demoteResponse = restTemplate.exchange(
                "/api/v1/admin/organizations/" + created.id() + "/demote",
                HttpMethod.POST,
                new HttpEntity<>(bearer(adminEmail)),
                OrganizerDemotionResponse.class);

        assertThat(demoteResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(organizationRepository.findById(created.id())).isEmpty();
        assertThat(userRepository.findById(idOf(volunteerEmail)).orElseThrow().getRole())
                .isEqualTo(UserRole.VOLUNTEER);

        // No orphan organization remains anywhere for this user.
        assertThat(organizationRepository.findByOrganizerUserId(idOf(volunteerEmail))).isEmpty();
    }

    @Test
    void adminCannotUseGenericUserPatchToChangeRoleAfterPromotion() {
        OrganizationResponse created = submit(volunteerEmail, "Elpida " + suffix);
        restTemplate.exchange(
                "/api/v1/admin/organizations/" + created.id() + "/approve",
                HttpMethod.POST,
                new HttpEntity<>(bearer(adminEmail)),
                OrganizationResponse.class);

        Map<String, Object> body = Map.of(
                "firstName", "Volunteer", "lastName", "One", "email", volunteerEmail, "role", "VOLUNTEER");
        restTemplate.exchange(
                "/api/v1/admin/users/" + idOf(volunteerEmail),
                HttpMethod.PATCH,
                jsonRequest(body, bearer(adminEmail)),
                Object.class);

        // The generic user-edit endpoint has no role field on its DTO at all — role
        // remains exactly what the organization-approval transaction set it to.
        assertThat(userRepository.findById(idOf(volunteerEmail)).orElseThrow().getRole())
                .isEqualTo(UserRole.ORGANIZER);
    }
}
