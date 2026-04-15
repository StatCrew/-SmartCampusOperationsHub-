package com.smartcampus.backend.features.resource.dto;

import com.smartcampus.backend.features.resource.model.ResourceStatus;
import com.smartcampus.backend.features.resource.model.ResourceType;
import lombok.*;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResourceResponseDTO {
    
    private Long id;
    private String name;
    private ResourceType type;
    private Integer capacity;
    private String location;
    private ResourceStatus status;
    private String description;
    private String availabilityWindow;
    private String imageKey;
    private String imageUrl;
    private Instant createdAt;
    private Instant updatedAt;
}