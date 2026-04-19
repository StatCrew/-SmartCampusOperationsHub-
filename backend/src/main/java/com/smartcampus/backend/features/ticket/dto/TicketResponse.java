package com.smartcampus.backend.features.ticket.dto;

import org.springframework.hateoas.RepresentationModel;

import com.smartcampus.backend.features.ticket.model.Ticket;

import java.time.LocalDateTime;
import java.util.List;

import lombok.Getter;

@Getter
public class TicketResponse extends RepresentationModel<TicketResponse> {

    private Long id;
    private String title;
    private String description;
    private String category;
    private String priority;
    private String status;
    private Long resourceId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // user info (SAFE)
    private Long userId;
    private String userEmail;

    // technician info (SAFE)
    private Long technicianId;
    private String technicianEmail;

    // attachments (file URLs)
    private List<String> attachments;

    // constructor
    public TicketResponse(Ticket ticket) {
    this.id = ticket.getId();
    this.title = ticket.getTitle();
    this.description = ticket.getDescription();
    this.category = ticket.getCategory();
    this.priority = ticket.getPriority();
    this.status = ticket.getStatus() != null ? ticket.getStatus().toString() : null;
    this.resourceId = ticket.getResourceId();
    this.createdAt = ticket.getCreatedAt();
    this.updatedAt = ticket.getUpdatedAt();
    this.userId = ticket.getUser() != null ? ticket.getUser().getId() : null;
    this.userEmail = ticket.getUser() != null ? ticket.getUser().getEmail() : null;
    this.technicianId = ticket.getTechnician() != null ? ticket.getTechnician().getId() : null; // Handle null technician
    this.technicianEmail = ticket.getTechnician() != null ? ticket.getTechnician().getEmail() : null;
    this.attachments = ticket.getAttachments() == null
            ? List.of()
            : ticket.getAttachments()
                    .stream()
                    .filter(a -> a != null && a.getFileUrl() != null)
                    .map(a -> a.getFileUrl())
                    .toList(); 
    }   
    
}

