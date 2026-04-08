package com.smartcampus.backend.features.ticket.service;

import com.smartcampus.backend.features.ticket.model.Ticket;
import com.smartcampus.backend.features.ticket.repository.TicketRepository;
import com.smartcampus.backend.features.user.model.User;
import com.smartcampus.backend.features.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;

    // Create Ticket
    public Ticket createTicket(Ticket ticket) {

        // Get logged-in user
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Set required fields
        ticket.setUser(user);
        ticket.setStatus("OPEN");
        ticket.setCreatedAt(LocalDateTime.now());

        return ticketRepository.save(ticket);
    }

    // Update Ticket
    public Ticket updateTicket(Long id, Ticket updatedTicket) {

        // Find existing ticket
        Ticket existing = ticketRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));

        // Only allow updates if status is OPEN
        if (!existing.getStatus().equals("OPEN")) {
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

        // Only allow delete if status is OPEN
        if (!existing.getStatus().equals("OPEN")) {
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

    public Ticket getTicketById(Long id) {
    return ticketRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Ticket not found"));
    }

    // Get all tickets (for admin)
    public List<Ticket> getAllTickets() {
    return ticketRepository.findAll();
    }





}