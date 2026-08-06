package com.onehelp.backend.users.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.onehelp.backend.auth.exception.InvalidSessionException;
import com.onehelp.backend.auth.service.RefreshTokenService;
import com.onehelp.backend.common.exception.AccountSuspendedException;
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
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

/** Pure unit tests (Mockito-mocked collaborators, no Spring context, no database). */
@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefreshTokenService refreshTokenService;

    @Mock
    private UserMapper userMapper;

    private UserServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new UserServiceImpl(userRepository, refreshTokenService, userMapper);
    }

    private static User activeUser() {
        User user = new User(UUID.randomUUID(), "A", "B", "a@onehelp.local", "hash");
        user.setRole(UserRole.VOLUNTEER);
        user.setStatus(AccountStatus.ACTIVE);
        return user;
    }

    @Test
    void getCurrentUserRejectsAMissingId() {
        UUID id = UUID.randomUUID();
        when(userRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getCurrentUser(id)).isInstanceOf(InvalidSessionException.class);
    }

    @Test
    void getCurrentUserRejectsASuspendedAccount() {
        User user = activeUser();
        user.setStatus(AccountStatus.SUSPENDED);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> service.getCurrentUser(user.getId())).isInstanceOf(AccountSuspendedException.class);
    }

    @Test
    void updateCurrentUserAppliesOnlyFirstLastAndLocale() {
        User user = activeUser();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(userMapper.toCurrentUserResponse(user)).thenReturn(null);

        service.updateCurrentUser(user.getId(), new UpdateCurrentUserRequest("New", "Name", "en"));

        assertThat(user.getFirstName()).isEqualTo("New");
        assertThat(user.getLastName()).isEqualTo("Name");
        assertThat(user.getLocalePreference()).isEqualTo("en");
    }

    @Test
    void updateCurrentUserRejectsASuspendedAccount() {
        User user = activeUser();
        user.setStatus(AccountStatus.SUSPENDED);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> service.updateCurrentUser(user.getId(), new UpdateCurrentUserRequest("A", "B", "el")))
                .isInstanceOf(AccountSuspendedException.class);
    }

    @Test
    void listUsersClampsPageSizeTo100() {
        Pageable oversized = PageRequest.of(0, 500);
        when(userRepository.search(any(), any(), any(), any())).thenReturn(new PageImpl<>(java.util.List.of()));

        service.listUsers(null, null, null, oversized);

        verify(userRepository).search(eq(null), eq(null), eq(null), argThatSize100());
    }

    private static Pageable argThatSize100() {
        return org.mockito.ArgumentMatchers.argThat(p -> p.getPageSize() == 100);
    }

    @Test
    void listUsersNormalizesBlankSearchToNull() {
        when(userRepository.search(any(), any(), any(), any())).thenReturn(new PageImpl<>(java.util.List.of()));

        service.listUsers("   ", UserRole.ORGANIZER, AccountStatus.ACTIVE, PageRequest.of(0, 20));

        verify(userRepository).search(eq(null), eq(UserRole.ORGANIZER), eq(AccountStatus.ACTIVE), any());
    }

    @Test
    void listUsersMapsEachRowToASummary() {
        User user = activeUser();
        when(userRepository.search(any(), any(), any(), any())).thenReturn(new PageImpl<>(java.util.List.of(user)));
        UserSummaryResponse summary =
                new UserSummaryResponse(user.getId(), "A", "B", "a@onehelp.local", UserRole.VOLUNTEER, AccountStatus.ACTIVE, null, Instant.now());
        when(userMapper.toSummary(user)).thenReturn(summary);

        var page = service.listUsers("a", null, null, PageRequest.of(0, 20));

        assertThat(page.content()).containsExactly(summary);
        assertThat(page.totalElements()).isEqualTo(1);
    }

    @Test
    void getUserDetailsRejectsAnUnknownId() {
        UUID id = UUID.randomUUID();
        when(userRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getUserDetails(id)).isInstanceOf(UserNotFoundException.class);
    }

    @Test
    void getUserDetailsReturnsTheMappedDetail() {
        User user = activeUser();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        UserDetailsResponse details = new UserDetailsResponse(
                user.getId(), "A", "B", "a@onehelp.local", UserRole.VOLUNTEER, AccountStatus.ACTIVE, null, "el",
                Instant.now(), Instant.now(), 0L);
        when(userMapper.toDetails(user)).thenReturn(details);

        assertThat(service.getUserDetails(user.getId())).isEqualTo(details);
    }

    @Test
    void updateAdminUserRejectsAnUnknownId() {
        UUID id = UUID.randomUUID();
        when(userRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                        service.updateAdminUser(id, new UpdateAdminUserRequest("A", "B", "a@onehelp.local", null)))
                .isInstanceOf(UserNotFoundException.class);
    }

    @Test
    void updateAdminUserRejectsAnEmailAlreadyTakenBySomeoneElse() {
        User user = activeUser();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(userRepository.existsByEmailAndIdNot("taken@onehelp.local", user.getId())).thenReturn(true);

        assertThatThrownBy(() -> service.updateAdminUser(
                        user.getId(), new UpdateAdminUserRequest("A", "B", "taken@onehelp.local", null)))
                .isInstanceOf(AdminDuplicateEmailException.class);
    }

    @Test
    void updateAdminUserAppliesFirstLastEmailAndLocale() {
        User user = activeUser();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(userRepository.existsByEmailAndIdNot("new@onehelp.local", user.getId())).thenReturn(false);
        when(userMapper.toDetails(user)).thenReturn(null);

        service.updateAdminUser(user.getId(), new UpdateAdminUserRequest("New", "Name", "new@onehelp.local", "en"));

        assertThat(user.getFirstName()).isEqualTo("New");
        assertThat(user.getLastName()).isEqualTo("Name");
        assertThat(user.getEmail()).isEqualTo("new@onehelp.local");
        assertThat(user.getLocalePreference()).isEqualTo("en");
    }

    @Test
    void suspendUserRejectsSelfSuspension() {
        UUID adminId = UUID.randomUUID();

        assertThatThrownBy(() -> service.suspendUser(adminId, adminId))
                .isInstanceOf(SelfSuspensionNotAllowedException.class);
        verify(userRepository, never()).findById(any());
    }

    @Test
    void suspendUserRejectsAnUnknownTarget() {
        UUID adminId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        when(userRepository.findById(targetId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.suspendUser(adminId, targetId)).isInstanceOf(UserNotFoundException.class);
    }

    @Test
    void suspendUserSetsStatusAndRevokesAllRefreshTokens() {
        UUID adminId = UUID.randomUUID();
        User target = activeUser();
        when(userRepository.findById(target.getId())).thenReturn(Optional.of(target));

        UserStatusChangeResponse response = service.suspendUser(adminId, target.getId());

        assertThat(target.getStatus()).isEqualTo(AccountStatus.SUSPENDED);
        assertThat(response.status()).isEqualTo(AccountStatus.SUSPENDED);
        verify(refreshTokenService).revokeAllForUser(target);
    }

    @Test
    void suspendUserIsIdempotentAndDoesNotRevokeTwice() {
        UUID adminId = UUID.randomUUID();
        User target = activeUser();
        target.setStatus(AccountStatus.SUSPENDED);
        when(userRepository.findById(target.getId())).thenReturn(Optional.of(target));

        UserStatusChangeResponse response = service.suspendUser(adminId, target.getId());

        assertThat(response.status()).isEqualTo(AccountStatus.SUSPENDED);
        verify(refreshTokenService, never()).revokeAllForUser(any());
    }

    @Test
    void reactivateUserRejectsAnUnknownTarget() {
        UUID targetId = UUID.randomUUID();
        when(userRepository.findById(targetId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.reactivateUser(targetId)).isInstanceOf(UserNotFoundException.class);
    }

    @Test
    void reactivateUserSetsStatusActiveWithoutTouchingRefreshTokens() {
        User target = activeUser();
        target.setStatus(AccountStatus.SUSPENDED);
        when(userRepository.findById(target.getId())).thenReturn(Optional.of(target));

        UserStatusChangeResponse response = service.reactivateUser(target.getId());

        assertThat(target.getStatus()).isEqualTo(AccountStatus.ACTIVE);
        assertThat(response.status()).isEqualTo(AccountStatus.ACTIVE);
        verify(refreshTokenService, never()).revokeAllForUser(any());
    }

    @Test
    void reactivateUserIsIdempotent() {
        User target = activeUser();
        when(userRepository.findById(target.getId())).thenReturn(Optional.of(target));

        UserStatusChangeResponse response = service.reactivateUser(target.getId());

        assertThat(response.status()).isEqualTo(AccountStatus.ACTIVE);
    }
}
