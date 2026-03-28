package com.smartcampus.backend.features.auth.repository;

import com.smartcampus.backend.features.auth.model.PasswordResetOtp;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PasswordResetOtpRepository extends JpaRepository<PasswordResetOtp, Long> {
    Optional<PasswordResetOtp> findTopByUserIdAndConsumedFalseOrderByCreatedAtDesc(Long userId);

    long deleteByExpiresAtBefore(Instant threshold);
}

