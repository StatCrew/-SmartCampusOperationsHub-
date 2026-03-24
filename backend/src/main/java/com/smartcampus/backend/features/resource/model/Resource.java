package com.smartcampus.backend.features.resource.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.List;

@Entity
@Table(name = "resources")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class Resource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String type; // e.g., LECTURE_HALL, LAB, EQUIPMENT

    private Integer capacity;

    @Column(nullable = false)
    private String location;

    @Column(nullable = false)
    private String status; // ACTIVE, OUT_OF_SERVICE

    @ElementCollection
    private List<String> availabilityWindows; // e.g., ["08:00-10:00", "14:00-16:00"]
}