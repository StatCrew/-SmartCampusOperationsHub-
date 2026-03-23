package com.smartcampus.backend.features.auth.dto;

public record LogoutRequest(
        String refreshToken
) {
}

