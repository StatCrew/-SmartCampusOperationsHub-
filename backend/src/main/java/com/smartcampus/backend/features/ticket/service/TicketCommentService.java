package com.smartcampus.backend.features.ticket.service;

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

    public TicketComment addComment(Long ticketId, String message, User user) {

        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));

        // comments only allowed if ticket is in progress or closed
        if (ticket.getStatus().equals("OPEN")) {
            throw new RuntimeException("Comments not allowed yet. Wait for admin to respond.");
        }        

        TicketComment comment = TicketComment.builder()
                .message(message)
                .createdAt(LocalDateTime.now())
                .ticket(ticket)
                .user(user)
                .build();

        return commentRepository.save(comment);
    }

    public List<TicketComment> getComments(Long ticketId) {
        return commentRepository.findByTicketIdOrderByCreatedAtAsc(ticketId);
    }
}