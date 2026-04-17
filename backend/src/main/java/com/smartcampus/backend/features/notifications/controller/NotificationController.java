package com.smartcampus.backend.features.notifications.controller;

import com.smartcampus.backend.features.notifications.dto.NotificationResponse;
import com.smartcampus.backend.features.notifications.dto.NotificationPreferenceResponse;
import com.smartcampus.backend.features.notifications.dto.UnreadCountResponse;
import com.smartcampus.backend.features.notifications.dto.UpdateNotificationPreferencesRequest;
import com.smartcampus.backend.features.notifications.service.NotificationService;
import com.smartcampus.backend.features.user.model.User;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/me")
    public ResponseEntity<Page<NotificationResponse>> getMyNotifications(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            @PageableDefault(size = 10, sort = "createdAt") Pageable pageable) {
        return ResponseEntity.ok(notificationService.getMyNotifications(user, unreadOnly, pageable));
    }

    @GetMapping("/me/unread-count")
    public ResponseEntity<UnreadCountResponse> getUnreadCount(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(new UnreadCountResponse(notificationService.getUnreadCount(user)));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<NotificationResponse> markAsRead(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(notificationService.markAsRead(id, user));
    }

    @PatchMapping("/me/read-all")
    public ResponseEntity<UnreadCountResponse> markAllAsRead(@AuthenticationPrincipal User user) {
        notificationService.markAllAsRead(user);
        return ResponseEntity.ok(new UnreadCountResponse(0));
    }

    @GetMapping("/me/preferences")
    public ResponseEntity<List<NotificationPreferenceResponse>> getMyPreferences(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(notificationService.getMyPreferences(user));
    }

    @PutMapping("/me/preferences")
    public ResponseEntity<List<NotificationPreferenceResponse>> updateMyPreferences(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody UpdateNotificationPreferencesRequest request) {
        return ResponseEntity.ok(notificationService.updateMyPreferences(user, request));
    }
}

