package com.smartcampus.backend.features.booking.repository;

import com.smartcampus.backend.features.booking.model.ScanLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ScanLogRepository extends JpaRepository<ScanLog, Long> {
    // Fetch the most recent scans first
    List<ScanLog> findAllByOrderByScanTimeDesc();
}