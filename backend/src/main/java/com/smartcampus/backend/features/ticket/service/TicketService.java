package com.smartcampus.backend.features.ticket.service;

import com.smartcampus.backend.features.storage.service.S3Service;
import com.smartcampus.backend.features.ticket.model.Ticket;
import com.smartcampus.backend.features.ticket.model.TicketAttachment;
import com.smartcampus.backend.features.ticket.model.TicketComment;
import com.smartcampus.backend.features.ticket.model.TicketStatus;
import com.smartcampus.backend.features.ticket.repository.TicketAttachmentRepository;
import com.smartcampus.backend.features.ticket.repository.TicketCommentRepository;
import com.smartcampus.backend.features.ticket.repository.TicketRepository;
import com.smartcampus.backend.features.user.model.User;
import com.smartcampus.backend.features.user.model.Role;
import com.smartcampus.backend.features.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final TicketCommentRepository commentRepository;
    private final S3Service s3Service;
    private final TicketAttachmentRepository attachmentRepository;


    // Create Ticket
    public Ticket createTicket(Ticket ticket) {

        // Get logged-in user
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Set required fields
        ticket.setUser(user);
        ticket.setStatus(TicketStatus.OPEN);
        ticket.setCreatedAt(LocalDateTime.now());

        return ticketRepository.save(ticket);
    }

    // Update Ticket
    public Ticket updateTicket(Long id, Ticket updatedTicket) {

        // Find existing ticket
        Ticket existing = ticketRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));

        // Only allow updates if ticket is OPEN
        if (existing.getStatus() == TicketStatus.CLOSED) {
            throw new RuntimeException("Ticket is closed. No changes allowed.");
        }        

        // Only allow updates if status is OPEN
        else if (existing.getStatus() != TicketStatus.OPEN) {
            throw new RuntimeException("Cannot update ticket. Already in progress or closed.");
        }

        // Update fields
        existing.setTitle(updatedTicket.getTitle());
        existing.setDescription(updatedTicket.getDescription());
        existing.setCategory(updatedTicket.getCategory());
        existing.setPriority(updatedTicket.getPriority());

        // Update timestamp
        existing.setUpdatedAt(java.time.LocalDateTime.now());

        // Save
        return ticketRepository.save(existing);
    }


    // Delete Ticket
    public void deleteTicket(Long id) {

        // Find ticket
        Ticket existing = ticketRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));

        // Only allow delete if ticket is OPEN
        if (existing.getStatus() == TicketStatus.CLOSED) {
            throw new RuntimeException("Ticket is closed. Cannot delete.");
        }        

        // Only allow delete if status is OPEN
        else if (existing.getStatus() != TicketStatus.OPEN) {
            throw new RuntimeException("Cannot delete ticket. Already in progress or closed.");
        }

        // Delete
        ticketRepository.delete(existing);
    }


    // Get logged-in user's tickets
    public List<Ticket> getMyTickets() {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return ticketRepository.findByUserId(user.getId());
    }


    // Get ticket by ID (for admin)
    public Ticket getTicketById(Long id) {
    return ticketRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Ticket not found"));
    }


    // Get all tickets (for admin)
    public List<Ticket> getAllTickets() {
    return ticketRepository.findAll();
    }


    // Update ticket status with role-based rules
    public Ticket updateTicketStatus(Long ticketId, TicketStatus newStatus, User user) {

        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));

        TicketStatus current = ticket.getStatus();

        if (current == TicketStatus.CLOSED) {
            throw new RuntimeException("Ticket is already closed.");
        }

        // RULE 1: ADMIN → OPEN → IN_PROGRESS
        else if (user.getRole() == Role.ADMIN &&
                current == TicketStatus.OPEN &&
                newStatus == TicketStatus.IN_PROGRESS) {

            // AUTO ASSIGN TECHNICIAN
            User technician = getNextTechnician();
            ticket.setTechnician(technician);

            ticket.setStatus(TicketStatus.IN_PROGRESS);
        }

        // RULE 2: TECHNICIAN → IN_PROGRESS → RESOLVED
        else if (user.getRole() == Role.TECHNICIAN &&
                current == TicketStatus.IN_PROGRESS &&
                newStatus == TicketStatus.RESOLVED) {

            ticket.setStatus(TicketStatus.RESOLVED);

            // AUTO COMMENT
            TicketComment comment = TicketComment.builder()
                    .message("Technician resolved the issue")
                    .ticket(ticket)
                    .user(user)
                    .createdAt(LocalDateTime.now())
                    .build();

            commentRepository.save(comment);
        }

        // RULE 3: ADMIN → RESOLVED → CLOSED
        else if ((user.getRole() == Role.ADMIN) &&
                current == TicketStatus.RESOLVED &&
                newStatus == TicketStatus.CLOSED) {

            ticket.setStatus(TicketStatus.CLOSED);

            // AUTO COMMENT (optional but recommended)
            TicketComment comment = TicketComment.builder()
                    .message("Ticket closed by admin")
                    .ticket(ticket)
                    .user(user)
                    .createdAt(LocalDateTime.now())
                    .build();

            commentRepository.save(comment);
        }

        else {
            throw new RuntimeException("Invalid status transition");
        }

    return ticketRepository.save(ticket);
    }


    private int technicianIndex = 0; // For round-robin technician assignment

    private User getNextTechnician() {

        List<User> technicians = userRepository
                .searchUsers("", Role.TECHNICIAN, true, PageRequest.of(0, 100))
                .getContent();

        if (technicians.isEmpty()) {
            throw new RuntimeException("No technicians available");
        }

        User selected = technicians.get(technicianIndex % technicians.size());

        technicianIndex++;

        return selected;
    }

    public List<Ticket> getMyAssignedTickets() {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();

        User technician = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Only tickets assigned to this technician
        return ticketRepository.findByTechnicianId(technician.getId());
    }

    public void saveAttachments(Ticket ticket, java.util.List<MultipartFile> files) {

        if (files.size() > 3) {
            throw new RuntimeException("Maximum 3 attachments allowed");
        }

        for (MultipartFile file : files) {

            String url = s3Service.uploadFile(file);

            TicketAttachment attachment = new TicketAttachment();
            attachment.setFileUrl(url);
            attachment.setTicket(ticket);

            attachmentRepository.save(attachment);
        }
    }


}