package com.smartcampus.backend.features.ticket.controller;

import com.smartcampus.backend.features.ticket.dto.TicketPresignedUrlResponse;
import com.smartcampus.backend.features.ticket.dto.TicketResponse;
import com.smartcampus.backend.features.ticket.model.Ticket;
import com.smartcampus.backend.features.ticket.service.TicketService;
import lombok.RequiredArgsConstructor;
import org.springframework.hateoas.EntityModel;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
@PreAuthorize("hasRole('USER')")
public class UserTicketController {

    private final TicketService ticketService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public TicketResponse createTicket(
            @RequestPart("ticket") Ticket ticket,
            @RequestPart(value = "files", required = false) List<MultipartFile> files
    ) {
        Ticket saved = ticketService.createTicket(ticket);

        if (files != null && !files.isEmpty()) {
            ticketService.saveAttachments(saved, files);
        }

        return toResponse(ticketService.getTicketById(saved.getId()));
    }

    @GetMapping("/my")
    public List<TicketResponse> getMyTickets() {
        return ticketService.getMyTickets()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @GetMapping("/{id}")
    public TicketResponse getTicketById(@PathVariable Long id) {
        return toResponse(ticketService.getMyTicketById(id));
    }

    @GetMapping("/{id}/attachments/file-url")
    public TicketPresignedUrlResponse getAttachmentUrl(
            @PathVariable Long id,
            @RequestParam("key") String key
    ) {
        return ticketService.getMyTicketAttachmentUrl(id, key);
    }

    @PutMapping(value = "/{id}/with-files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public TicketResponse updateTicketWithFiles(
            @PathVariable Long id,
            @RequestPart("ticket") Ticket ticket,
            @RequestPart(value = "files", required = false) List<MultipartFile> files
    ) {
        Ticket updated = ticketService.updateTicket(id, ticket);

        if (files != null && !files.isEmpty()) {
            ticketService.saveAttachments(updated, files);
        }

        return toResponse(ticketService.getTicketById(id));
    }

    @DeleteMapping("/{id}")
    public EntityModel<Map<String, Object>> deleteTicket(@PathVariable Long id) {
        ticketService.deleteTicket(id);

        EntityModel<Map<String, Object>> response = EntityModel.of(Map.of(
                "message", "Ticket deleted successfully",
                "deletedId", id
        ));

        response.add(linkTo(methodOn(UserTicketController.class)
                .getMyTickets()).withRel("my-tickets"));
        response.add(linkTo(methodOn(UserTicketController.class)
                .getTicketById(id)).withRel("self"));

        return response;
    }

    private TicketResponse toResponse(Ticket ticket) {
        TicketResponse response = new TicketResponse(ticket);

        response.add(linkTo(methodOn(UserTicketController.class)
                .getTicketById(ticket.getId())).withSelfRel());
        response.add(linkTo(methodOn(UserTicketController.class)
                .getMyTickets()).withRel("my-tickets"));

        return response;
    }
}