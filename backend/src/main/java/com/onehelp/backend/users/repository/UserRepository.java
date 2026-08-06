package com.onehelp.backend.users.repository;

import com.onehelp.backend.users.entity.AccountStatus;
import com.onehelp.backend.users.entity.User;
import com.onehelp.backend.users.entity.UserRole;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID> {

    /**
     * The {@code users.email} column's {@code utf8mb4_0900_ai_ci} collation already
     * makes this comparison case-insensitive at the database level — no
     * {@code IgnoreCase} query derivation or {@code lower()} call is needed (see
     * database-schema.md § Character set and collation).
     */
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    /** Used by admin profile edits: "is this email already taken by a different user?" */
    boolean existsByEmailAndIdNot(String email, UUID id);

    /**
     * Admin user list (`GET /admin/users`): optional free-text search across
     * first/last name and email, optional role/status filters, paginated. The search
     * is accent- and case-insensitive "for free" via the table's own
     * {@code utf8mb4_0900_ai_ci} collation (database-schema.md) — no {@code lower()}/
     * normalization needed in the query itself. Sorting is applied by Spring Data from
     * the supplied {@link Pageable} (e.g. {@code sort=lastName,asc}); no explicit
     * {@code ORDER BY} is written here.
     */
    @Query("select u from User u "
            + "where (:search is null or :search = '' "
            + "       or u.firstName like concat('%', :search, '%') "
            + "       or u.lastName like concat('%', :search, '%') "
            + "       or u.email like concat('%', :search, '%')) "
            + "  and (:role is null or u.role = :role) "
            + "  and (:status is null or u.status = :status)")
    Page<User> search(
            @Param("search") String search,
            @Param("role") UserRole role,
            @Param("status") AccountStatus status,
            Pageable pageable);
}
