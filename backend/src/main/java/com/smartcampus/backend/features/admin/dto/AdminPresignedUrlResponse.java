package com.smartcampus.backend.features.admin.dto;

import java.time.Instant;

public record AdminPresignedUrlResponse(
        String key,
        String url,
        Instant expiresAt) {
}

