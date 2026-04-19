package com.smartcampus.backend.features.booking.controller;

import com.smartcampus.backend.features.booking.dto.AnalyticsResponse;
import com.smartcampus.backend.features.booking.dto.BookingRequest;
import com.smartcampus.backend.features.booking.model.Booking;
import com.smartcampus.backend.features.booking.service.BookingService;
import com.smartcampus.backend.features.user.model.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    // 1. POST: Create a new booking
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Booking> createBooking(
            @Valid @RequestBody BookingRequest request,
            @AuthenticationPrincipal User currentUser) {
        Booking newBooking = bookingService.createBooking(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(newBooking);
    }

    // 2. GET: View a specific user's bookings
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<Booking>> getUserBookings(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        List<Booking> userBookings = bookingService.getUserBookings(userId);
        return ResponseEntity.ok(userBookings);
    }

    // 3. GET: View ALL bookings (Admins for table, Users to check free slots)
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")  // FIX: hasAnyRole() adds ROLE_ prefix automatically
    public ResponseEntity<List<Booking>> getAllBookings(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size,
            @RequestParam(required = false) Long resourceId) {  // FIX: accept resourceId from React
        List<Booking> allBookings = bookingService.getAllBookings();

        // Filter by resourceId if provided (so React gets only relevant bookings)
        if (resourceId != null) {
            allBookings = allBookings.stream()
                    .filter(b -> b.getResourceId() != null && b.getResourceId().equals(resourceId))
                    .toList();
        }

        return ResponseEntity.ok(allBookings);
    }

    // 4. PATCH: Update workflow status (Strictly Admin Only)
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")  // FIX: hasRole() instead of hasAuthority()
    public ResponseEntity<Booking> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload) {
        String newStatus = payload.get("status");
        Booking updatedBooking = bookingService.updateBookingStatus(id, newStatus.toUpperCase());
        return ResponseEntity.ok(updatedBooking);
    }

    // 5. DELETE: Remove a booking
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Void> deleteBooking(@PathVariable Long id) {
        bookingService.deleteBooking(id);
        return ResponseEntity.noContent().build();
    }

    // 6. GET: Admin Analytics Dashboard (Strictly Admin Only)
    @GetMapping("/analytics")
    @PreAuthorize("hasRole('ADMIN')")  // FIX: hasRole() instead of hasAuthority()
    public ResponseEntity<AnalyticsResponse> getAnalytics() {
        return ResponseEntity.ok(bookingService.getBookingAnalytics());
    }
}
