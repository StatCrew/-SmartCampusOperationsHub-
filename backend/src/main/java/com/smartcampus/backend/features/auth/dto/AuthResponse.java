package com.smartcampus.backend.features.auth.dto;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        UserSummary user
) {
    public record UserSummary(
            Long id,
            String fullName,
            String email,
            String role,
            boolean emailVerified,
            String provider
    ) {
    }
}

