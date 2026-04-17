package com.smartcampus.backend.features.notifications.dto;

public record NotificationPreferenceResponse(
        String category,
        boolean enabled
) {
}

