package com.smartcampus.backend.features.resource.service;

import com.smartcampus.backend.features.resource.dto.ResourceRequestDTO;
import com.smartcampus.backend.features.resource.dto.ResourceResponseDTO;
import com.smartcampus.backend.features.user.model.User;
import java.util.List;
import org.springframework.web.multipart.MultipartFile;

public interface ResourceService {
    ResourceResponseDTO createResource(ResourceRequestDTO dto, User createdBy);
    ResourceResponseDTO getResourceById(Long id);
    List<ResourceResponseDTO> getAllResources();
    ResourceResponseDTO updateResource(Long id, ResourceRequestDTO dto, User updatedBy);
    void deleteResource(Long id);
    ResourceResponseDTO uploadResourceImage(Long id, MultipartFile file, User updatedBy);
    String getResourceClientScript(Long id);
}