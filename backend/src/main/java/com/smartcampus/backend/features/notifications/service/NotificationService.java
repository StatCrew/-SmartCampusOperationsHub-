package com.smartcampus.backend.features.notifications.service;

import com.smartcampus.backend.features.notifications.dto.NotificationResponse;
import com.smartcampus.backend.features.notifications.model.Notification;
import com.smartcampus.backend.features.notifications.model.NotificationSeverity;
import com.smartcampus.backend.features.notifications.repository.NotificationRepository;
import com.smartcampus.backend.features.user.model.User;
import com.smartcampus.backend.features.user.repository.UserRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public Page<NotificationResponse> getMyNotifications(User authenticatedUser, boolean unreadOnly, Pageable pageable) {
        User user = requireAuthenticatedUser(authenticatedUser);
        return notificationRepository
                .findForRecipient(user.getId(), user.getRole(), unreadOnly, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(User authenticatedUser) {
        User user = requireAuthenticatedUser(authenticatedUser);
        return notificationRepository.countUnreadForRecipient(user.getId(), user.getRole());
    }

    @Transactional
    public NotificationResponse markAsRead(Long notificationId, User authenticatedUser) {
        User user = requireAuthenticatedUser(authenticatedUser);
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));

        if (!canAccess(notification, user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot access this notification");
        }

        if (!notification.isRead()) {
            notification.setRead(true);
            notification.setReadAt(Instant.now());
            notificationRepository.save(notification);
        }

        return toResponse(notification);
    }

    @Transactional
    public int markAllAsRead(User authenticatedUser) {
        User user = requireAuthenticatedUser(authenticatedUser);
        return notificationRepository.markAllAsReadForRecipient(user.getId(), user.getRole(), Instant.now());
    }

    @Transactional
    public NotificationResponse createForUser(Long recipientUserId,
                                              String type,
                                              String title,
                                              String message,
                                              NotificationSeverity severity,
                                              String actionUrl,
                                              String sourceModule,
                                              String sourceRef,
                                              String metadataJson) {
        User recipient = userRepository.findById(recipientUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Recipient user not found"));

        Notification notification = notificationRepository.save(Notification.builder()
                .recipientUser(recipient)
                .type(type)
                .title(title)
                .message(message)
                .severity(severity == null ? NotificationSeverity.INFO : severity)
                .actionUrl(actionUrl)
                .sourceModule(sourceModule)
                .sourceRef(sourceRef)
                .metadataJson(metadataJson)
                .createdAt(Instant.now())
                .build());

        return toResponse(notification);
    }

    @Transactional
    public long cleanupOldReadNotifications(int daysToKeep) {
        Instant threshold = Instant.now().minus(Math.max(daysToKeep, 1), ChronoUnit.DAYS);
        return notificationRepository.deleteByCreatedAtBeforeAndReadIsTrue(threshold);
    }

    private User requireAuthenticatedUser(User authenticatedUser) {
        if (authenticatedUser == null || authenticatedUser.getId() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated user");
        }

        return userRepository.findById(authenticatedUser.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private boolean canAccess(Notification notification, User user) {
        if (notification.getRecipientUser() != null) {
            return notification.getRecipientUser().getId().equals(user.getId());
        }

        return notification.getRecipientRole() != null && notification.getRecipientRole() == user.getRole();
    }

    private NotificationResponse toResponse(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getType(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getSeverity().name(),
                notification.getActionUrl(),
                notification.getSourceModule(),
                notification.getSourceRef(),
                notification.getMetadataJson(),
                notification.isRead(),
                notification.getCreatedAt(),
                notification.getReadAt());
    }
}

