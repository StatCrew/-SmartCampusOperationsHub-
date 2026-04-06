package com.smartcampus.backend.features.user.dto;

import com.smartcampus.backend.features.user.model.Role;
import jakarta.validation.constraints.NotNull;

public record UpdateRoleRequest(
        @NotNull Role role
) {
}

