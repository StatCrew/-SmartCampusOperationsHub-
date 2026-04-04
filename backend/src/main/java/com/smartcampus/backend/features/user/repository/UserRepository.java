package com.smartcampus.backend.features.user.repository;

import com.smartcampus.backend.features.user.model.User;
import com.smartcampus.backend.features.user.model.Role;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    @Query("""
            select u from User u
            where (
                :search is null or :search = ''
                or lower(u.fullName) like lower(concat('%', :search, '%'))
                or lower(u.email) like lower(concat('%', :search, '%'))
            )
            and (:role is null or u.role = :role)
            and (:active is null or u.active = :active)
            """)
    Page<User> searchUsers(@Param("search") String search,
                           @Param("role") Role role,
                           @Param("active") Boolean active,
                           Pageable pageable);

    long countByActiveTrue();
}

