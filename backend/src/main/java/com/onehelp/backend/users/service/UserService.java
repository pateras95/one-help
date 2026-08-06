package com.onehelp.backend.users.service;

import com.onehelp.backend.common.web.PageResponse;
import com.onehelp.backend.users.dto.CurrentUserResponse;
import com.onehelp.backend.users.dto.UpdateAdminUserRequest;
import com.onehelp.backend.users.dto.UpdateCurrentUserRequest;
import com.onehelp.backend.users.dto.UserDetailsResponse;
import com.onehelp.backend.users.dto.UserStatusChangeResponse;
import com.onehelp.backend.users.dto.UserSummaryResponse;
import com.onehelp.backend.users.entity.AccountStatus;
import com.onehelp.backend.users.entity.UserRole;
import java.util.UUID;
import org.springframework.data.domain.Pageable;

public interface UserService {

    /**
     * Resolves the caller's own profile from their own verified token's subject.
     *
     * @throws com.onehelp.backend.auth.exception.InvalidSessionException if the id
     *     (from an otherwise-valid access token) no longer resolves to a row — a
     *     broken/stale session, not a caller-supplied lookup that might reasonably
     *     miss
     * @throws com.onehelp.backend.common.exception.AccountSuspendedException if suspended
     */
    CurrentUserResponse getCurrentUser(UUID userId);

    /** @throws com.onehelp.backend.common.exception.AccountSuspendedException if suspended */
    CurrentUserResponse updateCurrentUser(UUID userId, UpdateCurrentUserRequest request);

    /** Admin user list — paginated, optional search/role/status filters. Page size is
     * silently clamped to 100 (never fetches an unbounded list). */
    PageResponse<UserSummaryResponse> listUsers(String search, UserRole role, AccountStatus status, Pageable pageable);

    /** @throws com.onehelp.backend.users.exception.UserNotFoundException if unknown */
    UserDetailsResponse getUserDetails(UUID userId);

    /** @throws com.onehelp.backend.users.exception.UserNotFoundException if unknown */
    UserDetailsResponse updateAdminUser(UUID userId, UpdateAdminUserRequest request);

    /**
     * Idempotent: suspending an already-suspended user succeeds and simply returns
     * the current state (no error) — see the phase report for why idempotent was
     * chosen over a conflict response.
     *
     * @throws com.onehelp.backend.users.exception.SelfSuspensionNotAllowedException if adminUserId == targetUserId
     * @throws com.onehelp.backend.users.exception.UserNotFoundException if unknown
     */
    UserStatusChangeResponse suspendUser(UUID adminUserId, UUID targetUserId);

    /** Idempotent: reactivating an already-active user succeeds and simply returns the
     * current state.
     *
     * @throws com.onehelp.backend.users.exception.UserNotFoundException if unknown */
    UserStatusChangeResponse reactivateUser(UUID targetUserId);
}
