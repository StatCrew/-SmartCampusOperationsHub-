package com.smartcampus.backend.features.auth.repository;

import com.smartcampus.backend.features.auth.model.PasswordResetOtp;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

public interface PasswordResetOtpRepository extends JpaRepository<PasswordResetOtp, Long> {
    Optional<PasswordResetOtp> findTopByUserIdAndConsumedFalseOrderByCreatedAtDesc(Long userId);

    @Modifying
    @Transactional
    void deleteByExpiresAtBefore(Instant threshold);
}

