package com.smartcampus.backend.features.ticket.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "ticket_attachments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TicketAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String fileUrl;

    @ManyToOne
    @JoinColumn(name = "ticket_id")
    private Ticket ticket;

}