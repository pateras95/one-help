package com.onehelp.backend.users.mapper;

import com.onehelp.backend.users.dto.CurrentUserResponse;
import com.onehelp.backend.users.entity.User;
import org.mapstruct.Mapper;

/** {@code passwordHash} is never a source field on any target here — MapStruct only
 * ever maps the fields explicitly declared on {@link CurrentUserResponse}. */
@Mapper(componentModel = "spring")
public interface UserMapper {

    CurrentUserResponse toCurrentUserResponse(User user);
}
