package com.smartcampus.backend.features.auth.repository;

import com.smartcampus.backend.features.auth.model.RefreshToken;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByTokenHashAndRevokedFalse(String tokenHash);

    List<RefreshToken> findAllByUserIdAndRevokedFalse(Long userId);

    @Modifying
    @Transactional
    long deleteByExpiresAtBefore(Instant threshold);
}

