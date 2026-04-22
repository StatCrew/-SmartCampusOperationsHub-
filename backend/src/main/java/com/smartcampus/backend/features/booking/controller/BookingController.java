package com.smartcampus.backend.features.booking.controller;

import com.smartcampus.backend.features.booking.dto.AnalyticsResponse;
import com.smartcampus.backend.features.booking.dto.BookingRequest;
import com.smartcampus.backend.features.booking.model.Booking;
import com.smartcampus.backend.features.booking.service.BookingService;
import com.smartcampus.backend.features.user.model.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.hateoas.EntityModel;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

// HATEOAS Imports
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

@RestController
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    // HATEOAS HELPER METHOD
    private EntityModel<Booking> addLinks(Booking booking) {
        EntityModel<Booking> model = EntityModel.of(booking);
        
        // Self link
        model.add(linkTo(methodOn(BookingController.class).getBookingById(booking.getId())).withSelfRel());
        
        // Action links
        model.add(linkTo(methodOn(BookingController.class).cancelBooking(booking.getId())).withRel("cancel"));
        model.add(linkTo(methodOn(BookingController.class).fullyUpdateBooking(booking.getId(), null, null)).withRel("update"));
        model.add(linkTo(methodOn(BookingController.class).deleteBooking(booking.getId())).withRel("delete"));
        
        return model;
    }

    // 1. POST: Create a new booking
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<EntityModel<Booking>> createBooking(
            @Valid @RequestBody BookingRequest request,
            @AuthenticationPrincipal User currentUser) {
        Booking newBooking = bookingService.createBooking(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(addLinks(newBooking));
    }

    // 2. GET: View a specific user's bookings
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<EntityModel<Booking>>> getUserBookings(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        
        List<EntityModel<Booking>> userBookings = bookingService.getUserBookings(userId)
                .stream()
                .map(this::addLinks)
                .collect(Collectors.toList());
                
        return ResponseEntity.ok(userBookings);
    }

    // 3. GET: View ALL bookings (Admins for table, Users to check free slots)
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<EntityModel<Booking>>> getAllBookings(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size,
            @RequestParam(required = false) Long resourceId) {
        
        List<Booking> allBookings = bookingService.getAllBookings();

        // Filter by resourceId if provided
        if (resourceId != null) {
            allBookings = allBookings.stream()
                    .filter(b -> b.getResourceId() != null && b.getResourceId().equals(resourceId))
                    .toList();
        }

        // Map to HATEOAS models
        List<EntityModel<Booking>> hateoasList = allBookings.stream()
                .map(this::addLinks)
                .collect(Collectors.toList());

        return ResponseEntity.ok(hateoasList);
    }

    // 4. PATCH: Update workflow status (Strictly Admin Only)
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EntityModel<Booking>> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload) {
        String newStatus = payload.get("status");
        Booking updatedBooking = bookingService.updateBookingStatus(id, newStatus.toUpperCase());
        return ResponseEntity.ok(addLinks(updatedBooking));
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
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AnalyticsResponse> getAnalytics() {
        return ResponseEntity.ok(bookingService.getBookingAnalytics());
    }

    // 7. PATCH: Safely cancel a booking (Allowed for both Users and Admins)
    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<EntityModel<Booking>> cancelBooking(@PathVariable Long id) {
        Booking cancelledBooking = bookingService.updateBookingStatus(id, "CANCELLED");
        return ResponseEntity.ok(addLinks(cancelledBooking));
    }

    // 8. POST: Verify a QR Code Ticket (Security/Admin Use)
    @PostMapping("/{id}/verify")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> verifyBookingTicket(@PathVariable Long id) {
        Booking booking = bookingService.getBookingById(id);
        
        if (!"APPROVED".equals(booking.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of(
                "valid", false,
                "message", "Access Denied: Booking is currently " + booking.getStatus() + "."
            ));
        }
        
        return ResponseEntity.ok(Map.of(
            "valid", true,
            "message", "Access Granted.",
            "bookingId", booking.getId(),
            "resourceId", booking.getResourceId(),
            "startTime", booking.getStartTime()
        ));
    }

    // 9. PUT: Fully update/modify an existing booking
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<EntityModel<Booking>> fullyUpdateBooking(
            @PathVariable Long id,
            @Valid @RequestBody BookingRequest request,
            @AuthenticationPrincipal User currentUser) {
        
        Booking updatedBooking = bookingService.updateFullBooking(id, request, currentUser);
        return ResponseEntity.ok(addLinks(updatedBooking));
    }

    //10. GET: Single Booking (Required for HATEOAS 'self' link)
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<EntityModel<Booking>> getBookingById(@PathVariable Long id) {
        Booking booking = bookingService.getBookingById(id);
        return ResponseEntity.ok(addLinks(booking));
    }
    /**
     * Intercepts ResponseStatusExceptions (like our 409 Conflict) and forces 
     * Spring Boot to return our custom suggestion text in the JSON 'message' field.
     */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleResponseStatusException(ResponseStatusException ex) {
        return ResponseEntity
                .status(ex.getStatusCode())
                .body(Map.of("message", ex.getReason()));
    }

}