package com.smartcampus.backend.features.ticket.controller;

import com.smartcampus.backend.features.ticket.dto.ResolveTicketRequest;
import com.smartcampus.backend.features.ticket.dto.TicketPresignedUrlResponse;
import com.smartcampus.backend.features.ticket.dto.TicketResponse;
import com.smartcampus.backend.features.ticket.model.Ticket;
import com.smartcampus.backend.features.ticket.service.TicketService;
import com.smartcampus.backend.features.user.model.User;
import com.smartcampus.backend.features.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.*;

@RestController
@RequestMapping("/api/technician/tickets")
@RequiredArgsConstructor
@PreAuthorize("hasRole('TECHNICIAN')")
public class TechnicianTicketController {

    private final TicketService ticketService;
    private final UserRepository userRepository;

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

    // GET TICKET BY ID
    @GetMapping("/{id}")
    public TicketResponse getAssignedTicketById(@PathVariable Long id) {
        Ticket ticket = ticketService.getAssignedTicketById(id);
        TicketResponse response = new TicketResponse(ticket);
        response.add(linkTo(methodOn(TechnicianTicketController.class)
                .getAssignedTicketById(id)).withSelfRel());
        response.add(linkTo(methodOn(TechnicianTicketController.class)
                .getMyAssignedTickets()).withRel("my-tickets"));
        return response;
    }

    // GET FILE URL
    @GetMapping("/{id}/attachments/file-url")
    public TicketPresignedUrlResponse getAttachmentUrl(
            @PathVariable Long id,
            @RequestParam("key") String key) {
        return ticketService.getAssignedTicketAttachmentUrl(id, key);
    }

    @PutMapping("/{id}/resolve")
    public TicketResponse resolveTicket(
            @PathVariable Long id,
            @RequestBody ResolveTicketRequest request
    ) {
        User user = getAuthenticatedTechnicianUser();
        Ticket updated = ticketService.resolveTicket(id, request.notes(), user);
        return new TicketResponse(updated);
    }

    private User getAuthenticatedTechnicianUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            throw new RuntimeException("User not authenticated");
        }

        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}