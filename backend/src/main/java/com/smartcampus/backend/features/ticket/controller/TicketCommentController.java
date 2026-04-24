package com.smartcampus.backend.features.ticket.controller;

import com.smartcampus.backend.features.ticket.dto.CreateTicketCommentRequest;
import com.smartcampus.backend.features.ticket.dto.TicketCommentResponse;
import com.smartcampus.backend.features.ticket.service.TicketCommentService;
import com.smartcampus.backend.features.user.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tickets/{ticketId}/comments")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('USER', 'ADMIN', 'TECHNICIAN')")
public class TicketCommentController {

    private final TicketCommentService commentService;

    @PostMapping
    public TicketCommentResponse addComment(
            @PathVariable Long ticketId,
            @RequestBody CreateTicketCommentRequest request,
            @AuthenticationPrincipal User user
    ) {
        return commentService.addComment(ticketId, request, user);
    }

    @GetMapping
    public List<TicketCommentResponse> getComments(@PathVariable Long ticketId) {
        return commentService.getComments(ticketId);
    }

    @PutMapping("/{commentId}")
    public TicketCommentResponse updateComment(
            @PathVariable Long ticketId,
            @PathVariable Long commentId,
            @RequestBody CreateTicketCommentRequest request,
            @AuthenticationPrincipal User user
    ) {
        return commentService.updateComment(ticketId, commentId, request.message(), user);
    }

    @DeleteMapping("/{commentId}")
    public void deleteComment(
            @PathVariable Long ticketId,
            @PathVariable Long commentId,
            @AuthenticationPrincipal User user
    ) {
        commentService.deleteComment(ticketId, commentId, user);
    }
}