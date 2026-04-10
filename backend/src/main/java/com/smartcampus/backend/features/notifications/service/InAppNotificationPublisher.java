package com.smartcampus.backend.features.notifications.service;

import com.smartcampus.backend.features.notifications.model.NotificationSeverity;
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
                              String metadataJson) {
        notificationService.createForUser(
                recipientUserId,
                type,
                title,
                message,
                severity,
                actionUrl,
                sourceModule,
                sourceRef,
                metadataJson);
    }
}

