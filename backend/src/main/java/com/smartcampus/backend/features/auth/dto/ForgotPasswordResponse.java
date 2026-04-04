package com.smartcampus.backend.features.auth.dto;

import java.time.Instant;

public record ForgotPasswordResponse(
        String message,
        Instant otpExpiresAt
) {
}

