package com.smartcampus.backend.features.ticket.dto;

import java.time.Instant;

public record TicketPresignedUrlResponse(
        String key,
        String url,
        Instant expiresAt
) {
}

