package com.smartcampus.backend.features.notifications.dto;

import java.time.Instant;

public record NotificationResponse(
        Long id,
        String type,
        String category,
        String title,
        String message,
        String severity,
        String actionUrl,
        String sourceModule,
        String sourceRef,
        String metadata,
        boolean read,
        Instant createdAt,
        Instant readAt
) {
}

