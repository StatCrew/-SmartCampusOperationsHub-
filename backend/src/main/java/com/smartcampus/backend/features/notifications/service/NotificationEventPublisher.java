package com.smartcampus.backend.features.notifications.service;

import com.smartcampus.backend.features.notifications.model.NotificationSeverity;

public interface NotificationEventPublisher {

    void publishToUser(Long recipientUserId,
                       String type,
                       String title,
                       String message,
                       NotificationSeverity severity,
                       String actionUrl,
                       String sourceModule,
                       String sourceRef,
                       String metadataJson);
}

