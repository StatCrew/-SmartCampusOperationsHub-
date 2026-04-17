package com.smartcampus.backend.features.notifications.service;

import com.smartcampus.backend.features.notifications.dto.NotificationResponse;
import com.smartcampus.backend.features.notifications.dto.NotificationPreferenceResponse;
import com.smartcampus.backend.features.notifications.dto.UpdateNotificationPreferencesRequest;
import com.smartcampus.backend.features.notifications.model.Notification;
import com.smartcampus.backend.features.notifications.model.NotificationCategory;
import com.smartcampus.backend.features.notifications.model.NotificationPreference;
import com.smartcampus.backend.features.notifications.model.NotificationSeverity;
import com.smartcampus.backend.features.notifications.repository.NotificationPreferenceRepository;
import com.smartcampus.backend.features.notifications.repository.NotificationRepository;
import com.smartcampus.backend.features.user.model.Role;
import com.smartcampus.backend.features.user.model.User;
import com.smartcampus.backend.features.user.repository.UserRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
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
    private final NotificationPreferenceRepository notificationPreferenceRepository;
    private final UserRepository userRepository;
    private final NotificationRealtimeService notificationRealtimeService;

    @Transactional(readOnly = true)
    public Page<NotificationResponse> getMyNotifications(User authenticatedUser, boolean unreadOnly, Pageable pageable) {
        User user = requireAuthenticatedUser(authenticatedUser);
        List<NotificationCategory> disabledCategories = getDisabledCategories(user.getId());
        List<NotificationCategory> queryCategories = disabledCategories.isEmpty()
                ? List.of(NotificationCategory.SYSTEM)
                : disabledCategories;

        return notificationRepository
                .findForRecipient(
                        user.getId(),
                        user.getRole(),
                        unreadOnly,
                        !disabledCategories.isEmpty(),
                        queryCategories,
                        NotificationCategory.GENERAL,
                        pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(User authenticatedUser) {
        User user = requireAuthenticatedUser(authenticatedUser);
        List<NotificationCategory> disabledCategories = getDisabledCategories(user.getId());
        List<NotificationCategory> queryCategories = disabledCategories.isEmpty()
                ? List.of(NotificationCategory.SYSTEM)
                : disabledCategories;
        return notificationRepository.countUnreadForRecipient(
                user.getId(),
                user.getRole(),
                !disabledCategories.isEmpty(),
                queryCategories,
                NotificationCategory.GENERAL);
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

        pushUnreadCount(user);

        return toResponse(notification);
    }

    @Transactional
    public int markAllAsRead(User authenticatedUser) {
        User user = requireAuthenticatedUser(authenticatedUser);
        int updated = notificationRepository.markAllAsReadForRecipient(user.getId(), user.getRole(), Instant.now());
        pushUnreadCount(user);
        return updated;
    }

    @Transactional
    public NotificationResponse createForUser(Long recipientUserId,
                                              String type,
                                              NotificationCategory category,
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
                .category(category == null ? NotificationCategory.GENERAL : category)
                .title(title)
                .message(message)
                .severity(severity == null ? NotificationSeverity.INFO : severity)
                .actionUrl(actionUrl)
                .sourceModule(sourceModule)
                .sourceRef(sourceRef)
                .metadataJson(metadataJson)
                .createdAt(Instant.now())
                .build());

        NotificationResponse response = toResponse(notification);
        notificationRealtimeService.pushUserNotification(recipient.getEmail(), response);
        pushUnreadCount(recipient);
        return response;
    }

    @Transactional
    public NotificationResponse createForRole(Role recipientRole,
                                              String type,
                                              NotificationCategory category,
                                              String title,
                                              String message,
                                              NotificationSeverity severity,
                                              String actionUrl,
                                              String sourceModule,
                                              String sourceRef,
                                              String metadataJson) {
        if (recipientRole == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Recipient role is required");
        }

        Notification notification = notificationRepository.save(Notification.builder()
                .recipientRole(recipientRole)
                .type(type)
                .category(category == null ? NotificationCategory.GENERAL : category)
                .title(title)
                .message(message)
                .severity(severity == null ? NotificationSeverity.INFO : severity)
                .actionUrl(actionUrl)
                .sourceModule(sourceModule)
                .sourceRef(sourceRef)
                .metadataJson(metadataJson)
                .createdAt(Instant.now())
                .build());

        NotificationResponse response = toResponse(notification);
        notificationRealtimeService.pushRoleNotification(recipientRole, response);
        return response;
    }

    @Transactional(readOnly = true)
    public List<NotificationPreferenceResponse> getMyPreferences(User authenticatedUser) {
        User user = requireAuthenticatedUser(authenticatedUser);
        List<NotificationPreference> existing = notificationPreferenceRepository.findByUserId(user.getId());
        return toPreferenceResponse(existing);
    }

    @Transactional
    public List<NotificationPreferenceResponse> updateMyPreferences(User authenticatedUser,
                                                                    UpdateNotificationPreferencesRequest request) {
        User user = requireAuthenticatedUser(authenticatedUser);
        Instant now = Instant.now();

        for (UpdateNotificationPreferencesRequest.NotificationPreferenceItem item : request.preferences()) {
            NotificationPreference preference = notificationPreferenceRepository
                    .findByUserIdAndCategory(user.getId(), item.category())
                    .orElseGet(() -> NotificationPreference.builder()
                            .user(user)
                            .category(item.category())
                            .build());

            preference.setEnabled(Boolean.TRUE.equals(item.enabled()));
            preference.setUpdatedAt(now);
            notificationPreferenceRepository.save(preference);
        }

        return toPreferenceResponse(notificationPreferenceRepository.findByUserId(user.getId()));
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
                notification.getCategory() == null ? NotificationCategory.GENERAL.name() : notification.getCategory().name(),
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

    private List<NotificationCategory> getDisabledCategories(Long userId) {
        return notificationPreferenceRepository.findByUserIdAndEnabledFalse(userId)
                .stream()
                .map(NotificationPreference::getCategory)
                .toList();
    }

    private List<NotificationPreferenceResponse> toPreferenceResponse(List<NotificationPreference> existing) {
        List<NotificationPreferenceResponse> response = new ArrayList<>();

        for (NotificationCategory category : Arrays.stream(NotificationCategory.values()).toList()) {
            boolean enabled = existing.stream()
                    .filter(preference -> preference.getCategory() == category)
                    .map(NotificationPreference::isEnabled)
                    .findFirst()
                    .orElse(true);

            response.add(new NotificationPreferenceResponse(category.name(), enabled));
        }

        response.sort(Comparator.comparing(NotificationPreferenceResponse::category));
        return response;
    }

    private void pushUnreadCount(User user) {
        long unreadCount = getUnreadCount(user);
        notificationRealtimeService.pushUnreadCount(user.getEmail(), unreadCount);
    }
}

