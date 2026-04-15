package com.smartcampus.backend.features.notifications.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationCleanupScheduler {

    private final NotificationService notificationService;

    @Value("${app.notifications.cleanup.enabled:true}")
    private boolean cleanupEnabled;

    @Value("${app.notifications.cleanup.read-retention-days:30}")
    private int readRetentionDays;

    @Scheduled(cron = "${app.notifications.cleanup.cron:0 0 2 * * *}")
    public void cleanupOldReadNotifications() {
        if (!cleanupEnabled) {
            return;
        }

        long removed = notificationService.cleanupOldReadNotifications(readRetentionDays);
        if (removed > 0) {
            log.info("Removed {} old read notifications (retention={} days)", removed, readRetentionDays);
        }
    }
}

