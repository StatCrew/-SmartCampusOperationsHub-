package com.smartcampus.backend.features.notifications.dto;

import com.smartcampus.backend.features.notifications.model.NotificationCategory;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record UpdateNotificationPreferencesRequest(
        @NotEmpty List<@Valid NotificationPreferenceItem> preferences
) {
    public record NotificationPreferenceItem(
            @NotNull NotificationCategory category,
            @NotNull Boolean enabled
    ) {
    }
}

