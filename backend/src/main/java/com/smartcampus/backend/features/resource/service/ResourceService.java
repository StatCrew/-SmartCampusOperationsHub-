package com.smartcampus.backend.features.resource.service;

import com.smartcampus.backend.features.resource.dto.ResourceDTO;
import com.smartcampus.backend.features.resource.model.Resource;
import com.smartcampus.backend.features.resource.repository.ResourceRepository;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class ResourceService {
    private final ResourceRepository repository;

    public ResourceService(ResourceRepository repository) {
        this.repository = repository;
    }

    public Resource createResource(ResourceDTO dto) {
        Resource resource = Resource.builder()
                .name(dto.getName())
                .type(dto.getType())
                .capacity(dto.getCapacity())
                .location(dto.getLocation())
                .status(dto.getStatus())
                .availabilityWindows(dto.getAvailabilityWindows())
                .build();
        return repository.save(resource);
    }

    public List<Resource> getAllResources() {
        return repository.findAll();
    }

    public Resource updateResource(Long id, ResourceDTO dto) {
        Resource existing = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Resource not found"));
        existing.setName(dto.getName());
        existing.setStatus(dto.getStatus());
        // Add other fields as needed
        return repository.save(existing);
    }

    public void deleteResource(Long id) {
        repository.deleteById(id);
    }
}