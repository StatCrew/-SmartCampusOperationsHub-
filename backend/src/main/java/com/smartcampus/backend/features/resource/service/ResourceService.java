package com.smartcampus.backend.features.resource.service;

import com.smartcampus.backend.features.resource.dto.ResourceRequestDTO;
import com.smartcampus.backend.features.resource.dto.ResourceResponseDTO;
import java.util.List;

public interface ResourceService {
    ResourceResponseDTO createResource(ResourceRequestDTO dto);
    ResourceResponseDTO getResourceById(Long id);
    List<ResourceResponseDTO> getAllResources();
    ResourceResponseDTO updateResource(Long id, ResourceRequestDTO dto);
    void deleteResource(Long id);
}