package com.smartcampus.backend.features.resource.dto;

import com.smartcampus.backend.features.resource.model.ResourceStatus;
import com.smartcampus.backend.features.resource.model.ResourceType;
import jakarta.validation.constraints.*;

public record ResourceResponse(
    Long id,
    String name,
    ResourceType type,
    Integer capacity,
    String location,
    ResourceStatus status,
    String description
) {}