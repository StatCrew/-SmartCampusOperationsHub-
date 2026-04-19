package com.smartcampus.backend.features.resource.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.smartcampus.backend.features.resource.model.ResourceAvailabilitySlot;

@Repository
public interface ResourceAvailabilitySlotRepository
        extends JpaRepository<ResourceAvailabilitySlot, Long> {

    List<ResourceAvailabilitySlot> findByResourceId(Long resourceId);

    void deleteByResourceId(Long resourceId);
}