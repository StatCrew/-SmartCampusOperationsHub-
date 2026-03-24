package com.smartcampus.backend.features.ticket.repository;

import com.smartcampus.backend.features.ticket.model.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TicketRepository extends JpaRepository<Ticket, Long> {

    // Get tickets by user
    List<Ticket> findByUserId(Long userId);
}