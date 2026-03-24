package com.smartcampus.backend.features.ticket.dto;

import com.smartcampus.backend.features.ticket.model.Ticket;
import org.springframework.hateoas.RepresentationModel;

public class TicketResponse extends RepresentationModel<TicketResponse> {

    private Long id;
    private String title;
    private String status;

    public TicketResponse(Ticket ticket) {
        this.id = ticket.getId();
        this.title = ticket.getTitle();
        this.status = ticket.getStatus();
    }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getStatus() { return status; }
}