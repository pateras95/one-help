package com.onehelp.backend.auth.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.onehelp.backend.auth.dto.LoginRequest;
import com.onehelp.backend.auth.dto.RegisterRequest;
import com.onehelp.backend.auth.entity.RefreshToken;
import com.onehelp.backend.auth.exception.DuplicateEmailException;
import com.onehelp.backend.auth.exception.InvalidPasswordException;
import com.onehelp.backend.auth.exception.InvalidSessionException;
import com.onehelp.backend.auth.exception.UnknownEmailException;
import com.onehelp.backend.auth.service.AuthenticationService.IssuedSession;
import com.onehelp.backend.auth.service.RefreshTokenService;
import com.onehelp.backend.common.exception.AccountSuspendedException;
import com.onehelp.backend.common.security.AccessTokenService;
import com.onehelp.backend.users.dto.CurrentUserResponse;
import com.onehelp.backend.users.entity.AccountStatus;
import com.onehelp.backend.users.entity.User;
import com.onehelp.backend.users.entity.UserRole;
import com.onehelp.backend.users.mapper.UserMapper;
import com.onehelp.backend.users.repository.UserRepository;
import com.onehelp.backend.users.service.UserService;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Pure unit tests (Mockito-mocked collaborators, no Spring context, no database) of
 * every business rule in security-and-authentication.md's authentication flow.
 */
