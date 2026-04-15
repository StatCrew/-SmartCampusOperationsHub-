package com.smartcampus.backend.features.resource.repository;

import com.smartcampus.backend.features.resource.model.Resource;
import com.smartcampus.backend.features.resource.model.ResourceStatus;
import com.smartcampus.backend.features.resource.model.ResourceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ResourceRepository extends JpaRepository<Resource, Long> {

    // Find resources by their specific type (e.g., all LABs)
    List<Resource> findByType(ResourceType type);

    // Find resources that are currently ACTIVE or OUT_OF_SERVICE
    List<Resource> findByStatus(ResourceStatus status);

    // Find resources by location (useful for campus navigation)
    List<Resource> findByLocationContainingIgnoreCase(String location);

    // Find resources with a minimum capacity
    List<Resource> findByCapacityGreaterThanEqual(Integer minCapacity);
    
    // Combine filters: Find active resources of a specific type
    List<Resource> findByTypeAndStatus(ResourceType type, ResourceStatus status);
}