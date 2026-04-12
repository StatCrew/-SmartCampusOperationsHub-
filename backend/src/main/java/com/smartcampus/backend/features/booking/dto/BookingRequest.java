package com.smartcampus.backend.features.booking.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

public record BookingRequest(
        @NotNull(message = "Resource ID is required")
        Long resourceId,

        @NotNull(message = "Start time is required")
        @FutureOrPresent(message = "Start time cannot be in the past")
        LocalDateTime startTime,

        @NotNull(message = "End time is required")
        @Future(message = "End time must be in the future")
        LocalDateTime endTime,

        @NotBlank(message = "Purpose is required")
        @Size(max = 500, message = "Purpose cannot exceed 500 characters")
        String purpose,

        @NotNull(message = "Number of attendees is required")
        @Min(value = 1, message = "Must have at least 1 attendee")
        Integer attendees
) {
}