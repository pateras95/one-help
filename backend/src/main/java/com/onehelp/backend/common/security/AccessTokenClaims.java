package com.onehelp.backend.common.security;

import com.onehelp.backend.users.entity.AccountStatus;
import com.onehelp.backend.users.entity.UserRole;
import java.util.UUID;

/** Decoded, verified claims of an access token. */
public record AccessTokenClaims(UUID userId, UserRole role, AccountStatus status) {}
