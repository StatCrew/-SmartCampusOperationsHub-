package com.smartcampus.backend.features.user.dto;

import java.time.Instant;

public record UserResponse(
        Long id,
        String fullName,
        String email,
        String role,
        boolean emailVerified,
        Instant createdAt
) {
}

