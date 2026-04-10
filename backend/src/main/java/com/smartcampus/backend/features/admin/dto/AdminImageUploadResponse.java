package com.smartcampus.backend.features.admin.dto;

import java.time.Instant;

public record AdminImageUploadResponse(
        String key,
        String url,
        Instant expiresAt,
        String bucket,
        String contentType,
        long size) {
}


