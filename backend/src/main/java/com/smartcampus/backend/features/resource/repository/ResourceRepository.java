package com.smartcampus.backend.features.resource.repository;

import com.smartcampus.backend.features.resource.model.Resource;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ResourceRepository extends JpaRepository<Resource, Long> {
    List<Resource> findByType(String type);
    List<Resource> findByLocation(String location);
}