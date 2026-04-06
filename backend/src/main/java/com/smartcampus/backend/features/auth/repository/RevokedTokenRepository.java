package com.smartcampus.backend.features.auth.repository;

import com.smartcampus.backend.features.auth.model.RevokedToken;
import java.time.Instant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

public interface RevokedTokenRepository extends JpaRepository<RevokedToken, Long> {
    boolean existsByJti(String jti);

    @Modifying
    @Transactional
    long deleteByExpiresAtBefore(Instant threshold);
}

