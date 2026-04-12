package com.smartcampus.backend.features.ticket.dto;

import org.springframework.hateoas.RepresentationModel;

import com.smartcampus.backend.features.ticket.model.Ticket;

import java.time.LocalDateTime;

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

    // user info (SAFE)
    private Long userId;
    private String userEmail;

    // technician info (SAFE)
    private Long technicianId;
    private String technicianEmail;

    // constructor
    public TicketResponse(Ticket ticket) {
    this.id = ticket.getId();
    this.title = ticket.getTitle();
    this.description = ticket.getDescription();
    this.category = ticket.getCategory();
    this.priority = ticket.getPriority();
    this.status = ticket.getStatus().toString();
    this.resourceId = ticket.getResourceId();
    this.createdAt = ticket.getCreatedAt();
    this.userId = ticket.getUser().getId();
    this.userEmail = ticket.getUser().getEmail();
    this.technicianId = ticket.getTechnician() != null ? ticket.getTechnician().getId() : null; // Handle null technician
    this.technicianEmail = ticket.getTechnician() != null ? ticket.getTechnician().getEmail() : null; 
    }   
    
}