package com.smartcampus.backend.features.ticket.dto;

import com.smartcampus.backend.features.ticket.model.TicketComment;
import com.smartcampus.backend.features.user.model.User;
import java.time.LocalDateTime;

public record TicketCommentResponse(
        Long id,
        String message,
        String createdBy,
        String userName,
        Long userId,
        String userEmail,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static TicketCommentResponse from(TicketComment comment) {
        User user = comment.getUser();
        return new TicketCommentResponse(
                comment.getId(),
                comment.getMessage(),
                comment.getCreatedBy(),
                user == null ? null : user.getFullName(),
                user == null ? null : user.getId(),
                user == null ? null : user.getEmail(),
                comment.getCreatedAt(),
                comment.getUpdatedAt()
        );
    }
}