@ExtendWith(MockitoExtension.class)
class AuthenticationServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefreshTokenService refreshTokenService;

    @Mock
    private AccessTokenService accessTokenService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private UserMapper userMapper;

    @Mock
    private UserService userService;

    private AuthenticationServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new AuthenticationServiceImpl(
                userRepository, refreshTokenService, accessTokenService, passwordEncoder, userMapper, userService);
    }

    private static User activeUser() {
        User user = new User(UUID.randomUUID(), "Δήμητρα", "Παπαδοπούλου", "volunteer@onehelp.local", "hash");
        user.setRole(UserRole.VOLUNTEER);
        user.setStatus(AccountStatus.ACTIVE);
        return user;
    }

    private static RefreshToken token(User owner) {
        return new RefreshToken(UUID.randomUUID(), owner, "hash", Instant.now(), Instant.now().plusSeconds(60));
    }

    private void stubAccessAndMapping(User user) {
        when(accessTokenService.issueFor(user)).thenReturn(new AccessTokenService.IssuedAccessToken("access", 900L));
        when(userMapper.toCurrentUserResponse(user))
                .thenReturn(new CurrentUserResponse(
                        user.getId(), user.getFirstName(), user.getLastName(), user.getEmail(),
                        user.getRole(), user.getStatus(), user.getAvatarInitials(), "el", Instant.now()));
    }

    private void stubIssuedTokens(User user) {
        stubAccessAndMapping(user);
        when(refreshTokenService.issue(any(), any()))
                .thenReturn(new RefreshTokenService.IssuedRefreshToken("raw-refresh", token(user)));
    }

    @Test
    void registerCreatesAVolunteerAndAutoLogsIn() {
        RegisterRequest request = new RegisterRequest("Νίκος", "Οικονόμου", "new@onehelp.local", "Str0ngPass!");
        when(userRepository.existsByEmail("new@onehelp.local")).thenReturn(false);
        when(passwordEncoder.encode("Str0ngPass!")).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(accessTokenService.issueFor(any())).thenReturn(new AccessTokenService.IssuedAccessToken("access", 900L));
        when(refreshTokenService.issue(any(), any()))
                .thenReturn(new RefreshTokenService.IssuedRefreshToken("raw-refresh", token(activeUser())));
        when(userMapper.toCurrentUserResponse(any())).thenReturn(
                new CurrentUserResponse(UUID.randomUUID(), "Νίκος", "Οικονόμου", "new@onehelp.local",
                        UserRole.VOLUNTEER, AccountStatus.ACTIVE, "NΟ", "el", Instant.now()));

        IssuedSession session = service.register(request, "test-agent");

        assertThat(session.accessToken()).isEqualTo("access");
        assertThat(session.refreshToken()).isEqualTo("raw-refresh");
        assertThat(session.user().role()).isEqualTo(UserRole.VOLUNTEER);
    }

    @Test
    void registerRejectsADuplicateEmail() {
        RegisterRequest request = new RegisterRequest("A", "B", "taken@onehelp.local", "Str0ngPass!");
        when(userRepository.existsByEmail("taken@onehelp.local")).thenReturn(true);

        assertThatThrownBy(() -> service.register(request, "test-agent"))
                .isInstanceOf(DuplicateEmailException.class);
        verify(userRepository, never()).save(any());
    }

    @Test
    void loginSucceedsForAMatchingActiveUser() {
        User user = activeUser();
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Volunteer123!", "hash")).thenReturn(true);
        stubIssuedTokens(user);

        IssuedSession session = service.login(new LoginRequest(user.getEmail(), "Volunteer123!"), "test-agent");

        assertThat(session.accessToken()).isEqualTo("access");
        assertThat(session.refreshToken()).isEqualTo("raw-refresh");
    }

    @Test
    void loginRejectsAnUnknownEmail() {
        when(userRepository.findByEmail("nobody@onehelp.local")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.login(new LoginRequest("nobody@onehelp.local", "x"), "test-agent"))
                .isInstanceOf(UnknownEmailException.class);
    }

    @Test
    void loginRejectsAWrongPassword() {
        User user = activeUser();
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "hash")).thenReturn(false);

        assertThatThrownBy(() -> service.login(new LoginRequest(user.getEmail(), "wrong"), "test-agent"))
                .isInstanceOf(InvalidPasswordException.class);
    }

    @Test
    void loginRejectsASuspendedAccountBeforeIssuingAnyToken() {
        User user = activeUser();
        user.setStatus(AccountStatus.SUSPENDED);
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Volunteer123!", "hash")).thenReturn(true);

        assertThatThrownBy(() -> service.login(new LoginRequest(user.getEmail(), "Volunteer123!"), "test-agent"))
                .isInstanceOf(AccountSuspendedException.class);
        verify(accessTokenService, never()).issueFor(any());
        verify(refreshTokenService, never()).issue(any(), any());
    }

    @Test
    void refreshRotatesAValidToken() {
        User user = activeUser();
        RefreshToken token = new RefreshToken(UUID.randomUUID(), user, "hash", Instant.now(), Instant.now().plusSeconds(60));
        when(refreshTokenService.findByRawToken("raw")).thenReturn(Optional.of(token));
        when(refreshTokenService.rotate(token, "test-agent"))
                .thenReturn(new RefreshTokenService.IssuedRefreshToken("new-raw", token(user)));
        stubAccessAndMapping(user);

        IssuedSession session = service.refresh("raw", "test-agent");

        assertThat(session.refreshToken()).isEqualTo("new-raw");
        assertThat(session.accessToken()).isEqualTo("access");
    }

    @Test
    void refreshRejectsAnUnrecognizedToken() {
        when(refreshTokenService.findByRawToken("raw")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.refresh("raw", "test-agent")).isInstanceOf(InvalidSessionException.class);
    }

    @Test
    void refreshRejectsAMissingToken() {
        assertThatThrownBy(() -> service.refresh(null, "test-agent")).isInstanceOf(InvalidSessionException.class);
        assertThatThrownBy(() -> service.refresh("", "test-agent")).isInstanceOf(InvalidSessionException.class);
    }

    @Test
    void refreshDetectsReuseAndRevokesTheWholeChain() {
        User user = activeUser();
        RefreshToken reused = new RefreshToken(UUID.randomUUID(), user, "hash", Instant.now(), Instant.now().plusSeconds(60));
        reused.setRevokedAt(Instant.now().minusSeconds(10));
        when(refreshTokenService.findByRawToken("raw")).thenReturn(Optional.of(reused));

        assertThatThrownBy(() -> service.refresh("raw", "test-agent")).isInstanceOf(InvalidSessionException.class);
        verify(refreshTokenService, times(1)).revokeAllForUser(user);
        verify(refreshTokenService, never()).rotate(any(), any());
    }

    @Test
    void refreshRejectsAnExpiredToken() {
        User user = activeUser();
        RefreshToken expired = new RefreshToken(
                UUID.randomUUID(), user, "hash", Instant.now().minusSeconds(120), Instant.now().minusSeconds(60));
        when(refreshTokenService.findByRawToken("raw")).thenReturn(Optional.of(expired));

        assertThatThrownBy(() -> service.refresh("raw", "test-agent")).isInstanceOf(InvalidSessionException.class);
        verify(refreshTokenService, never()).rotate(any(), any());
    }

    @Test
    void refreshRejectsASuspendedUsersLiveStatusEvenWithAValidToken() {
        User user = activeUser();
        user.setStatus(AccountStatus.SUSPENDED);
        RefreshToken token = new RefreshToken(UUID.randomUUID(), user, "hash", Instant.now(), Instant.now().plusSeconds(60));
        when(refreshTokenService.findByRawToken("raw")).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> service.refresh("raw", "test-agent")).isInstanceOf(AccountSuspendedException.class);
        verify(refreshTokenService, never()).rotate(any(), any());
    }

    @Test
    void logoutRevokesATokenThatBelongsToTheCaller() {
        User user = activeUser();
        RefreshToken token = new RefreshToken(UUID.randomUUID(), user, "hash", Instant.now(), Instant.now().plusSeconds(60));
        when(refreshTokenService.findByRawToken("raw")).thenReturn(Optional.of(token));

        service.logout("raw", user.getId());

        verify(refreshTokenService).revoke(token);
    }

    @Test
    void logoutIgnoresATokenThatBelongsToSomeoneElse() {
        User owner = activeUser();
        RefreshToken token = new RefreshToken(UUID.randomUUID(), owner, "hash", Instant.now(), Instant.now().plusSeconds(60));
        when(refreshTokenService.findByRawToken("raw")).thenReturn(Optional.of(token));

        service.logout("raw", UUID.randomUUID());

        verify(refreshTokenService, never()).revoke(any());
    }

    @Test
    void logoutIsANoOpWithoutACookie() {
        service.logout(null, UUID.randomUUID());

        verify(refreshTokenService, never()).findByRawToken(any());
    }

    /**
     * {@code getCurrentUser} is a pure delegation to {@link UserService} (see its own
     * Javadoc) — the actual not-found/suspended/live-row business logic is unit-tested
     * once, in {@code UserServiceImplTest}, not duplicated here.
     */
    @Test
    void getCurrentUserDelegatesToUserService() {
        User user = activeUser();
        CurrentUserResponse expected = new CurrentUserResponse(user.getId(), user.getFirstName(), user.getLastName(),
                user.getEmail(), user.getRole(), user.getStatus(), user.getAvatarInitials(), "el", Instant.now());
        when(userService.getCurrentUser(user.getId())).thenReturn(expected);

        assertThat(service.getCurrentUser(user.getId())).isEqualTo(expected);
    }

    @Test
    void getCurrentUserPropagatesUserServiceExceptions() {
        UUID missingId = UUID.randomUUID();
        when(userService.getCurrentUser(missingId)).thenThrow(new InvalidSessionException());

        assertThatThrownBy(() -> service.getCurrentUser(missingId)).isInstanceOf(InvalidSessionException.class);
    }
}
