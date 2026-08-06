package com.onehelp.backend.auth.service.impl;

import com.onehelp.backend.auth.dto.LoginRequest;
import com.onehelp.backend.auth.dto.RegisterRequest;
import com.onehelp.backend.auth.entity.RefreshToken;
import com.onehelp.backend.auth.exception.AccountSuspendedException;
import com.onehelp.backend.auth.exception.DuplicateEmailException;
import com.onehelp.backend.auth.exception.InvalidPasswordException;
import com.onehelp.backend.auth.exception.InvalidSessionException;
import com.onehelp.backend.auth.exception.UnknownEmailException;
import com.onehelp.backend.auth.service.AuthenticationService;
import com.onehelp.backend.auth.service.RefreshTokenService;
import com.onehelp.backend.common.security.AccessTokenService;
import com.onehelp.backend.common.web.TraceIdFilter;
import com.onehelp.backend.users.dto.CurrentUserResponse;
import com.onehelp.backend.users.entity.AccountStatus;
import com.onehelp.backend.users.entity.User;
import com.onehelp.backend.users.mapper.UserMapper;
import com.onehelp.backend.users.repository.UserRepository;
import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AuthenticationServiceImpl implements AuthenticationService {

    private static final Logger log = LoggerFactory.getLogger(AuthenticationServiceImpl.class);

    private final UserRepository userRepository;
    private final RefreshTokenService refreshTokenService;
    private final AccessTokenService accessTokenService;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;

    public AuthenticationServiceImpl(
            UserRepository userRepository,
            RefreshTokenService refreshTokenService,
            AccessTokenService accessTokenService,
            PasswordEncoder passwordEncoder,
            UserMapper userMapper) {
        this.userRepository = userRepository;
        this.refreshTokenService = refreshTokenService;
        this.accessTokenService = accessTokenService;
        this.passwordEncoder = passwordEncoder;
        this.userMapper = userMapper;
    }

    @Override
    public IssuedSession register(RegisterRequest request, String userAgent) {
        String email = request.email().trim();
        if (userRepository.existsByEmail(email)) {
            throw new DuplicateEmailException();
        }

        User user = new User(
                UUID.randomUUID(),
                request.firstName().trim(),
                request.lastName().trim(),
                email,
                passwordEncoder.encode(request.password()));
        user.setAvatarInitials(buildInitials(user.getFirstName(), user.getLastName()));
        user = userRepository.save(user);

        return issueSession(user, userAgent);
    }

    @Override
    public IssuedSession login(LoginRequest request, String userAgent) {
        User user = userRepository.findByEmail(request.email().trim()).orElseThrow(UnknownEmailException::new);
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new InvalidPasswordException();
        }
        if (user.getStatus() == AccountStatus.SUSPENDED) {
            throw new AccountSuspendedException();
        }
        return issueSession(user, userAgent);
    }

    /**
     * {@code noRollbackFor} is deliberate: on reuse detection this method revokes the
     * user's whole token chain and then throws {@link InvalidSessionException} to
     * report the failed refresh — the default rollback-on-RuntimeException behavior
     * would otherwise silently undo that revocation, defeating the entire point of
     * ADR-1's reuse-detection defense.
     */
    @Override
    @Transactional(noRollbackFor = {InvalidSessionException.class, AccountSuspendedException.class})
    public IssuedSession refresh(String rawRefreshToken, String userAgent) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new InvalidSessionException();
        }
        RefreshToken token = refreshTokenService.findByRawToken(rawRefreshToken).orElseThrow(InvalidSessionException::new);

        if (token.getRevokedAt() != null) {
            log.warn(
                    "Refresh token reuse detected userId={} tokenId={} traceId={}",
                    token.getUser().getId(),
                    token.getId(),
                    TraceIdFilter.currentTraceId());
            refreshTokenService.revokeAllForUser(token.getUser());
            throw new InvalidSessionException();
        }
        if (token.getExpiresAt().isBefore(Instant.now())) {
            throw new InvalidSessionException();
        }

        User user = token.getUser();
        if (user.getStatus() == AccountStatus.SUSPENDED) {
            throw new AccountSuspendedException();
        }

        RefreshTokenService.IssuedRefreshToken rotated = refreshTokenService.rotate(token, userAgent);
        AccessTokenService.IssuedAccessToken accessToken = accessTokenService.issueFor(user);
        return new IssuedSession(
                accessToken.token(), accessToken.expiresInSeconds(), rotated.rawToken(), toResponse(user));
    }

    @Override
    public void logout(String rawRefreshToken, UUID currentUserId) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return;
        }
        refreshTokenService.findByRawToken(rawRefreshToken).ifPresent(token -> {
            if (token.getRevokedAt() == null && token.getUser().getId().equals(currentUserId)) {
                refreshTokenService.revoke(token);
            }
        });
    }

    @Override
    @Transactional(readOnly = true)
    public CurrentUserResponse getCurrentUser(UUID currentUserId) {
        User user = userRepository.findById(currentUserId).orElseThrow(InvalidSessionException::new);
        if (user.getStatus() == AccountStatus.SUSPENDED) {
            throw new AccountSuspendedException();
        }
        return toResponse(user);
    }

    private IssuedSession issueSession(User user, String userAgent) {
        AccessTokenService.IssuedAccessToken accessToken = accessTokenService.issueFor(user);
        RefreshTokenService.IssuedRefreshToken refreshToken = refreshTokenService.issue(user, userAgent);
        return new IssuedSession(
                accessToken.token(), accessToken.expiresInSeconds(), refreshToken.rawToken(), toResponse(user));
    }

    private CurrentUserResponse toResponse(User user) {
        return userMapper.toCurrentUserResponse(user);
    }

    /** Matches the mock's own {@code buildInitials} exactly (auth.service.js). */
    private static String buildInitials(String firstName, String lastName) {
        String first = firstName.isEmpty() ? "" : firstName.substring(0, 1);
        String last = lastName.isEmpty() ? "" : lastName.substring(0, 1);
        return (first + last).toUpperCase();
    }
}
