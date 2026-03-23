package com.smartcampus.backend.features.auth.repository;

import com.smartcampus.backend.features.auth.model.RevokedToken;
import java.time.Instant;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RevokedTokenRepository extends JpaRepository<RevokedToken, Long> {
    boolean existsByJti(String jti);

    long deleteByExpiresAtBefore(Instant threshold);
}

