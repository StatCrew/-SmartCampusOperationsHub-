package com.smartcampus.backend.features.auth.dto;

import java.time.Instant;

public record EmailVerificationResponse(
        String message,
        boolean emailVerified,
        Instant otpExpiresAt
) {
}

