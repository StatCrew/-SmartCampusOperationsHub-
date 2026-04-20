package com.smartcampus.backend.features.resource.service;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.smartcampus.backend.features.resource.dto.AvailabilitySlotDTO;
import com.smartcampus.backend.features.resource.dto.AvailabilitySlotResponseDTO;
import com.smartcampus.backend.features.resource.model.ResourceAvailabilitySlot;
import com.smartcampus.backend.features.resource.repository.ResourceAvailabilitySlotRepository;

import jakarta.transaction.Transactional;

@Service
@Transactional
public class ResourceAvailabilitySlotService {

    private final ResourceAvailabilitySlotRepository repo;

    public ResourceAvailabilitySlotService(ResourceAvailabilitySlotRepository repo) {
        this.repo = repo;
    }

    public List<AvailabilitySlotResponseDTO> getSlots(Long resourceId) {
        return repo.findByResourceId(resourceId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<AvailabilitySlotResponseDTO> replaceSlots(Long resourceId, List<AvailabilitySlotDTO> dtos) {
        repo.deleteByResourceId(resourceId);
        List<ResourceAvailabilitySlot> entities = dtos.stream()
                .map(dto -> {
                    ResourceAvailabilitySlot slot = new ResourceAvailabilitySlot();
                    slot.setResourceId(resourceId);
                    slot.setDayOfWeek(DayOfWeek.valueOf(dto.getDayOfWeek().toUpperCase()));
                    slot.setStartTime(LocalTime.parse(dto.getStartTime()));
                    slot.setEndTime(LocalTime.parse(dto.getEndTime()));
                    return slot;
                })
                .collect(Collectors.toList());
        return repo.saveAll(entities)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private AvailabilitySlotResponseDTO toResponse(ResourceAvailabilitySlot slot) {
        AvailabilitySlotResponseDTO dto = new AvailabilitySlotResponseDTO();
        dto.setId(slot.getId());
        dto.setDayOfWeek(slot.getDayOfWeek().name());
        dto.setStartTime(slot.getStartTime().toString());
        dto.setEndTime(slot.getEndTime().toString());
        return dto;
    }
}
