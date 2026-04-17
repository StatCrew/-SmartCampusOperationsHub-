package com.smartcampus.backend.features.notifications.service;

import com.smartcampus.backend.features.notifications.dto.NotificationResponse;
import com.smartcampus.backend.features.user.model.Role;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class NotificationRealtimeService {

    private final SimpMessagingTemplate messagingTemplate;

    public void pushUserNotification(String email, NotificationResponse notification) {
        if (email == null || email.isBlank() || notification == null) {
            return;
        }

        messagingTemplate.convertAndSendToUser(email, "/queue/notifications", notification);
    }

    public void pushUnreadCount(String email, long unreadCount) {
        if (email == null || email.isBlank()) {
            return;
        }

        messagingTemplate.convertAndSendToUser(email, "/queue/notification-count", Map.of("unreadCount", unreadCount));
    }

    public void pushRoleNotification(Role role, NotificationResponse notification) {
        if (role == null || notification == null) {
            return;
        }

        messagingTemplate.convertAndSend("/topic/roles/" + role.name() + "/notifications", notification);
    }
}

