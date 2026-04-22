package com.smartcampus.backend.features.booking.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "scan_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScanLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = true)
    private Long bookingId;

    private String resourceName;
    private String status; // "Granted" or "Denied"
    
    @Column(length = 500)
    private String note;

    private LocalDateTime scanTime;
}