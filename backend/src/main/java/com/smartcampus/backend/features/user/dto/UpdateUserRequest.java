package com.smartcampus.backend.features.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateUserRequest(
        @NotBlank @Size(min = 2, max = 100) String fullName
) {
}

