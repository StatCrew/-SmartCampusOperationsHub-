package com.smartcampus.backend.features.ticket.controller;

import com.smartcampus.backend.features.ticket.model.Ticket;
import com.smartcampus.backend.features.ticket.service.TicketService;
import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
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
    public TicketResponse createTicket(@RequestBody Ticket ticket) {

    Ticket saved = ticketService.createTicket(ticket);

    TicketResponse response = new TicketResponse(saved);

    response.add(linkTo(methodOn(TicketController.class)
            .getTicketById(saved.getId())).withSelfRel());

    return response;
}

    // Get Ticket by ID
    @GetMapping("/{id}")
    public TicketResponse getTicketById(@PathVariable Long id) {
        Ticket ticket = ticketService.getTicketById(id);
        TicketResponse response = new TicketResponse(ticket);
        return response;
    }
    

    // Get logged-in user's tickets    
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


    // Update Ticket (only if OPEN)
    @PutMapping("/{id}")
    public TicketResponse updateTicket(@PathVariable Long id,
                                        @RequestBody Ticket ticket) {

        Ticket updated = ticketService.updateTicket(id, ticket);

        TicketResponse response = new TicketResponse(updated);

        // HATEOAS links
        response.add(linkTo(methodOn(TicketController.class)
                .getTicketById(updated.getId())).withSelfRel());

        response.add(linkTo(methodOn(TicketController.class)
                .getMyTickets()).withRel("all"));

        return response;
    }


    // Delete Ticket (only if OPEN)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTicket(@PathVariable Long id) {

        ticketService.deleteTicket(id);

        return ResponseEntity.noContent().build();
    }



}