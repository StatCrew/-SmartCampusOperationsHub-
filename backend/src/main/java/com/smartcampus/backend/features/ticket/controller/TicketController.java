package com.smartcampus.backend.features.ticket.controller;

import com.smartcampus.backend.features.ticket.model.Ticket;
import com.smartcampus.backend.features.ticket.service.TicketService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import com.smartcampus.backend.features.ticket.dto.TicketResponse;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.*;


import java.util.List;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;

    // Create Ticket
    @PostMapping
    public Ticket createTicket(@RequestBody Ticket ticket) {
        return ticketService.createTicket(ticket);
    }

    @GetMapping("/{id}")
    public Ticket getTicketById(@PathVariable Long id) {
    return ticketService.getTicketById(id);
    }
    

    @GetMapping("/my")
    public List<TicketResponse> getMyTickets() {

        List<Ticket> tickets = ticketService.getMyTickets();

        return tickets.stream().map(ticket -> {

        TicketResponse response = new TicketResponse(ticket);

        // self link
        response.add(linkTo(methodOn(TicketController.class)
                .getTicketById(ticket.getId())).withSelfRel());

        // list link
        response.add(linkTo(methodOn(TicketController.class)
                .getMyTickets()).withRel("all"));

        return response;

        }).toList();
    }
}