        commentService.deleteComment(commentId, user);
        return commentService.updateComment(commentId, message, user);
import com.smartcampus.backend.features.ticket.dto.CreateTicketCommentRequest;
import com.smartcampus.backend.features.ticket.dto.TicketCommentResponse;
    public TicketComment updateComment(
    public List<TicketComment> getComments(@PathVariable Long ticketId) {
        return commentService.addComment(ticketId, message, user);
            @RequestParam String message,
import org.springframework.security.access.prepost.PreAuthorize;
    public TicketComment addComment(
package com.smartcampus.backend.features.ticket.controller;

import com.smartcampus.backend.features.ticket.model.TicketComment;
import com.smartcampus.backend.features.ticket.service.TicketCommentService;
import com.smartcampus.backend.features.user.model.User;

import lombok.RequiredArgsConstructor;
@PreAuthorize("hasAnyRole('USER', 'ADMIN', 'TECHNICIAN')")
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
    public TicketCommentResponse addComment(
@RequiredArgsConstructor
            @RequestBody CreateTicketCommentRequest request,

    private final TicketCommentService commentService;
        return commentService.addComment(ticketId, request, user);
    // Add comment
    @PostMapping
    public TicketComment addComment(
            @PathVariable Long ticketId,
    public List<TicketCommentResponse> getComments(@PathVariable Long ticketId) {
            @AuthenticationPrincipal User user
    ) {
        return commentService.addComment(ticketId, message, user);
    }

    @SuppressWarnings("unused")
    public TicketCommentResponse updateComment(
    @GetMapping
    public List<TicketComment> getComments(@PathVariable Long ticketId) {
            @RequestBody CreateTicketCommentRequest request,
    }

        Long currentTicketId = ticketId;
        java.util.Objects.requireNonNull(currentTicketId, "ticketId");
        return commentService.updateComment(currentTicketId, commentId, request.message(), user);
    @PutMapping("/{commentId}")
    public TicketComment updateComment(
            @PathVariable Long ticketId,
            @PathVariable Long commentId,
    @SuppressWarnings("unused")
            @RequestParam String message,
            @AuthenticationPrincipal User user
    ) {
        return commentService.updateComment(commentId, message, user);
    }
        Long currentTicketId = ticketId;
        java.util.Objects.requireNonNull(currentTicketId, "ticketId");
        commentService.deleteComment(currentTicketId, commentId, user);
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