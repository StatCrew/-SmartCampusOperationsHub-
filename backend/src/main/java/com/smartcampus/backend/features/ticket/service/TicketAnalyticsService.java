package com.smartcampus.backend.features.ticket.service;

import com.smartcampus.backend.features.ticket.dto.TicketAnalyticsResponse;
import com.smartcampus.backend.features.ticket.model.Ticket;
import com.smartcampus.backend.features.ticket.model.TicketStatus;
import com.smartcampus.backend.features.ticket.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TicketAnalyticsService {

    private final TicketRepository ticketRepository;

    public TicketAnalyticsResponse getTicketAnalytics() {
        List<Ticket> allTickets = ticketRepository.findAll();

        if (allTickets.isEmpty()) {
            return new TicketAnalyticsResponse(0, Map.of(), Map.of(), Map.of(), 0.0, 0.0, 0, 0);
        }

        long total = allTickets.size();

        Map<String, Long> byStatus = allTickets.stream()
                .collect(Collectors.groupingBy(t -> t.getStatus().name(), Collectors.counting()));

        Map<String, Long> byCategory = allTickets.stream()
                .collect(Collectors.groupingBy(t -> t.getCategory() != null ? t.getCategory().trim().toUpperCase() : "UNCATEGORIZED", Collectors.counting()));

        Map<String, Long> byPriority = allTickets.stream()
                .collect(Collectors.groupingBy(t -> t.getPriority() != null ? t.getPriority().trim().toUpperCase() : "MEDIUM", Collectors.counting()));

        // Average Resolution Time (for RESOLVED or CLOSED tickets)
        double avgResHours = allTickets.stream()
                .filter(t -> (t.getStatus() == TicketStatus.RESOLVED || t.getStatus() == TicketStatus.CLOSED) && t.getCreatedAt() != null && t.getUpdatedAt() != null)
                .mapToLong(t -> Duration.between(t.getCreatedAt(), t.getUpdatedAt()).toHours())
                .average()
                .orElse(0.0);

        // Average Rating
        double avgRating = allTickets.stream()
                .filter(t -> t.getRating() != null && t.getRating() > 0)
                .mapToInt(Ticket::getRating)
                .average()
                .orElse(0.0);

        // SLA Compliance
        long compliance = allTickets.stream()
                .filter(t -> (t.getStatus() == TicketStatus.RESOLVED || t.getStatus() == TicketStatus.CLOSED) && t.getDueDate() != null && t.getUpdatedAt() != null)
                .filter(t -> !t.getUpdatedAt().isAfter(t.getDueDate()))
                .count();

        long overdue = allTickets.stream()
                .filter(t -> t.getStatus() != TicketStatus.RESOLVED && t.getStatus() != TicketStatus.CLOSED && t.getDueDate() != null)
                .filter(t -> LocalDateTime.now().isAfter(t.getDueDate()))
                .count();

        return new TicketAnalyticsResponse(
                total,
                byStatus,
                byCategory,
                byPriority,
                avgResHours,
                avgRating,
                compliance,
                overdue
        );
    }
}
