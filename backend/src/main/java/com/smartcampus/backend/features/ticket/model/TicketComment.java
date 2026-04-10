package com.smartcampus.backend.features.ticket.model;

import com.smartcampus.backend.features.user.model.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "ticket_comments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TicketComment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String message;

    private LocalDateTime createdAt;

    // 🔗 Ticket
    @ManyToOne
    @JoinColumn(name = "ticket_id")
    private Ticket ticket;

    // 🔗 Who wrote comment
    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;
}