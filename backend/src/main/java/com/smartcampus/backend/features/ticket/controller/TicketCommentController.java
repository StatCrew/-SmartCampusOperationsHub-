package com.smartcampus.backend.features.ticket.controller;

import com.smartcampus.backend.features.ticket.model.TicketComment;
import com.smartcampus.backend.features.ticket.service.TicketCommentService;
import com.smartcampus.backend.features.user.model.User;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tickets/{ticketId}/comments")
@RequiredArgsConstructor
public class TicketCommentController {

    private final TicketCommentService commentService;

    // Add comment
    @PostMapping
    public TicketComment addComment(
            @PathVariable Long ticketId,
            @RequestParam String message,
            @AuthenticationPrincipal User user
    ) {
        return commentService.addComment(ticketId, message, user);
    }

    // Get comments
    @GetMapping
    public List<TicketComment> getComments(@PathVariable Long ticketId) {
        return commentService.getComments(ticketId);
    }

    // Update comments
    @PutMapping("/{commentId}")
    public TicketComment updateComment(
            @PathVariable Long ticketId,
            @PathVariable Long commentId,
            @RequestParam String message,
            @AuthenticationPrincipal User user
    ) {
        return commentService.updateComment(commentId, message, user);
    }

    // Delete comments
    @DeleteMapping("/{commentId}")
    public void deleteComment(
            @PathVariable Long ticketId,
            @PathVariable Long commentId,
            @AuthenticationPrincipal User user
    ) {
        commentService.deleteComment(commentId, user);
    }
}