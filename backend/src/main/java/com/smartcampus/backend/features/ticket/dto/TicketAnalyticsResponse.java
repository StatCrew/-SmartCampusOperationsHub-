package com.smartcampus.backend.features.ticket.dto;

import java.util.Map;

public record TicketAnalyticsResponse(
        long totalTickets,
        Map<String, Long> ticketsByStatus,
        Map<String, Long> ticketsByCategory,
        Map<String, Long> ticketsByPriority,
        double averageResolutionTimeHours,
        double averageUserRating,
        long slaComplianceCount,
        long overdueCount
) {
}
