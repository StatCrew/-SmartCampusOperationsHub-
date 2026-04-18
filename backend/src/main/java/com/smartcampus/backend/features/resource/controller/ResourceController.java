package com.smartcampus.backend.features.resource.controller;

import com.smartcampus.backend.features.resource.dto.ResourceRequestDTO;
import com.smartcampus.backend.features.resource.dto.ResourceResponseDTO;
import com.smartcampus.backend.features.resource.service.ResourceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.hateoas.Link;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.*;

@RestController
@RequestMapping("/api/v1/resources")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // Adjust this for production security
public class ResourceController {

    private final ResourceService resourceService;

    private ResourceResponseDTO addLinks(ResourceResponseDTO dto) {
        dto.add(linkTo(methodOn(ResourceController.class).getResourceById(dto.getId())).withSelfRel());
        dto.add(linkTo(methodOn(ResourceController.class).getAllResources()).withRel("all-resources"));
        dto.add(linkTo(ResourceController.class).slash(dto.getId()).withRel("update"));
        dto.add(linkTo(methodOn(ResourceController.class).deleteResource(dto.getId())).withRel("delete"));
        dto.add(Link.of(linkTo(ResourceController.class).toUri() + "/" + dto.getId() + "/image", "upload-image"));
        return dto;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'TECHNICIAN')")
    public ResponseEntity<ResourceResponseDTO> createResource(@Valid @RequestBody ResourceRequestDTO resourceDTO) {
        ResourceResponseDTO createdResource = addLinks(resourceService.createResource(resourceDTO));
        return new ResponseEntity<>(createdResource, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TECHNICIAN', 'USER')")
    public ResponseEntity<ResourceResponseDTO> getResourceById(@PathVariable Long id) {
        return ResponseEntity.ok(addLinks(resourceService.getResourceById(id)));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'TECHNICIAN', 'USER')")
    public ResponseEntity<List<ResourceResponseDTO>> getAllResources() {
        List<ResourceResponseDTO> resources = resourceService.getAllResources()
                .stream()
                .map(this::addLinks)
                .toList();
        return ResponseEntity.ok(resources);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TECHNICIAN')")
    public ResponseEntity<ResourceResponseDTO> updateResource(
            @PathVariable Long id,
            @Valid @RequestBody ResourceRequestDTO resourceDTO) {
        return ResponseEntity.ok(addLinks(resourceService.updateResource(id, resourceDTO)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteResource(@PathVariable Long id) {
        resourceService.deleteResource(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'TECHNICIAN')")
    public ResponseEntity<ResourceResponseDTO> uploadResourceImage(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(addLinks(resourceService.uploadResourceImage(id, file)));
    }
}