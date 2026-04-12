package com.smartcampus.backend.features.resource.dto;

import com.smartcampus.backend.features.resource.model.ResourceStatus;
import com.smartcampus.backend.features.resource.model.ResourceType;
import jakarta.validation.constraints.*;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResourceRequestDTO {

    @NotBlank(message = "Resource name is required")
    @Size(max = 100)
    private String name;

    @NotNull(message = "Resource type is required")
    private ResourceType type;

    @NotNull(message = "Capacity is required")
    @Min(value = 1, message = "Capacity must be at least 1")
    private Integer capacity;

    @NotBlank(message = "Location is required")
    private String location;

    @NotNull(message = "Status is required")
    private ResourceStatus status;

    private String description;

    private String availabilityWindow;
}