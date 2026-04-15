package com.smartcampus.backend.features.resource.service;

import com.smartcampus.backend.features.admin.service.AdminStorageTestService;
import com.smartcampus.backend.features.resource.dto.ResourceRequestDTO;
import com.smartcampus.backend.features.resource.dto.ResourceResponseDTO;
import com.smartcampus.backend.features.resource.model.Resource;
import com.smartcampus.backend.features.resource.repository.ResourceRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ResourceServiceImpl implements ResourceService {

    private final ResourceRepository resourceRepository;
    private final AdminStorageTestService storageService;

    @Override
    @Transactional
    public ResourceResponseDTO createResource(ResourceRequestDTO dto) {
        Resource resource = Resource.builder()
                .name(dto.getName())
                .type(dto.getType())
                .capacity(dto.getCapacity())
                .location(dto.getLocation())
                .status(dto.getStatus())
                .description(dto.getDescription())
                .availabilityWindow(dto.getAvailabilityWindow())
                .createdAt(Instant.now()) // Manual timestamp if not using JPA Auditing
                .build();

        Resource savedResource = resourceRepository.save(resource);
        return mapToResponseDTO(savedResource);
    }

    @Override
    @Transactional(readOnly = true)
    public ResourceResponseDTO getResourceById(Long id) {
        Resource resource = resourceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Resource not found with id: " + id));
        return mapToResponseDTO(resource);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ResourceResponseDTO> getAllResources() {
        return resourceRepository.findAll().stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ResourceResponseDTO updateResource(Long id, ResourceRequestDTO dto) {
        Resource existingResource = resourceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Resource not found with id: " + id));

        // Update fields (imageKey is managed separately via uploadResourceImage)
        existingResource.setName(dto.getName());
        existingResource.setType(dto.getType());
        existingResource.setCapacity(dto.getCapacity());
        existingResource.setLocation(dto.getLocation());
        existingResource.setStatus(dto.getStatus());
        existingResource.setDescription(dto.getDescription());
        existingResource.setAvailabilityWindow(dto.getAvailabilityWindow());
        existingResource.setUpdatedAt(Instant.now());

        Resource updatedResource = resourceRepository.save(existingResource);
        return mapToResponseDTO(updatedResource);
    }

    @Override
    @Transactional
    public void deleteResource(Long id) {
        if (!resourceRepository.existsById(id)) {
            throw new EntityNotFoundException("Cannot delete: Resource not found with id: " + id);
        }
        resourceRepository.deleteById(id);
    }

    @Override
    @Transactional
    public ResourceResponseDTO uploadResourceImage(Long id, MultipartFile file) {
        Resource resource = resourceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Resource not found with id: " + id));
        String key = storageService.uploadTestImage(file).key();
        resource.setImageKey(key);
        resource.setUpdatedAt(Instant.now());
        return mapToResponseDTO(resourceRepository.save(resource));
    }

    private ResourceResponseDTO mapToResponseDTO(Resource resource) {
        String imageUrl = null;
        if (resource.getImageKey() != null) {
            try {
                imageUrl = storageService.generatePresignedUrl(resource.getImageKey()).url();
            } catch (Exception ignored) {
                // S3 not configured or key missing — return null url gracefully
            }
        }
        return ResourceResponseDTO.builder()
                .id(resource.getId())
                .name(resource.getName())
                .type(resource.getType())
                .capacity(resource.getCapacity())
                .location(resource.getLocation())
                .status(resource.getStatus())
                .description(resource.getDescription())
                .availabilityWindow(resource.getAvailabilityWindow())
                .imageKey(resource.getImageKey())
                .imageUrl(imageUrl)
                .createdAt(resource.getCreatedAt())
                .updatedAt(resource.getUpdatedAt())
                .build();
    }
}