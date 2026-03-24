package com.smartcampus.backend.features.resource.controller;

import com.smartcampus.backend.features.resource.dto.ResourceDTO;
import com.smartcampus.backend.features.resource.model.Resource;
import com.smartcampus.backend.features.resource.service.ResourceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/resources")
public class ResourceController {

    private final ResourceService service;

    public ResourceController(ResourceService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<Resource> create(@Valid @RequestBody ResourceDTO dto) {
        return new ResponseEntity<>(service.createResource(dto), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<Resource>> getAll() {
        return ResponseEntity.ok(service.getAllResources());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Resource> update(@PathVariable Long id, @Valid @RequestBody ResourceDTO dto) {
        return ResponseEntity.ok(service.updateResource(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.deleteResource(id);
        return ResponseEntity.noContent().build();
    }
}