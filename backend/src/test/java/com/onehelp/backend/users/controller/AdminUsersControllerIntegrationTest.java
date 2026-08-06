package com.onehelp.backend.users.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.onehelp.backend.auth.dto.AuthResponse;
import com.onehelp.backend.auth.dto.RegisterRequest;
import com.onehelp.backend.common.web.ApiErrorResponse;
import com.onehelp.backend.common.web.PageResponse;
import com.onehelp.backend.users.dto.UserDetailsResponse;
import com.onehelp.backend.users.dto.UserStatusChangeResponse;
import com.onehelp.backend.users.dto.UserSummaryResponse;
import com.onehelp.backend.users.entity.AccountStatus;
import com.onehelp.backend.users.entity.User;
import com.onehelp.backend.users.entity.UserRole;
import com.onehelp.backend.users.repository.UserRepository;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.test.context.ActiveProfiles;

/**
 * Full-stack tests against a real MySQL test database (no mocks) — every checklist
 * item in the phase brief's Part 20/21 that a live HTTP call, not a unit test, is the
 * only honest way to prove: real security (role/authentication), real transactional
 * refresh-token revocation, and the real login-blocked/re-login contract.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class AdminUsersControllerIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

    private final String suffix = UUID.randomUUID().toString();
    private final String adminEmail = "admin-" + suffix + "@onehelp.local";
    private final String volunteerEmail = "volunteer-" + suffix + "@onehelp.local";
    private final String organizerEmail = "organizer-" + suffix + "@onehelp.local";
    private static final String PASSWORD = "Str0ngPass!";

    @BeforeEach
    void useApacheHttpClientAndSeedUsers() {
        restTemplate.getRestTemplate().setRequestFactory(new HttpComponentsClientHttpRequestFactory());

        register(adminEmail, "Admin", "One");
        register(volunteerEmail, "Volunteer", "One");
        register(organizerEmail, "Organizer", "One");

        // No promotion endpoint exists (by design, this phase) — tests establish the
        // ORGANIZER/ADMINISTRATOR roles directly via the repository, exactly the
        // "local-development-only" SQL-role-change pattern this phase documents for
        // real developers, never a public endpoint.
        setRole(adminEmail, UserRole.ADMINISTRATOR);
        setRole(organizerEmail, UserRole.ORGANIZER);
    }

    @AfterEach
    void cleanUp() {
        userRepository.findByEmail(adminEmail).ifPresent(userRepository::delete);
        userRepository.findByEmail(volunteerEmail).ifPresent(userRepository::delete);
        userRepository.findByEmail(organizerEmail).ifPresent(userRepository::delete);
    }

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

    private HttpEntity<Object> jsonRequest(Object body, HttpHeaders extraHeaders) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.addAll(extraHeaders);
        return new HttpEntity<>(body, headers);
    }

    private String accessTokenFor(String email) {
        var response = restTemplate.postForEntity(
                "/api/v1/auth/login",
                jsonRequest(new com.onehelp.backend.auth.dto.LoginRequest(email, PASSWORD), new HttpHeaders()),
                AuthResponse.class);
        return response.getBody().accessToken();
    }

    private HttpHeaders bearer(String email) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessTokenFor(email));
        return headers;
    }

    private String refreshCookieFor(String email) {
        var loginResponse = restTemplate.exchange(
                "/api/v1/auth/login",
                HttpMethod.POST,
                jsonRequest(new com.onehelp.backend.auth.dto.LoginRequest(email, PASSWORD), new HttpHeaders()),
                AuthResponse.class);
        String setCookie = loginResponse.getHeaders().getFirst(HttpHeaders.SET_COOKIE);
        return setCookie.split(";", 2)[0];
    }

    private UUID idOf(String email) {
        return userRepository.findByEmail(email).orElseThrow().getId();
    }

    // ---------------------------------------------------------------------
    // Listing, pagination, search, filters
    // ---------------------------------------------------------------------

    @Test
    void adminListsUsersAndFindsTheSeededOnes() {
        ResponseEntity<PageResponse<UserSummaryResponse>> response = restTemplate.exchange(
                "/api/v1/admin/users?size=100",
                HttpMethod.GET,
                new HttpEntity<>(bearer(adminEmail)),
                new org.springframework.core.ParameterizedTypeReference<PageResponse<UserSummaryResponse>>() {});

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        List<String> emails = response.getBody().content().stream().map(UserSummaryResponse::email).toList();
        assertThat(emails).contains(adminEmail, volunteerEmail, organizerEmail);
    }

    @Test
    void adminSearchFindsByFirstNameLastNameOrEmail() {
        ResponseEntity<PageResponse<UserSummaryResponse>> byFirstName = restTemplate.exchange(
                "/api/v1/admin/users?search=Volunteer",
                HttpMethod.GET,
                new HttpEntity<>(bearer(adminEmail)),
                new org.springframework.core.ParameterizedTypeReference<PageResponse<UserSummaryResponse>>() {});
        assertThat(byFirstName.getBody().content()).extracting(UserSummaryResponse::email).contains(volunteerEmail);

        ResponseEntity<PageResponse<UserSummaryResponse>> byEmail = restTemplate.exchange(
                "/api/v1/admin/users?search=" + organizerEmail,
                HttpMethod.GET,
                new HttpEntity<>(bearer(adminEmail)),
                new org.springframework.core.ParameterizedTypeReference<PageResponse<UserSummaryResponse>>() {});
        assertThat(byEmail.getBody().content()).extracting(UserSummaryResponse::email).contains(organizerEmail);
    }

    @Test
    void adminFiltersByRoleAndStatus() {
        ResponseEntity<PageResponse<UserSummaryResponse>> organizersOnly = restTemplate.exchange(
                "/api/v1/admin/users?role=ORGANIZER&size=100",
                HttpMethod.GET,
                new HttpEntity<>(bearer(adminEmail)),
                new org.springframework.core.ParameterizedTypeReference<PageResponse<UserSummaryResponse>>() {});
        assertThat(organizersOnly.getBody().content()).extracting(UserSummaryResponse::role)
                .allMatch(role -> role == UserRole.ORGANIZER);

        ResponseEntity<PageResponse<UserSummaryResponse>> activeOnly = restTemplate.exchange(
                "/api/v1/admin/users?status=ACTIVE&size=100",
                HttpMethod.GET,
                new HttpEntity<>(bearer(adminEmail)),
                new org.springframework.core.ParameterizedTypeReference<PageResponse<UserSummaryResponse>>() {});
        assertThat(activeOnly.getBody().content()).extracting(UserSummaryResponse::status)
                .allMatch(status -> status == AccountStatus.ACTIVE);
    }

    @Test
    void adminPaginationRespectsSizeAndCapsAt100() {
        ResponseEntity<PageResponse<UserSummaryResponse>> capped = restTemplate.exchange(
                "/api/v1/admin/users?size=500",
                HttpMethod.GET,
                new HttpEntity<>(bearer(adminEmail)),
                new org.springframework.core.ParameterizedTypeReference<PageResponse<UserSummaryResponse>>() {});
        assertThat(capped.getBody().size()).isEqualTo(100);

        ResponseEntity<PageResponse<UserSummaryResponse>> smallPage = restTemplate.exchange(
                "/api/v1/admin/users?size=1&page=0",
                HttpMethod.GET,
                new HttpEntity<>(bearer(adminEmail)),
                new org.springframework.core.ParameterizedTypeReference<PageResponse<UserSummaryResponse>>() {});
        assertThat(smallPage.getBody().content()).hasSize(1);
    }

    // ---------------------------------------------------------------------
    // Details
    // ---------------------------------------------------------------------

    @Test
    void adminGetsUserDetails() {
        ResponseEntity<UserDetailsResponse> response = restTemplate.exchange(
                "/api/v1/admin/users/" + idOf(volunteerEmail),
                HttpMethod.GET,
                new HttpEntity<>(bearer(adminEmail)),
                UserDetailsResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().email()).isEqualTo(volunteerEmail);
    }

    @Test
    void adminGetsDetailsFor404OnUnknownUser() {
        ResponseEntity<ApiErrorResponse> response = restTemplate.exchange(
                "/api/v1/admin/users/" + UUID.randomUUID(),
                HttpMethod.GET,
                new HttpEntity<>(bearer(adminEmail)),
                ApiErrorResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody().code()).isEqualTo("users.notFound");
    }

    // ---------------------------------------------------------------------
    // Profile update
    // ---------------------------------------------------------------------

    @Test
    void adminUpdatesAUsersProfileAndItPersistsInMySql() {
        Map<String, String> body = Map.of(
                "firstName", "Updated", "lastName", "Volunteer", "email", volunteerEmail, "localePreference", "en");
        ResponseEntity<UserDetailsResponse> response = restTemplate.exchange(
                "/api/v1/admin/users/" + idOf(volunteerEmail),
                HttpMethod.PATCH,
                jsonRequest(body, bearer(adminEmail)),
                UserDetailsResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().firstName()).isEqualTo("Updated");

        User reloaded = userRepository.findByEmail(volunteerEmail).orElseThrow();
        assertThat(reloaded.getFirstName()).isEqualTo("Updated");
        assertThat(reloaded.getLocalePreference()).isEqualTo("en");
    }

    @Test
    void adminUpdateValidationFailureReturns422() {
        Map<String, String> body = Map.of("firstName", "", "lastName", "X", "email", "not-an-email");
        ResponseEntity<ApiErrorResponse> response = restTemplate.exchange(
                "/api/v1/admin/users/" + idOf(volunteerEmail),
                HttpMethod.PATCH,
                jsonRequest(body, bearer(adminEmail)),
                ApiErrorResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(response.getBody().fieldErrors()).containsKeys("firstName", "email");
    }

    @Test
    void adminUpdateRejectsAnEmailAlreadyTakenBySomeoneElse() {
        Map<String, String> body = Map.of("firstName", "X", "lastName", "Y", "email", organizerEmail);
        ResponseEntity<ApiErrorResponse> response = restTemplate.exchange(
                "/api/v1/admin/users/" + idOf(volunteerEmail),
                HttpMethod.PATCH,
                jsonRequest(body, bearer(adminEmail)),
                ApiErrorResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().code()).isEqualTo("admin.duplicateEmail");
    }

    @Test
    void adminUpdateIgnoresAClientSuppliedRoleField() {
        Map<String, Object> body = Map.of(
                "firstName", "X", "lastName", "Y", "email", volunteerEmail, "role", "ADMINISTRATOR");
        restTemplate.exchange(
                "/api/v1/admin/users/" + idOf(volunteerEmail),
                HttpMethod.PATCH,
                jsonRequest(body, bearer(adminEmail)),
                UserDetailsResponse.class);

        User reloaded = userRepository.findByEmail(volunteerEmail).orElseThrow();
        assertThat(reloaded.getRole()).isEqualTo(UserRole.VOLUNTEER);
    }

    // ---------------------------------------------------------------------
    // Suspend / reactivate / refresh-token revocation
    // ---------------------------------------------------------------------

    @Test
    void suspendRevokesRefreshTokensAndBlocksLoginThenReactivateAllowsLoginAgainButOldTokenStaysInvalid() {
        String oldRefreshCookie = refreshCookieFor(volunteerEmail);

        // Suspend
        ResponseEntity<UserStatusChangeResponse> suspendResponse = restTemplate.exchange(
                "/api/v1/admin/users/" + idOf(volunteerEmail) + "/suspend",
                HttpMethod.POST,
                new HttpEntity<>(bearer(adminEmail)),
                UserStatusChangeResponse.class);
        assertThat(suspendResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(suspendResponse.getBody().status()).isEqualTo(AccountStatus.SUSPENDED);

        // Every refresh token for the volunteer is revoked
        assertThat(userRepository.findByEmail(volunteerEmail).orElseThrow().getStatus())
                .isEqualTo(AccountStatus.SUSPENDED);

        // Login now fails
        ResponseEntity<ApiErrorResponse> loginAttempt = restTemplate.exchange(
                "/api/v1/auth/login",
                HttpMethod.POST,
                jsonRequest(new com.onehelp.backend.auth.dto.LoginRequest(volunteerEmail, PASSWORD), new HttpHeaders()),
                ApiErrorResponse.class);
        assertThat(loginAttempt.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(loginAttempt.getBody().code()).isEqualTo("auth.accountSuspended");

        // The pre-suspension refresh cookie is now dead too
        HttpHeaders oldCookieHeader = new HttpHeaders();
        oldCookieHeader.add(HttpHeaders.COOKIE, oldRefreshCookie);
        ResponseEntity<ApiErrorResponse> refreshWithOldCookie = restTemplate.exchange(
                "/api/v1/auth/refresh", HttpMethod.POST, new HttpEntity<>(oldCookieHeader), ApiErrorResponse.class);
        assertThat(refreshWithOldCookie.getStatusCode()).isIn(HttpStatus.FORBIDDEN, HttpStatus.UNAUTHORIZED);

        // Idempotent re-suspend
        ResponseEntity<UserStatusChangeResponse> secondSuspend = restTemplate.exchange(
                "/api/v1/admin/users/" + idOf(volunteerEmail) + "/suspend",
                HttpMethod.POST,
                new HttpEntity<>(bearer(adminEmail)),
                UserStatusChangeResponse.class);
        assertThat(secondSuspend.getStatusCode()).isEqualTo(HttpStatus.OK);

        // Reactivate
        ResponseEntity<UserStatusChangeResponse> reactivateResponse = restTemplate.exchange(
                "/api/v1/admin/users/" + idOf(volunteerEmail) + "/reactivate",
                HttpMethod.POST,
                new HttpEntity<>(bearer(adminEmail)),
                UserStatusChangeResponse.class);
        assertThat(reactivateResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(reactivateResponse.getBody().status()).isEqualTo(AccountStatus.ACTIVE);

        // Can log in again with a brand-new session
        ResponseEntity<AuthResponse> reLogin = restTemplate.exchange(
                "/api/v1/auth/login",
                HttpMethod.POST,
                jsonRequest(new com.onehelp.backend.auth.dto.LoginRequest(volunteerEmail, PASSWORD), new HttpHeaders()),
                AuthResponse.class);
        assertThat(reLogin.getStatusCode()).isEqualTo(HttpStatus.OK);

        // But the OLD (pre-suspension) refresh cookie remains unusable even after reactivation
        ResponseEntity<ApiErrorResponse> oldCookieAfterReactivate = restTemplate.exchange(
                "/api/v1/auth/refresh", HttpMethod.POST, new HttpEntity<>(oldCookieHeader), ApiErrorResponse.class);
        assertThat(oldCookieAfterReactivate.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(oldCookieAfterReactivate.getBody().code()).isEqualTo("auth.invalidSession");
    }

    @Test
    void reactivateIsIdempotentOnAnAlreadyActiveUser() {
        ResponseEntity<UserStatusChangeResponse> response = restTemplate.exchange(
                "/api/v1/admin/users/" + idOf(volunteerEmail) + "/reactivate",
                HttpMethod.POST,
                new HttpEntity<>(bearer(adminEmail)),
                UserStatusChangeResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().status()).isEqualTo(AccountStatus.ACTIVE);
    }

    // ---------------------------------------------------------------------
    // Authorization
    // ---------------------------------------------------------------------

    @Test
    void adminCannotSuspendThemselves() {
        ResponseEntity<ApiErrorResponse> response = restTemplate.exchange(
                "/api/v1/admin/users/" + idOf(adminEmail) + "/suspend",
                HttpMethod.POST,
                new HttpEntity<>(bearer(adminEmail)),
                ApiErrorResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().code()).isEqualTo("users.selfSuspensionNotAllowed");
    }

    @Test
    void volunteerReceives403FromAdminEndpoints() {
        ResponseEntity<ApiErrorResponse> response = restTemplate.exchange(
                "/api/v1/admin/users",
                HttpMethod.GET,
                new HttpEntity<>(bearer(volunteerEmail)),
                ApiErrorResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().code()).isEqualTo("common.forbidden");
    }

    @Test
    void organizerReceives403FromAdminEndpoints() {
        ResponseEntity<ApiErrorResponse> response = restTemplate.exchange(
                "/api/v1/admin/users",
                HttpMethod.GET,
                new HttpEntity<>(bearer(organizerEmail)),
                ApiErrorResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().code()).isEqualTo("common.forbidden");
    }

    @Test
    void unauthenticatedReceives401FromAdminEndpoints() {
        ResponseEntity<ApiErrorResponse> response =
                restTemplate.exchange("/api/v1/admin/users", HttpMethod.GET, HttpEntity.EMPTY, ApiErrorResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody().code()).isEqualTo("common.unauthenticated");
    }

    @Test
    void administratorSucceedsWhereVolunteerAndOrganizerAreForbidden() {
        ResponseEntity<PageResponse<UserSummaryResponse>> response = restTemplate.exchange(
                "/api/v1/admin/users",
                HttpMethod.GET,
                new HttpEntity<>(bearer(adminEmail)),
                new org.springframework.core.ParameterizedTypeReference<PageResponse<UserSummaryResponse>>() {});

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    // ---------------------------------------------------------------------
    // /users/me
    // ---------------------------------------------------------------------

    @Test
    void usersMeReturnsTheAuthenticatedProfileAndMatchesAuthMe() {
        ResponseEntity<com.onehelp.backend.users.dto.CurrentUserResponse> usersMe = restTemplate.exchange(
                "/api/v1/users/me",
                HttpMethod.GET,
                new HttpEntity<>(bearer(volunteerEmail)),
                com.onehelp.backend.users.dto.CurrentUserResponse.class);
        ResponseEntity<com.onehelp.backend.users.dto.CurrentUserResponse> authMe = restTemplate.exchange(
                "/api/v1/auth/me",
                HttpMethod.GET,
                new HttpEntity<>(bearer(volunteerEmail)),
                com.onehelp.backend.users.dto.CurrentUserResponse.class);

        assertThat(usersMe.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(usersMe.getBody()).isEqualTo(authMe.getBody());
    }

    @Test
    void patchUsersMeUpdatesFirstLastAndLocaleOnly() {
        Map<String, String> body = Map.of("firstName", "SelfEdited", "lastName", "Volunteer", "localePreference", "en");
        ResponseEntity<com.onehelp.backend.users.dto.CurrentUserResponse> response = restTemplate.exchange(
                "/api/v1/users/me",
                HttpMethod.PATCH,
                jsonRequest(body, bearer(volunteerEmail)),
                com.onehelp.backend.users.dto.CurrentUserResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().firstName()).isEqualTo("SelfEdited");

        User reloaded = userRepository.findByEmail(volunteerEmail).orElseThrow();
        assertThat(reloaded.getFirstName()).isEqualTo("SelfEdited");
        assertThat(reloaded.getEmail()).isEqualTo(volunteerEmail); // unchanged — not editable here
    }
}
