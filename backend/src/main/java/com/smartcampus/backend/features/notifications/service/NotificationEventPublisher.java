package com.smartcampus.backend.features.notifications.service;

import com.smartcampus.backend.features.notifications.model.NotificationSeverity;
import com.smartcampus.backend.features.notifications.model.NotificationCategory;
import com.smartcampus.backend.features.user.model.Role;

public interface NotificationEventPublisher {

    default void publishToUser(Long recipientUserId,
                               String type,
                               String title,
                               String message,
                               NotificationSeverity severity,
                               String actionUrl,
                               String sourceModule,
                               String sourceRef,
                               String metadataJson) {
        publishToUser(
                recipientUserId,
                type,
                title,
                message,
                severity,
                actionUrl,
                sourceModule,
                sourceRef,
                metadataJson,
                NotificationCategory.GENERAL);
    }

    void publishToUser(Long recipientUserId,
                       String type,
                       String title,
                       String message,
                       NotificationSeverity severity,
                       String actionUrl,
                       String sourceModule,
                       String sourceRef,
                       String metadataJson,
                       NotificationCategory category);

    default void publishToRole(Role recipientRole,
                               String type,
                               String title,
                               String message,
                               NotificationSeverity severity,
                               String actionUrl,
                               String sourceModule,
                               String sourceRef,
                               String metadataJson) {
        publishToRole(
                recipientRole,
                type,
                title,
                message,
                severity,
                actionUrl,
                sourceModule,
                sourceRef,
                metadataJson,
                NotificationCategory.GENERAL);
    }

    void publishToRole(Role recipientRole,
                       String type,
                       String title,
                       String message,
                       NotificationSeverity severity,
                       String actionUrl,
                       String sourceModule,
                       String sourceRef,
                       String metadataJson,
                       NotificationCategory category);
}

