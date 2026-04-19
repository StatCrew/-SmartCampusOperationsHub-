package com.smartcampus.backend.features.ticket.controller;

import com.smartcampus.backend.features.ticket.model.Ticket;
import com.smartcampus.backend.features.ticket.service.TicketService;
import lombok.RequiredArgsConstructor;


import java.util.Map;

import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.CollectionModel;
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
    public CollectionModel<TicketResponse> getMyTickets() {

        List<Ticket> tickets = ticketService.getMyTickets();

        List<TicketResponse> responses = tickets.stream()
                .map(TicketResponse::new)
                .toList();

        return CollectionModel.of(responses,
                linkTo(methodOn(UserTicketController.class).getMyTickets()).withSelfRel());
    }


    // Get Ticket by ID
    @GetMapping("/{id}")
    public TicketResponse getTicketById(@PathVariable Long id) {
        Ticket ticket = ticketService.getTicketById(id);
        TicketResponse response = new TicketResponse(ticket);
        return response;
    }
    

    // Update Ticket (only if OPEN)
    @PutMapping(value = "/{id}/with-files", consumes = "multipart/form-data")
    public TicketResponse updateTicketWithFiles(
            @PathVariable Long id,
            @RequestPart("ticket") Ticket ticket,
            @RequestPart(value = "files", required = false) List<MultipartFile> files
    ) {

        Ticket updated = ticketService.updateTicket(id, ticket);

        if (files != null && !files.isEmpty()) {
            ticketService.saveAttachments(updated, files);
        }

        TicketResponse response = new TicketResponse(updated);

        // HATEOAS 
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
                EntityModel.of(Map.of(
                    "message", "Ticket deleted successfully",
                    "deletedId", id
                ));

        //HATEOAS
        response.add(linkTo(methodOn(UserTicketController.class)
                .getMyTickets()).withRel("my-tickets"));

        return ResponseEntity.ok(response);
    }



}