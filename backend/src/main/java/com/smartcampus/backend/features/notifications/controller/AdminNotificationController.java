package com.smartcampus.backend.features.notifications.controller;

import com.smartcampus.backend.features.notifications.model.NotificationSeverity;
import com.smartcampus.backend.features.notifications.model.NotificationCategory;
import com.smartcampus.backend.features.notifications.service.NotificationEventPublisher;
import com.smartcampus.backend.features.user.model.Role;
import com.smartcampus.backend.features.user.model.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/notifications")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Validated
public class AdminNotificationController {

    private final NotificationEventPublisher notificationEventPublisher;

    @PostMapping("/test")
    public ResponseEntity<Void> sendTestNotification(@Valid @RequestBody AdminTestNotificationRequest request,
                                                     @AuthenticationPrincipal User user) {
        String title = request.title() == null || request.title().isBlank()
                ? "Admin test notification"
                : request.title().trim();

        notificationEventPublisher.publishToUser(
                request.recipientUserId(),
                "ADMIN_TEST",
                title,
                request.message().trim(),
                NotificationSeverity.INFO,
                request.actionUrl(),
                "admin",
                user == null || user.getId() == null ? null : String.valueOf(user.getId()),
                null,
                request.category());

        return ResponseEntity.accepted().build();
    }

    @PostMapping("/broadcast")
    public ResponseEntity<Void> sendRoleBroadcast(@Valid @RequestBody AdminBroadcastNotificationRequest request,
                                                  @AuthenticationPrincipal User user) {
        String title = request.title() == null || request.title().isBlank()
                ? "Admin announcement"
                : request.title().trim();

        notificationEventPublisher.publishToRole(
                request.recipientRole(),
                "ADMIN_BROADCAST",
                title,
                request.message().trim(),
                NotificationSeverity.INFO,
                request.actionUrl(),
                "admin",
                user == null || user.getId() == null ? null : String.valueOf(user.getId()),
                null,
                request.category());

        return ResponseEntity.accepted().build();
    }

    public record AdminTestNotificationRequest(
            @NotNull Long recipientUserId,
            String title,
            @NotBlank String message,
            String actionUrl,
            NotificationCategory category
    ) {
    }

    public record AdminBroadcastNotificationRequest(
            @NotNull Role recipientRole,
            String title,
            @NotBlank String message,
            String actionUrl,
            NotificationCategory category
    ) {
    }
}



