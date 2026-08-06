package com.onehelp.backend.users.exception;

import com.onehelp.backend.common.exception.DomainException;
import org.springframework.http.HttpStatus;

/** {@code users.notFound}, 404 — an admin-supplied user id does not exist. */
public class UserNotFoundException extends DomainException {
    public UserNotFoundException() {
        super("users.notFound", HttpStatus.NOT_FOUND, "No user was found with that id.");
    }
}
