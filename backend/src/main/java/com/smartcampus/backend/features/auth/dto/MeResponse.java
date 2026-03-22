package com.smartcampus.backend.features.auth.dto;

public record MeResponse(
        Long id,
        String fullName,
        String email,
        String role,
        boolean emailVerified,
        String provider
) {
}

