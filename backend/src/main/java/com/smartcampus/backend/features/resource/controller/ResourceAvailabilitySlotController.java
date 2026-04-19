package com.smartcampus.backend.features.resource.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.smartcampus.backend.features.resource.dto.AvailabilitySlotDTO;
import com.smartcampus.backend.features.resource.dto.AvailabilitySlotResponseDTO;
import com.smartcampus.backend.features.resource.service.ResourceAvailabilitySlotService;

@RestController
@RequestMapping("/api/resources/{resourceId}/availability-slots")
public class ResourceAvailabilitySlotController {

    private final ResourceAvailabilitySlotService service;

    public ResourceAvailabilitySlotController(ResourceAvailabilitySlotService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<AvailabilitySlotResponseDTO>> getSlots(
            @PathVariable Long resourceId) {
        return ResponseEntity.ok(service.getSlots(resourceId));
    }

    @PutMapping
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<List<AvailabilitySlotResponseDTO>> replaceSlots(
            @PathVariable Long resourceId,
            @RequestBody List<AvailabilitySlotDTO> slots) {
        return ResponseEntity.ok(service.replaceSlots(resourceId, slots));
    }
}
