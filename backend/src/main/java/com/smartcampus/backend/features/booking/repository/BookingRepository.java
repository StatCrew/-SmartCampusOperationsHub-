package com.smartcampus.backend.features.booking.repository;

import com.smartcampus.backend.features.booking.model.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

    // Retrieves all bookings made by a specific user (useful for the user dashboard)
    List<Booking> findByUserId(Long userId);

    // The conflict checking logic is implemented as a custom query to efficiently check for overlapping bookings
    // Checks if there are any approved or pending bookings for the same resource that overlap with the requested times
    @Query("SELECT b FROM Booking b WHERE b.resourceId = :resourceId " +
           "AND b.status IN ('PENDING', 'APPROVED') " +
           "AND (b.startTime < :endTime AND b.endTime > :startTime)")
    List<Booking> findConflictingBookings(
            @Param("resourceId") Long resourceId, 
            @Param("startTime") LocalDateTime startTime, 
            @Param("endTime") LocalDateTime endTime);

    // Fetch all future bookings for a resource to help calculate gaps
    List<Booking> findByResourceIdAndStartTimeGreaterThanEqualOrderByStartTimeAsc(
            Long resourceId, 
            LocalDateTime startTime);
}