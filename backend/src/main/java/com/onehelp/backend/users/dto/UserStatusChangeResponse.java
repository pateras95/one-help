package com.onehelp.backend.users.dto;

import com.onehelp.backend.users.entity.AccountStatus;
import java.time.Instant;
import java.util.UUID;

/** Response for `POST /admin/users/{id}/suspend` and `.../reactivate`. */
public record UserStatusChangeResponse(UUID id, AccountStatus status, Instant updatedAt) {}
