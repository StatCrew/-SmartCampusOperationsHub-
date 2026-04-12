package com.smartcampus.backend.features.ticket.controller;

import com.smartcampus.backend.features.ticket.dto.TicketResponse;
import com.smartcampus.backend.features.ticket.model.Ticket;
import com.smartcampus.backend.features.ticket.model.TicketStatus;
import com.smartcampus.backend.features.ticket.service.TicketService;
import com.smartcampus.backend.features.user.model.User;
import com.smartcampus.backend.features.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.*;

@RestController
@RequestMapping("/api/admin/tickets")
@RequiredArgsConstructor
public class AdminTicketController {

    private final TicketService ticketService;
    private final UserRepository userRepository;

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

    @PutMapping("/{id}/status")
    public TicketResponse updateStatus(
            @PathVariable Long id,
            @RequestParam String status
    ) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Ticket updated = ticketService.updateTicketStatus(
                id,
                TicketStatus.valueOf(status),
                user
        );

        return new TicketResponse(updated);
    }
}