package com.smartcampus.backend.features.resource.service;

import com.smartcampus.backend.features.admin.service.AdminStorageTestService;
import com.smartcampus.backend.features.resource.dto.ResourceRequestDTO;
import com.smartcampus.backend.features.resource.dto.ResourceResponseDTO;
import com.smartcampus.backend.features.resource.model.Resource;
import com.smartcampus.backend.features.resource.repository.ResourceRepository;
import com.smartcampus.backend.features.user.model.User;
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
    public ResourceResponseDTO createResource(ResourceRequestDTO dto, User createdBy) {
        Instant now = Instant.now();
        Resource resource = Resource.builder()
                .name(dto.getName())
                .type(dto.getType())
                .capacity(dto.getCapacity())
                .location(dto.getLocation())
                .status(dto.getStatus())
                .description(dto.getDescription())
                .availabilityWindow(dto.getAvailabilityWindow())
                .createdAt(now)
                .updatedAt(now)
                .createdBy(createdBy)
                .updatedBy(createdBy)
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
    public ResourceResponseDTO updateResource(Long id, ResourceRequestDTO dto, User updatedBy) {
        Resource existingResource = resourceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Resource not found with id: " + id));

        existingResource.setName(dto.getName());
        existingResource.setType(dto.getType());
        existingResource.setCapacity(dto.getCapacity());
        existingResource.setLocation(dto.getLocation());
        existingResource.setStatus(dto.getStatus());
        existingResource.setDescription(dto.getDescription());
        existingResource.setAvailabilityWindow(dto.getAvailabilityWindow());
        existingResource.setUpdatedAt(Instant.now());
        existingResource.setUpdatedBy(updatedBy);

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
    @Transactional(readOnly = true)
    public String getResourceClientScript(Long id) {
        Resource resource = resourceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Resource not found with id: " + id));

        String resourceJson = buildResourceJson(resource);
        return "const resourceData = " + resourceJson + ";\n"
                + "function renderResource(containerId) {\n"
                + "  const container = document.getElementById(containerId);\n"
                + "  if (!container) { throw new Error('Container not found: ' + containerId); }\n"
                + "  container.innerHTML = `"
                + "<div class='resource-card'>"
                + "  <h2>${resourceData.name}</h2>"
                + "  <p><strong>Type:</strong> ${resourceData.type}</p>"
                + "  <p><strong>Capacity:</strong> ${resourceData.capacity}</p>"
                + "  <p><strong>Location:</strong> ${resourceData.location}</p>"
                + "  <p><strong>Status:</strong> ${resourceData.status}</p>"
                + "  <p><strong>Description:</strong> ${resourceData.description || 'N/A'}</p>"
                + "  <p><strong>Availability:</strong> ${resourceData.availabilityWindow || 'Unknown'}</p>"
                + "</div>`;\n"
                + "}\n"
                + "window.resourceData = resourceData;\n"
                + "window.renderResource = renderResource;\n"
                + "console.log('Resource script loaded for id: ' + resourceData.id);\n";
    }

    private String buildResourceJson(Resource resource) {
        return "{"
                + "\"id\":" + resource.getId() + ","
                + "\"name\":\"" + escapeJs(resource.getName()) + "\"," 
                + "\"type\":\"" + escapeJs(String.valueOf(resource.getType())) + "\"," 
                + "\"capacity\":" + (resource.getCapacity() != null ? resource.getCapacity() : 0) + ","
                + "\"location\":\"" + escapeJs(resource.getLocation()) + "\"," 
                + "\"status\":\"" + escapeJs(String.valueOf(resource.getStatus())) + "\"," 
                + "\"description\":\"" + escapeJs(resource.getDescription()) + "\"," 
                + "\"availabilityWindow\":\"" + escapeJs(resource.getAvailabilityWindow()) + "\""
                + "}";
    }

    private String escapeJs(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }

    @Override
    @Transactional
    public ResourceResponseDTO uploadResourceImage(Long id, MultipartFile file, User updatedBy) {
        Resource resource = resourceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Resource not found with id: " + id));
        String key = storageService.uploadTestImage(file).key();
        resource.setImageKey(key);
        resource.setUpdatedAt(Instant.now());
        resource.setUpdatedBy(updatedBy);
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
                .createdByName(resource.getCreatedBy() != null ? resource.getCreatedBy().getFullName() : null)
                .updatedByName(resource.getUpdatedBy() != null ? resource.getUpdatedBy().getFullName() : null)
                .build();
    }
}