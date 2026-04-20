package com.smartcampus.backend.features.ticket.service;

import com.smartcampus.backend.features.ticket.dto.TicketCommentResponse;
import com.smartcampus.backend.features.ticket.dto.CreateTicketCommentRequest;
import com.smartcampus.backend.features.ticket.model.*;
import com.smartcampus.backend.features.ticket.repository.*;
import com.smartcampus.backend.features.user.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TicketCommentService {

    private final TicketCommentRepository commentRepository;
    private final TicketRepository ticketRepository;

    public TicketCommentResponse addComment(Long ticketId, CreateTicketCommentRequest request, User user) {

        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));

        // comments only allowed if ticket is in progress
        if (ticket.getStatus() == TicketStatus.OPEN) {
            throw new RuntimeException("Comments not allowed yet. Wait for admin to open ticket.");
        }

        if (ticket.getStatus() == TicketStatus.CLOSED) {
            throw new RuntimeException("Ticket is closed. No further comments allowed.");
        }       

        TicketComment comment = TicketComment.builder()
                .message(request.message().trim())
                .createdBy(user.getEmail())
                .createdAt(LocalDateTime.now())
                .ticket(ticket)
                .user(user)
                .build();

        return TicketCommentResponse.from(commentRepository.save(comment));
    }

    public List<TicketCommentResponse> getComments(Long ticketId) {
        return commentRepository.findByTicketIdOrderByCreatedAtAsc(ticketId)
                .stream()
                .map(TicketCommentResponse::from)
                .toList();
    }


    public TicketCommentResponse updateComment(Long ticketId, Long commentId, String message, User user) {

        TicketComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        if (comment.getTicket() == null || comment.getTicket().getId() == null || !comment.getTicket().getId().equals(ticketId)) {
            throw new RuntimeException("Comment does not belong to this ticket");
        }

        //OWNER CHECK
        if (comment.getCreatedBy() == null || !comment.getCreatedBy().equals(user.getEmail())) {
            throw new RuntimeException("You can only edit your own comment");
        }

        comment.setMessage(message);
        comment.setUpdatedAt(java.time.LocalDateTime.now());

        return TicketCommentResponse.from(commentRepository.save(comment));
    }

    public void deleteComment(Long ticketId, Long commentId, User user) {

        TicketComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        if (comment.getTicket() == null || comment.getTicket().getId() == null || !comment.getTicket().getId().equals(ticketId)) {
            throw new RuntimeException("Comment does not belong to this ticket");
        }

        if (comment.getCreatedBy() == null || !comment.getCreatedBy().equals(user.getEmail())) {
            throw new RuntimeException("Not allowed to delete this comment");
        }

        commentRepository.delete(comment);
    }

}