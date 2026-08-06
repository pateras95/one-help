package com.onehelp.backend.users.service.impl;

import com.onehelp.backend.auth.exception.InvalidSessionException;
import com.onehelp.backend.auth.service.RefreshTokenService;
import com.onehelp.backend.common.exception.AccountSuspendedException;
import com.onehelp.backend.common.web.PageResponse;
import com.onehelp.backend.users.dto.CurrentUserResponse;
import com.onehelp.backend.users.dto.UpdateAdminUserRequest;
import com.onehelp.backend.users.dto.UpdateCurrentUserRequest;
import com.onehelp.backend.users.dto.UserDetailsResponse;
import com.onehelp.backend.users.dto.UserStatusChangeResponse;
import com.onehelp.backend.users.dto.UserSummaryResponse;
import com.onehelp.backend.users.entity.AccountStatus;
import com.onehelp.backend.users.entity.User;
import com.onehelp.backend.users.entity.UserRole;
import com.onehelp.backend.users.exception.AdminDuplicateEmailException;
import com.onehelp.backend.users.exception.SelfSuspensionNotAllowedException;
import com.onehelp.backend.users.exception.UserNotFoundException;
import com.onehelp.backend.users.mapper.UserMapper;
import com.onehelp.backend.users.repository.UserRepository;
import com.onehelp.backend.users.service.UserService;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class UserServiceImpl implements UserService {

    private static final int MAX_PAGE_SIZE = 100;

    private final UserRepository userRepository;
    private final RefreshTokenService refreshTokenService;
    private final UserMapper userMapper;

    public UserServiceImpl(UserRepository userRepository, RefreshTokenService refreshTokenService, UserMapper userMapper) {
        this.userRepository = userRepository;
        this.refreshTokenService = refreshTokenService;
        this.userMapper = userMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public CurrentUserResponse getCurrentUser(UUID userId) {
        User user = userRepository.findById(userId).orElseThrow(InvalidSessionException::new);
        rejectIfSuspended(user);
        return userMapper.toCurrentUserResponse(user);
    }

    @Override
    public CurrentUserResponse updateCurrentUser(UUID userId, UpdateCurrentUserRequest request) {
        User user = userRepository.findById(userId).orElseThrow(InvalidSessionException::new);
        rejectIfSuspended(user);

        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        if (request.localePreference() != null) {
            user.setLocalePreference(request.localePreference());
        }
        return userMapper.toCurrentUserResponse(user);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<UserSummaryResponse> listUsers(
            String search, UserRole role, AccountStatus status, Pageable pageable) {
        Pageable clamped = pageable.getPageSize() > MAX_PAGE_SIZE
                ? PageRequest.of(pageable.getPageNumber(), MAX_PAGE_SIZE, pageable.getSort())
                : pageable;
        String normalizedSearch = (search == null || search.isBlank()) ? null : search.trim();
        var page = userRepository.search(normalizedSearch, role, status, clamped).map(userMapper::toSummary);
        return PageResponse.of(page);
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetailsResponse getUserDetails(UUID userId) {
        User user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);
        return userMapper.toDetails(user);
    }

    @Override
    public UserDetailsResponse updateAdminUser(UUID userId, UpdateAdminUserRequest request) {
        User user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);

        String email = request.email().trim();
        if (userRepository.existsByEmailAndIdNot(email, userId)) {
            throw new AdminDuplicateEmailException();
        }

        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        user.setEmail(email);
        if (request.localePreference() != null) {
            user.setLocalePreference(request.localePreference());
        }
        return userMapper.toDetails(user);
    }

    @Override
    public UserStatusChangeResponse suspendUser(UUID adminUserId, UUID targetUserId) {
        if (adminUserId.equals(targetUserId)) {
            throw new SelfSuspensionNotAllowedException();
        }
        User target = userRepository.findById(targetUserId).orElseThrow(UserNotFoundException::new);

        if (target.getStatus() != AccountStatus.SUSPENDED) {
            target.setStatus(AccountStatus.SUSPENDED);
            refreshTokenService.revokeAllForUser(target);
        }
        return new UserStatusChangeResponse(target.getId(), target.getStatus(), target.getUpdatedAt());
    }

    @Override
    public UserStatusChangeResponse reactivateUser(UUID targetUserId) {
        User target = userRepository.findById(targetUserId).orElseThrow(UserNotFoundException::new);

        if (target.getStatus() != AccountStatus.ACTIVE) {
            target.setStatus(AccountStatus.ACTIVE);
            // Deliberately does NOT re-issue or un-revoke any refresh token — the user
            // must log in again from scratch (Part 7).
        }
        return new UserStatusChangeResponse(target.getId(), target.getStatus(), target.getUpdatedAt());
    }

    private static void rejectIfSuspended(User user) {
        if (user.getStatus() == AccountStatus.SUSPENDED) {
            throw new AccountSuspendedException();
        }
    }
}
