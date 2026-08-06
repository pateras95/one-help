package com.onehelp.backend.users.repository;

import com.onehelp.backend.users.entity.User;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, UUID> {

    /**
     * The {@code users.email} column's {@code utf8mb4_0900_ai_ci} collation already
     * makes this comparison case-insensitive at the database level — no
     * {@code IgnoreCase} query derivation or {@code lower()} call is needed (see
     * database-schema.md § Character set and collation).
     */
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);
}
