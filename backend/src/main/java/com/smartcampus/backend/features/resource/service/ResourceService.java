package com.smartcampus.backend.features.resource.service;

import com.smartcampus.backend.features.resource.dto.*;
import com.smartcampus.backend.features.resource.model.*;
import com.smartcampus.backend.features.resource.repository.ResourceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ResourceService {

    private final ResourceRepository resourceRepository;

    @Transactional
    public ResourceResponse createResource(ResourceRequest request) {
        Resource resource = Resource.builder()
                .name(request.name())
                .type(request.type())
                .capacity(request.capacity())
                .location(request.location())
                .status(request.status())
                .description(request.description())
                .availabilityWindow(request.availabilityWindow()) // Map it here
                .createdAt(Instant.now())
                .build();
        
        return mapToResponse(resourceRepository.save(resource));
    }

    @Transactional
    public ResourceResponse updateResource(Long id, ResourceRequest request) {
        Resource resource = resourceRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Resource not found"));

        resource.setName(request.name());
        resource.setType(request.type());
        resource.setCapacity(request.capacity());
        resource.setLocation(request.location());
        resource.setStatus(request.status());
        resource.setDescription(request.description());
        resource.setAvailabilityWindow(request.availabilityWindow()); // Map it here
        resource.setUpdatedAt(Instant.now());

        return mapToResponse(resourceRepository.save(resource));
    }

    private ResourceResponse mapToResponse(Resource resource) {
        return new ResourceResponse(
                resource.getId(), 
                resource.getName(), 
                resource.getType(),
                resource.getCapacity(), 
                resource.getLocation(),
                resource.getStatus(), 
                resource.getDescription(),
                resource.getAvailabilityWindow() // This will now compile
        );
    }
}