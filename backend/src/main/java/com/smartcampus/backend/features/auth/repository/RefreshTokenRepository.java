package com.smartcampus.backend.features.auth.repository;

import com.smartcampus.backend.features.auth.model.RefreshToken;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByTokenHashAndRevokedFalse(String tokenHash);

    long deleteByExpiresAtBefore(Instant threshold);
}

