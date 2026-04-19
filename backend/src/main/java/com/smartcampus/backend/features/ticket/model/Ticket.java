package com.smartcampus.backend.features.ticket.model;

import com.smartcampus.backend.features.user.model.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "tickets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    @Column(length = 1000)
    private String description;

    private String category;

    private String priority; // LOW, MEDIUM, HIGH

    private Long resourceId;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    //Relationship with User
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Convert(converter = TicketStatusAttributeConverter.class)
    private TicketStatus status; // OPEN, IN_PROGRESS, RESOLVED, CLOSED

    @ManyToOne
    @JoinColumn(name = "technician_id")
    private User technician;

    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    private List<TicketAttachment> attachments;

    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    private List<TicketComment> comments;


}