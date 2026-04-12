package com.smartcampus.backend.features.ticket.controller;

import com.smartcampus.backend.features.ticket.dto.TicketResponse;
import com.smartcampus.backend.features.ticket.model.Ticket;
import com.smartcampus.backend.features.ticket.service.TicketService;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.*;

@RestController
@RequestMapping("/api/technician/tickets")
@RequiredArgsConstructor
public class TechnicianTicketController {

    private final TicketService ticketService;

    // GET MY ASSIGNED TICKETS
    @GetMapping
    public List<TicketResponse> getMyAssignedTickets() {

        List<Ticket> tickets = ticketService.getMyAssignedTickets();

        return tickets.stream().map(ticket -> {

            TicketResponse response = new TicketResponse(ticket);

            response.add(linkTo(methodOn(TechnicianTicketController.class)
                    .getMyAssignedTickets()).withSelfRel());

            return response;

        }).toList();
    }
}