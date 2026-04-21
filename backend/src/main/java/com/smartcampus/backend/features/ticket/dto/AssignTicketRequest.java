package com.smartcampus.backend.features.ticket.dto;

import jakarta.validation.constraints.NotNull;

public record AssignTicketRequest(
        @NotNull Long technicianId
) {
}

