package com.smartcampus.backend.features.notifications.service;

import com.smartcampus.backend.features.notifications.model.NotificationSeverity;
import com.smartcampus.backend.features.notifications.model.NotificationCategory;
import com.smartcampus.backend.features.user.model.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class InAppNotificationPublisher implements NotificationEventPublisher {

    private final NotificationService notificationService;

    @Override
    public void publishToUser(Long recipientUserId,
                              String type,
                              String title,
                              String message,
                              NotificationSeverity severity,
                              String actionUrl,
                              String sourceModule,
                              String sourceRef,
                              String metadataJson,
                              NotificationCategory category) {
        notificationService.createForUser(
                recipientUserId,
                type,
                category,
                title,
                message,
                severity,
                actionUrl,
                sourceModule,
                sourceRef,
                metadataJson);
    }

    @Override
    public void publishToRole(Role recipientRole,
                              String type,
                              String title,
                              String message,
                              NotificationSeverity severity,
                              String actionUrl,
                              String sourceModule,
                              String sourceRef,
                              String metadataJson,
                              NotificationCategory category) {
        notificationService.createForRole(
                recipientRole,
                type,
                category,
                title,
                message,
                severity,
                actionUrl,
                sourceModule,
                sourceRef,
                metadataJson);
    }
}

