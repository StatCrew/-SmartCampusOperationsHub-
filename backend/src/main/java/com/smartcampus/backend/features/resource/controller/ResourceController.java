package com.smartcampus.backend.features.resource.controller;

import com.smartcampus.backend.features.resource.dto.ResourceRequestDTO;
import com.smartcampus.backend.features.resource.dto.ResourceResponseDTO;
import com.smartcampus.backend.features.resource.service.ResourceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.hateoas.Link;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.TimeUnit;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.*;

@RestController
@RequestMapping(value = "/api/v1/resources", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // Adjust this for production security
public class ResourceController {

    private static final CacheControl RESOURCE_CACHE_CONTROL = CacheControl
            .maxAge(30, TimeUnit.SECONDS)
            .cachePrivate()
            .mustRevalidate();

    private final ResourceService resourceService;

    private ResourceResponseDTO addLinks(ResourceResponseDTO dto) {
        dto.add(linkTo(methodOn(ResourceController.class).getResourceById(dto.getId(), null)).withSelfRel());
        dto.add(linkTo(methodOn(ResourceController.class).getAllResources(null)).withRel("all-resources"));
        dto.add(linkTo(ResourceController.class).slash(dto.getId()).withRel("update"));
        dto.add(linkTo(methodOn(ResourceController.class).deleteResource(dto.getId())).withRel("delete"));
        dto.add(Link.of(linkTo(ResourceController.class).toUri() + "/" + dto.getId() + "/image", "upload-image"));
        dto.add(Link.of(linkTo(ResourceController.class).toUri() + "/" + dto.getId() + "/script", "script"));
        return dto;
    }

    private String createEtag(ResourceResponseDTO dto) {
        Instant timestamp = dto.getUpdatedAt() != null ? dto.getUpdatedAt() : dto.getCreatedAt();
        return timestamp != null ? String.format("W/\"%s\"", timestamp.toEpochMilli())
                : String.format("W/\"%s\"", dto.getId());
    }

    private String createCollectionEtag(List<ResourceResponseDTO> resources) {
        long lastModified = resources.stream()
                .map(resource -> resource.getUpdatedAt() != null ? resource.getUpdatedAt() : resource.getCreatedAt())
                .filter(Objects::nonNull)
                .mapToLong(Instant::toEpochMilli)
                .max()
                .orElse(0L);
        return String.format("W/\"%d-%d\"", resources.size(), lastModified);
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'TECHNICIAN')")
    public ResponseEntity<ResourceResponseDTO> createResource(@Valid @RequestBody ResourceRequestDTO resourceDTO) {
        ResourceResponseDTO createdResource = addLinks(resourceService.createResource(resourceDTO));
        URI location = linkTo(methodOn(ResourceController.class).getResourceById(createdResource.getId(), null))
                .toUri();
        return ResponseEntity.created(location).body(createdResource);
    }

    @GetMapping(path = "/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TECHNICIAN', 'USER')")
    public ResponseEntity<ResourceResponseDTO> getResourceById(
            @PathVariable Long id,
            @RequestHeader(value = "If-None-Match", required = false) String ifNoneMatch) {
        ResourceResponseDTO resource = addLinks(resourceService.getResourceById(id));
        String eTag = createEtag(resource);
        if (Objects.equals(ifNoneMatch, eTag)) {
            return ResponseEntity.status(HttpStatus.NOT_MODIFIED)
                    .eTag(eTag)
                    .cacheControl(RESOURCE_CACHE_CONTROL)
                    .build();
        }

        return ResponseEntity.ok()
                .eTag(eTag)
                .cacheControl(RESOURCE_CACHE_CONTROL)
                .body(resource);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'TECHNICIAN', 'USER')")
    public ResponseEntity<List<ResourceResponseDTO>> getAllResources(
            @RequestHeader(value = "If-None-Match", required = false) String ifNoneMatch) {
        List<ResourceResponseDTO> resources = resourceService.getAllResources()
                .stream()
                .map(this::addLinks)
                .toList();

        String eTag = createCollectionEtag(resources);
        if (Objects.equals(ifNoneMatch, eTag)) {
            return ResponseEntity.status(HttpStatus.NOT_MODIFIED)
                    .eTag(eTag)
                    .cacheControl(RESOURCE_CACHE_CONTROL)
                    .build();
        }

        return ResponseEntity.ok()
                .eTag(eTag)
                .cacheControl(RESOURCE_CACHE_CONTROL)
                .body(resources);
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

    @GetMapping(path = "/{id}/script", produces = "application/javascript")
    @PreAuthorize("hasAnyRole('ADMIN', 'TECHNICIAN', 'USER')")
    public ResponseEntity<String> getResourceScript(@PathVariable Long id) {
        String script = resourceService.getResourceClientScript(id);
        return ResponseEntity.ok()
                .cacheControl(RESOURCE_CACHE_CONTROL)
                .body(script);
    }

    @PostMapping(value = "/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'TECHNICIAN')")
    public ResponseEntity<ResourceResponseDTO> uploadResourceImage(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(addLinks(resourceService.uploadResourceImage(id, file)));
    }
}