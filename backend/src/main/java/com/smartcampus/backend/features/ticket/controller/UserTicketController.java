package com.smartcampus.backend.features.ticket.controller;

import com.smartcampus.backend.features.ticket.dto.RateTicketRequest;
import com.smartcampus.backend.features.ticket.dto.TicketPresignedUrlResponse;
import com.smartcampus.backend.features.ticket.dto.TicketResponse;
import com.smartcampus.backend.features.ticket.model.Ticket;
import com.smartcampus.backend.features.ticket.service.TicketService;
import com.smartcampus.backend.features.user.model.User;
import com.smartcampus.backend.features.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.hateoas.EntityModel;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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
    private final UserRepository userRepository;

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

    @PutMapping("/{id}/rate")
    public TicketResponse rateTicket(
            @PathVariable Long id,
            @RequestBody RateTicketRequest request
    ) {
        User user = getAuthenticatedUser();
        Ticket updated = ticketService.rateTicket(id, request.rating(), request.feedback(), user);
        return toResponse(updated);
    }

    private User getAuthenticatedUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            throw new RuntimeException("User not authenticated");
        }

        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
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