package com.smartcampus.backend.features.ticket.controller;

import com.smartcampus.backend.features.ticket.model.Ticket;
import com.smartcampus.backend.features.ticket.service.TicketService;
import lombok.RequiredArgsConstructor;
import java.util.Map;

import org.springframework.hateoas.EntityModel;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.smartcampus.backend.features.ticket.dto.TicketResponse;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.*;


import java.util.List;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class UserTicketController {

    private final TicketService ticketService;

    // Create Ticket
    @PostMapping(consumes = "multipart/form-data")
    public TicketResponse createTicket(
            @RequestPart("ticket") Ticket ticket,
            @RequestPart(value = "files", required = false) java.util.List<MultipartFile> files
    ){

        Ticket saved = ticketService.createTicket(ticket);

        if (files != null && !files.isEmpty()) {
            ticketService.saveAttachments(saved, files);
        }

        return new TicketResponse(saved);
    }


// Get logged-in user's tickets    
    @GetMapping("/my")
    public List<TicketResponse> getMyTickets() {

        List<Ticket> tickets = ticketService.getMyTickets();

        return tickets.stream().map(ticket -> {

        TicketResponse response = new TicketResponse(ticket);

        // self link
        response.add(linkTo(methodOn(UserTicketController.class)
                .getTicketById(ticket.getId())).withSelfRel());

        // list link
        response.add(linkTo(methodOn(UserTicketController.class)
                .getMyTickets()).withRel("all"));

        return response;

        }).toList();
    }


    // Get Ticket by ID
    @GetMapping("/{id}")
    public TicketResponse getTicketById(@PathVariable Long id) {
        Ticket ticket = ticketService.getTicketById(id);
        TicketResponse response = new TicketResponse(ticket);
        return response;
    }
    

    // Update Ticket (only if OPEN)
    @PutMapping("/{id}")
    public TicketResponse updateTicket(@PathVariable Long id,
                                        @RequestBody Ticket ticket) {

        Ticket updated = ticketService.updateTicket(id, ticket);

        TicketResponse response = new TicketResponse(updated);

        // HATEOAS links
        response.add(linkTo(methodOn(UserTicketController.class)
                .getTicketById(updated.getId())).withSelfRel());

        response.add(linkTo(methodOn(UserTicketController.class)
                .getMyTickets()).withRel("all"));

        return response;
    }


    // Delete Ticket (only if OPEN)
    @DeleteMapping("/{id}")
    public ResponseEntity<EntityModel<Map<String, Object>>> deleteTicket(@PathVariable Long id) {

        ticketService.deleteTicket(id);

        EntityModel<Map<String, Object>> response =
            EntityModel.of(Map.of("message", "Ticket deleted successfully"));

        response.add(linkTo(methodOn(UserTicketController.class)
                .getMyTickets()).withRel("my-tickets"));

        return ResponseEntity.ok(response);
    }



}