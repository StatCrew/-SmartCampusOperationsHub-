package com.smartcampus.backend.features.auth.repository;

import com.smartcampus.backend.features.auth.model.EmailVerificationOtp;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailVerificationOtpRepository extends JpaRepository<EmailVerificationOtp, Long> {
    Optional<EmailVerificationOtp> findTopByUserIdAndConsumedFalseOrderByCreatedAtDesc(Long userId);

    long deleteByExpiresAtBefore(Instant threshold);
}

