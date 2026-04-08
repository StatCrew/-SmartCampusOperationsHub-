package com.smartcampus.backend.features.ticket.controller;

import com.smartcampus.backend.features.ticket.dto.TicketResponse;
import com.smartcampus.backend.features.ticket.model.Ticket;
import com.smartcampus.backend.features.ticket.service.TicketService;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.*;

@RestController
@RequestMapping("/api/admin/tickets")
@RequiredArgsConstructor
public class AdminTicketController {

    private final TicketService ticketService;

    // GET ALL TICKETS
    @GetMapping
    public List<TicketResponse> getAllTickets() {

        List<Ticket> tickets = ticketService.getAllTickets();

        return tickets.stream().map(ticket -> {

            TicketResponse response = new TicketResponse(ticket);

            // self link
            response.add(linkTo(methodOn(AdminTicketController.class)
                    .getTicketById(ticket.getId())).withSelfRel());

            // optional: link to all
            response.add(linkTo(methodOn(AdminTicketController.class)
                    .getAllTickets()).withRel("all-tickets"));

            return response;

        }).toList();
    }

    // GET SINGLE TICKET
    @GetMapping("/{id}")
    public TicketResponse getTicketById(@PathVariable Long id) {

        Ticket ticket = ticketService.getTicketById(id);

        TicketResponse response = new TicketResponse(ticket);

        response.add(linkTo(methodOn(AdminTicketController.class)
                .getTicketById(id)).withSelfRel());

        response.add(linkTo(methodOn(AdminTicketController.class)
                .getAllTickets()).withRel("all-tickets"));

        return response;
    }
}