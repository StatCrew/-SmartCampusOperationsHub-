package com.smartcampus.backend.features.resource.dto;

import com.smartcampus.backend.features.resource.model.ResourceStatus;
import com.smartcampus.backend.features.resource.model.ResourceType;
import jakarta.validation.constraints.*;

public record ResourceRequest(
    @NotBlank @Size(max = 100) String name,
    @NotNull ResourceType type,
    @NotNull @Min(1) Integer capacity,
    @NotBlank String location,
    @NotNull ResourceStatus status,
    String description,
    String availabilityWindow // Added here
) {}
