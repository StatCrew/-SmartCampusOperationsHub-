package com.smartcampus.backend.features.user.dto;

import java.time.Instant;

public record ProfileUpdateResponse(
        UserResponse profile,
        boolean emailVerificationRequired,
        String pendingEmail,
        Instant otpExpiresAt,
        String message
) {
}
