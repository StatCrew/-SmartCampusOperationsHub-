package com.smartcampus.backend.features.auth.repository;

import com.smartcampus.backend.features.auth.model.EmailVerificationOtp;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

public interface EmailVerificationOtpRepository extends JpaRepository<EmailVerificationOtp, Long> {
    Optional<EmailVerificationOtp> findTopByUserIdAndConsumedFalseOrderByCreatedAtDesc(Long userId);

    @Modifying
    @Transactional
    long deleteByExpiresAtBefore(Instant threshold);
}

