package com.smartcampus.backend.features.ticket.controller;

import com.smartcampus.backend.features.ticket.model.Ticket;
import com.smartcampus.backend.features.ticket.service.TicketService;
import lombok.RequiredArgsConstructor;
import tools.jackson.databind.ObjectMapper;

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
@PreAuthorize("hasRole('USER')")
public class UserTicketController {

    private final TicketService ticketService;
    // Create Ticket
    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<TicketResponse> createTicket(
            @RequestPart("ticket") Ticket ticket,
    public TicketResponse createTicket(
    ){

        Ticket saved = ticketService.createTicket(ticket);

        if (files != null && !files.isEmpty()) {
            ticketService.saveAttachments(saved, files);
        }

        TicketResponse response = new TicketResponse(saved);
        response.add(linkTo(methodOn(UserTicketController.class)
        return new TicketResponse(saved);

        List<Ticket> tickets = ticketService.getMyTickets();

        List<TicketResponse> responses = tickets.stream().map(ticket -> {

            TicketResponse response = new TicketResponse(ticket);

            // self link
            response.add(linkTo(methodOn(UserTicketController.class)
                    .getTicketById(ticket.getId())).withSelfRel());

            // list link
    public List<TicketResponse> getMyTickets() {
                    .getMyTickets()).withRel("my-tickets"));

            return response;

        }).toList();

        return tickets.stream().map(ticket -> {
                responses,
        TicketResponse response = new TicketResponse(ticket);
        );

        // self link
        response.add(linkTo(methodOn(UserTicketController.class)
                .getTicketById(ticket.getId())).withSelfRel());
        // list link
        response.add(linkTo(methodOn(UserTicketController.class)
                .getMyTickets()).withRel("all"));
                .getTicketById(id)).withSelfRel());
        return response;
            @PathVariable Long id,
            @RequestPart("ticket") String ticketJson,
            @RequestPart(value = "files", required = false) List<MultipartFile> files
    ) {

        ObjectMapper mapper = new ObjectMapper();
        Ticket ticket = mapper.readValue(ticketJson, Ticket.class);
        Ticket ticket;
        try {
            ObjectMapper mapper = new ObjectMapper();
    public TicketResponse getTicketById(@PathVariable Long id) {
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid ticket payload", e);
        }

        Ticket updated = ticketService.updateTicket(id, ticket);

        return response;
            .getTicketById(updated.getId())).withSelfRel());

        response.add(linkTo(methodOn(UserTicketController.class)
            .getMyTickets()).withRel("all"));
            .getMyTickets()).withRel("my-tickets"));

        return response;
        return ResponseEntity.ok(response);
    }


    // Delete Ticket (only if OPEN)
    @DeleteMapping("/{id}")
    public TicketResponse updateTicketWithFiles(

        ticketService.deleteTicket(id);

        EntityModel<Map<String, Object>> response =
                EntityModel.of(Map.of(
                    "message", "Ticket deleted successfully",
                    "deletedId", id
                ));

        //HATEOAS
    ) throws Exception {
                .getMyTickets()).withRel("my-tickets"));

        response.add(linkTo(methodOn(UserTicketController.class)
                .getTicketById(id)).withRel("self"));

        return ResponseEntity.ok(response);
    }



}