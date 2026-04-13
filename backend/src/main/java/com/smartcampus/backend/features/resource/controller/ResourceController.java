package com.smartcampus.backend.features.resource.controller;

import com.smartcampus.backend.features.resource.dto.ResourceRequestDTO;
import com.smartcampus.backend.features.resource.dto.ResourceResponseDTO;
import com.smartcampus.backend.features.resource.service.ResourceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/resources")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // Adjust this for production security
public class ResourceController {

    private final ResourceService resourceService;

    /**
     * Create a new resource.
     * Accessible by: ADMIN, TECHNICIAN
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'TECHNICIAN')")
    public ResponseEntity<ResourceResponseDTO> createResource(@Valid @RequestBody ResourceRequestDTO resourceDTO) {
        ResourceResponseDTO createdResource = resourceService.createResource(resourceDTO);
        return new ResponseEntity<>(createdResource, HttpStatus.CREATED);
    }

    /**
     * Get a resource by ID.
     * Accessible by: ADMIN, TECHNICIAN, USER
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TECHNICIAN', 'USER')")
    public ResponseEntity<ResourceResponseDTO> getResourceById(@PathVariable Long id) {
        return ResponseEntity.ok(resourceService.getResourceById(id));
    }

    /**
     * List all resources.
     * Accessible by: ADMIN, TECHNICIAN, USER
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'TECHNICIAN', 'USER')")
    public ResponseEntity<List<ResourceResponseDTO>> getAllResources() {
        return ResponseEntity.ok(resourceService.getAllResources());
    }

    /**
     * Update an existing resource.
     * Accessible by: ADMIN, TECHNICIAN
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TECHNICIAN')")
    public ResponseEntity<ResourceResponseDTO> updateResource(
            @PathVariable Long id, 
            @Valid @RequestBody ResourceRequestDTO resourceDTO) {
        return ResponseEntity.ok(resourceService.updateResource(id, resourceDTO));
    }

    /**
     * Delete a resource.
     * Accessible by: ADMIN (Usually restricted to Admin only for safety)
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteResource(@PathVariable Long id) {
        resourceService.deleteResource(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Upload or replace the image for a resource.
     * Accessible by: ADMIN, TECHNICIAN
     */
    @PostMapping(value = "/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'TECHNICIAN')")
    public ResponseEntity<ResourceResponseDTO> uploadResourceImage(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(resourceService.uploadResourceImage(id, file));
    }
}