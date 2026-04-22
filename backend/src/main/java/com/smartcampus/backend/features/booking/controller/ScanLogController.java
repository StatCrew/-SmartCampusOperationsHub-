package com.smartcampus.backend.features.booking.controller;

import com.smartcampus.backend.features.booking.model.ScanLog;
import com.smartcampus.backend.features.booking.repository.ScanLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/admin/scan-logs")
@RequiredArgsConstructor
public class ScanLogController {

    private final ScanLogRepository scanLogRepository;

    // 1. Save a new scan to the database
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ScanLog> logScan(@RequestBody ScanLog log) {
        log.setScanTime(LocalDateTime.now());
        ScanLog savedLog = scanLogRepository.save(log);
        return ResponseEntity.ok(savedLog);
    }

    // 2. Retrieve all past scans
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ScanLog>> getScanHistory() {
        return ResponseEntity.ok(scanLogRepository.findAllByOrderByScanTimeDesc());
    }
}