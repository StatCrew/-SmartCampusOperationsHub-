package com.smartcampus.backend.features.ticket.dto;

import org.springframework.hateoas.RepresentationModel;

//import com.smartcampus.backend.features.ticket.dto.TicketCommentResponse;
import com.smartcampus.backend.features.ticket.model.Ticket;
import com.smartcampus.backend.features.ticket.model.TicketAttachment;
import com.smartcampus.backend.features.user.model.User;

import java.time.LocalDateTime;
import java.util.List;

import lombok.Getter;

@Getter
public class TicketResponse extends RepresentationModel<TicketResponse> {

    private Long id;
    private String title;
    private String description;
    private String category;
    private String contactNumber;
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

    // ticket history/comments
    private List<TicketCommentResponse> comments;

    // constructor
    public TicketResponse(Ticket ticket) {
    this.id = ticket.getId();
    this.title = ticket.getTitle();
    this.description = ticket.getDescription();
    this.category = ticket.getCategory();
    this.contactNumber = ticket.getContactNumber();
    this.priority = ticket.getPriority();
    this.status = ticket.getStatus() != null ? ticket.getStatus() != null ? ticket.getStatus().toString() : null : "OPEN";
    this.resourceId = ticket.getResourceId();
    this.createdAt = ticket.getCreatedAt();

    User owner = ticket.getUser();
    this.userId = owner != null ? owner.getId() : null;
    this.userEmail = owner != null ? owner.getEmail() : null;

    User technician = ticket.getTechnician();
    this.technicianId = technician != null ? technician.getId() : null;
    this.technicianEmail = technician != null ? technician.getEmail() : null;

    this.attachments = ticket.getAttachments() == null
            ? List.of()
            : ticket.getAttachments()
                    .stream()
                    .filter(java.util.Objects::nonNull)
                    .map(TicketAttachment::getFileUrl)
                    .filter(java.util.Objects::nonNull)
                    .toList();

    this.comments = ticket.getComments() == null
            ? List.of()
            : ticket.getComments()
                    .stream()
                    .filter(java.util.Objects::nonNull)
                    .map(TicketCommentResponse::from)
                    .toList();
    }   
    
}

