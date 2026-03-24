package com.smartcampus.backend.features.resource.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.Data;
import java.util.List;

@Data
public class ResourceDTO {
    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Type is required")
    private String type;

    @Positive(message = "Capacity must be greater than 0")
    private Integer capacity;

    @NotBlank(message = "Location is required")
    private String location;

    private String status = "ACTIVE";
    private List<String> availabilityWindows;
}