package com.smartcampus.backend.features.ticket.model;

import java.util.Locale;

public enum TicketStatus {
    OPEN,
    IN_PROGRESS,
    RESOLVED,
    CLOSED,
    REJECTED;

    public static TicketStatus from(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Ticket status is required");
        }

        String normalized = raw.trim()
                .replace('-', '_')
                .replace(' ', '_')
                .toUpperCase(Locale.ROOT);

        return TicketStatus.valueOf(normalized);
    }
}