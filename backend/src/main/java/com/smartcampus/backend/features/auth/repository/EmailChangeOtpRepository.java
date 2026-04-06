package com.smartcampus.backend.features.auth.repository;

import com.smartcampus.backend.features.auth.model.EmailChangeOtp;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

public interface EmailChangeOtpRepository extends JpaRepository<EmailChangeOtp, Long> {
    Optional<EmailChangeOtp> findTopByUserIdAndTargetEmailIgnoreCaseAndConsumedFalseOrderByCreatedAtDesc(Long userId, String targetEmail);

    @Modifying
    @Transactional
    long deleteByExpiresAtBefore(Instant threshold);
}
