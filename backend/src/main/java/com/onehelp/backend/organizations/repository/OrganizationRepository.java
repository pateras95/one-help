package com.onehelp.backend.organizations.repository;

import com.onehelp.backend.organizations.entity.Organization;
import com.onehelp.backend.organizations.entity.OrganizationStatus;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrganizationRepository extends JpaRepository<Organization, UUID> {

    Optional<Organization> findByOrganizerUserId(UUID organizerUserId);

    boolean existsByOrganizerUserId(UUID organizerUserId);

    /**
     * Row-locked reads (transactions-and-integrity.md § Organizer application
     * approval / § Organizer demotion cascade / § Organization suspension /
     * restoration) — prevent a concurrent double-approval, double-demotion, or
     * conflicting suspend/restore from both observing a pre-write state.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from Organization o where o.id = :id")
    Optional<Organization> findByIdForUpdate(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from Organization o where o.organizerUserId = :organizerUserId")
    Optional<Organization> findByOrganizerUserIdForUpdate(@Param("organizerUserId") UUID organizerUserId);

    /**
     * Soft business check (not a hard uniqueness rule, error-contract.md) — both
     * submitted locale values are checked against both stored locale columns, since
     * the `utf8mb4_0900_ai_ci` collation already makes each comparison accent- and
     * case-insensitive "for free". {@code excludeId} is null on create (submit) and
     * the organization's own id on edit, so an organization editing its own unchanged
     * name is never flagged as a duplicate of itself.
     */
    @Query("select (count(o) > 0) from Organization o "
            + "where (:excludeId is null or o.id <> :excludeId) "
            + "  and (o.nameEl = :nameEl or o.nameEn = :nameEl or o.nameEl = :nameEn or o.nameEn = :nameEn)")
    boolean existsDuplicateName(
            @Param("nameEl") String nameEl, @Param("nameEn") String nameEn, @Param("excludeId") UUID excludeId);

    /**
     * Admin organization list (`GET /admin/organizations`): optional free-text search
     * across both name locales, optional status filter, paginated. Accent- and
     * case-insensitive "for free" via the table's own collation.
     */
    @Query("select o from Organization o "
            + "where (:search is null or :search = '' "
            + "       or o.nameEl like concat('%', :search, '%') "
            + "       or o.nameEn like concat('%', :search, '%')) "
            + "  and (:status is null or o.status = :status)")
    Page<Organization> search(
            @Param("search") String search, @Param("status") OrganizationStatus status, Pageable pageable);
}
