package com.smartcampus.backend.features.ticket.controller;

import com.smartcampus.backend.features.ticket.dto.AssignTicketRequest;
import com.smartcampus.backend.features.ticket.dto.RejectTicketRequest;
import com.smartcampus.backend.features.ticket.dto.TicketPresignedUrlResponse;
import com.smartcampus.backend.features.ticket.dto.TicketResponse;
import com.smartcampus.backend.features.ticket.model.Ticket;
import com.smartcampus.backend.features.ticket.model.TicketStatus;
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
@RequestMapping("/api/admin/tickets")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminTicketController {

    private final TicketService ticketService;
    private final UserRepository userRepository;

    // Get all tickets
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

    // Get a specific ticket by ID
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

    // Mark ticket as IN_PROGRESS (triggers auto-assignment)
    @PutMapping("/{id}/mark-in-progress")
    public TicketResponse markInProgress(@PathVariable Long id) {
        User user = getAuthenticatedAdminUser();
        Ticket updated = ticketService.updateTicketStatus(id, TicketStatus.IN_PROGRESS, user);
        return new TicketResponse(updated);
    }

    // Close a resolved ticket
    @PutMapping("/{id}/close")
    public TicketResponse closeTicket(@PathVariable Long id) {
        User user = getAuthenticatedAdminUser();
        Ticket updated = ticketService.closeTicket(id, user);
        return new TicketResponse(updated);
    }

    // Assign a technician to a ticket
    @PutMapping("/{id}/assign")
    public TicketResponse assignTicket(
            @PathVariable Long id,
            @RequestBody AssignTicketRequest request
    ) {
        User user = getAuthenticatedAdminUser();

        Ticket updated = ticketService.assignTechnician(id, request.technicianId(), user);
        return new TicketResponse(updated);
    }

    @PutMapping("/{id}/reject")
    public TicketResponse rejectTicket(
            @PathVariable Long id,
            @RequestBody RejectTicketRequest request
    ) {
        User user = getAuthenticatedAdminUser();
        Ticket updated = ticketService.rejectTicket(id, request.reason(), user);
        return new TicketResponse(updated);
    }

    // Get a pre-signed URL for an attachment
    @GetMapping("/{id}/attachments/file-url")
    public TicketPresignedUrlResponse getAttachmentUrl(
            @PathVariable Long id,
            @RequestParam("key") String key
    ) {
        return ticketService.getAdminTicketAttachmentUrl(id, key);
    }

    private User getAuthenticatedAdminUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            throw new RuntimeException("User not authenticated");
        }

        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}