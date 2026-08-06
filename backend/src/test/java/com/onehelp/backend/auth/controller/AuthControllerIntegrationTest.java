package com.onehelp.backend.auth.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.onehelp.backend.auth.dto.AuthResponse;
import com.onehelp.backend.auth.dto.LoginRequest;
import com.onehelp.backend.auth.dto.RegisterRequest;
import com.onehelp.backend.common.web.ApiErrorResponse;
import com.onehelp.backend.users.dto.CurrentUserResponse;
import com.onehelp.backend.users.repository.UserRepository;
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
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.test.context.ActiveProfiles;

/**
 * Full-stack authentication flow against a real MySQL test database (no mocks) —
 * proves SecurityConfig, the JWT filter, cookie handling, and every service-layer
 * rule actually work wired together end to end, not just in isolation (see the
 * unit tests in {@code auth.service.impl}).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class AuthControllerIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

    private final String testEmail = "it-" + UUID.randomUUID() + "@onehelp.local";

    @BeforeEach
    void useApacheHttpClient() {
        // The JDK's default HttpURLConnection-backed request factory throws
        // "cannot retry due to server authentication, in streaming mode" on a POST
        // that receives a non-2xx JSON body back — a known HttpURLConnection
        // limitation, unrelated to this API. Apache HttpClient5 doesn't have it.
        restTemplate.getRestTemplate().setRequestFactory(new HttpComponentsClientHttpRequestFactory());
    }

    @AfterEach
    void cleanUp() {
        userRepository.findByEmail(testEmail).ifPresent(userRepository::delete);
    }

    private HttpEntity<Object> jsonRequest(Object body, HttpHeaders extraHeaders) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
        headers.addAll(extraHeaders);
        return new HttpEntity<>(body, headers);
    }

    private String extractRefreshCookie(ResponseEntity<?> response) {
        String setCookie = response.getHeaders().getFirst(HttpHeaders.SET_COOKIE);
        assertThat(setCookie).as("Set-Cookie header").isNotNull();
        return setCookie.split(";", 2)[0];
    }

    @Test
    void fullRegisterLoginRefreshLogoutFlowWorksEndToEnd() {
        RegisterRequest registerRequest =
                new RegisterRequest("Δήμητρα", "Παπαδοπούλου", testEmail, "Str0ngPass!");
        ResponseEntity<AuthResponse> registerResponse = restTemplate.exchange(
                "/api/v1/auth/register",
                HttpMethod.POST,
                jsonRequest(registerRequest, new HttpHeaders()),
                AuthResponse.class);

        assertThat(registerResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(registerResponse.getBody()).isNotNull();
        assertThat(registerResponse.getBody().accessToken()).isNotBlank();
        assertThat(registerResponse.getBody().expiresIn()).isEqualTo(900L);
        assertThat(registerResponse.getBody().user().email()).isEqualTo(testEmail);
        assertThat(registerResponse.getBody().user().role().name()).isEqualTo("VOLUNTEER");
        String refreshCookie = extractRefreshCookie(registerResponse);
        assertThat(refreshCookie).doesNotContain("Str0ngPass!");

        // GET /me with the access token
        HttpHeaders authHeader = new HttpHeaders();
        authHeader.setBearerAuth(registerResponse.getBody().accessToken());
        ResponseEntity<CurrentUserResponse> meResponse = restTemplate.exchange(
                "/api/v1/auth/me", HttpMethod.GET, new HttpEntity<>(authHeader), CurrentUserResponse.class);
        assertThat(meResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(meResponse.getBody()).isNotNull();
        assertThat(meResponse.getBody().email()).isEqualTo(testEmail);

        // POST /login with the same credentials
        ResponseEntity<AuthResponse> loginResponse = restTemplate.exchange(
                "/api/v1/auth/login",
                HttpMethod.POST,
                jsonRequest(new LoginRequest(testEmail, "Str0ngPass!"), new HttpHeaders()),
                AuthResponse.class);
        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);

        // POST /refresh rotates the token
        HttpHeaders cookieHeader = new HttpHeaders();
        cookieHeader.add(HttpHeaders.COOKIE, refreshCookie);
        ResponseEntity<AuthResponse> refreshResponse = restTemplate.exchange(
                "/api/v1/auth/refresh", HttpMethod.POST, new HttpEntity<>(cookieHeader), AuthResponse.class);
        assertThat(refreshResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        String rotatedCookie = extractRefreshCookie(refreshResponse);
        assertThat(rotatedCookie).isNotEqualTo(refreshCookie);

        // The old (pre-rotation) cookie is now a reuse signal — expect 401 and full revocation
        ResponseEntity<ApiErrorResponse> reuseResponse = restTemplate.exchange(
                "/api/v1/auth/refresh", HttpMethod.POST, new HttpEntity<>(cookieHeader), ApiErrorResponse.class);
        assertThat(reuseResponse.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(reuseResponse.getBody()).isNotNull();
        assertThat(reuseResponse.getBody().code()).isEqualTo("auth.invalidSession");

        // Because reuse revoked the whole chain, even the still-fresh rotated cookie now fails
        HttpHeaders rotatedCookieHeader = new HttpHeaders();
        rotatedCookieHeader.add(HttpHeaders.COOKIE, rotatedCookie);
        ResponseEntity<ApiErrorResponse> afterReuseResponse = restTemplate.exchange(
                "/api/v1/auth/refresh", HttpMethod.POST, new HttpEntity<>(rotatedCookieHeader), ApiErrorResponse.class);
        assertThat(afterReuseResponse.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void logoutRevokesTheRefreshTokenSoItCannotBeUsedAgain() {
        RegisterRequest registerRequest =
                new RegisterRequest("A", "B", testEmail, "Str0ngPass!");
        ResponseEntity<AuthResponse> registerResponse = restTemplate.exchange(
                "/api/v1/auth/register",
                HttpMethod.POST,
                jsonRequest(registerRequest, new HttpHeaders()),
                AuthResponse.class);
        String refreshCookie = extractRefreshCookie(registerResponse);

        HttpHeaders logoutHeaders = new HttpHeaders();
        logoutHeaders.setBearerAuth(registerResponse.getBody().accessToken());
        logoutHeaders.add(HttpHeaders.COOKIE, refreshCookie);
        ResponseEntity<Void> logoutResponse = restTemplate.exchange(
                "/api/v1/auth/logout", HttpMethod.POST, new HttpEntity<>(logoutHeaders), Void.class);
        assertThat(logoutResponse.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        HttpHeaders cookieHeader = new HttpHeaders();
        cookieHeader.add(HttpHeaders.COOKIE, refreshCookie);
        ResponseEntity<ApiErrorResponse> refreshAfterLogout = restTemplate.exchange(
                "/api/v1/auth/refresh", HttpMethod.POST, new HttpEntity<>(cookieHeader), ApiErrorResponse.class);
        assertThat(refreshAfterLogout.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void registerRejectsADuplicateEmailWith409() {
        RegisterRequest registerRequest = new RegisterRequest("A", "B", testEmail, "Str0ngPass!");
        restTemplate.postForEntity("/api/v1/auth/register", jsonRequest(registerRequest, new HttpHeaders()), AuthResponse.class);

        ResponseEntity<ApiErrorResponse> secondAttempt = restTemplate.exchange(
                "/api/v1/auth/register",
                HttpMethod.POST,
                jsonRequest(registerRequest, new HttpHeaders()),
                ApiErrorResponse.class);

        assertThat(secondAttempt.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(secondAttempt.getBody()).isNotNull();
        assertThat(secondAttempt.getBody().code()).isEqualTo("auth.duplicateEmail");
    }

    @Test
    void registerRejectsAShortPasswordWith422() {
        RegisterRequest registerRequest = new RegisterRequest("A", "B", testEmail, "short");

        ResponseEntity<ApiErrorResponse> response = restTemplate.exchange(
                "/api/v1/auth/register",
                HttpMethod.POST,
                jsonRequest(registerRequest, new HttpHeaders()),
                ApiErrorResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().fieldErrors()).containsKey("password");
    }

    @Test
    void loginRejectsAnUnknownEmailWith401() {
        ResponseEntity<ApiErrorResponse> response = restTemplate.exchange(
                "/api/v1/auth/login",
                HttpMethod.POST,
                jsonRequest(new LoginRequest("nobody-" + UUID.randomUUID() + "@onehelp.local", "whatever"), new HttpHeaders()),
                ApiErrorResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo("auth.unknownEmail");
    }

    @Test
    void meWithoutAnAccessTokenIs401WithTheApiErrorShape() {
        ResponseEntity<ApiErrorResponse> response =
                restTemplate.exchange("/api/v1/auth/me", HttpMethod.GET, HttpEntity.EMPTY, ApiErrorResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo("common.unauthenticated");
    }
}
