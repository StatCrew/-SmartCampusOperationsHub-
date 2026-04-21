package com.smartcampus.backend.features.ticket.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateTicketCommentRequest(
        @NotBlank @Size(max = 1000) String message
) {
}

