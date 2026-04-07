package com.smartcampus.backend.features.booking.controller;

import com.smartcampus.backend.features.booking.dto.AnalyticsResponse;
import com.smartcampus.backend.features.booking.dto.BookingRequest;
import com.smartcampus.backend.features.booking.model.Booking;
import com.smartcampus.backend.features.booking.service.BookingService;
import com.smartcampus.backend.features.user.model.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

// Required static imports for HATEOAS link building
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;


@RestController
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    // --- HATEOAS HELPER METHOD ---
    // Converts a standard Booking into an EntityModel equipped with dynamic links
    private EntityModel<Booking> toModel(Booking booking) {
        EntityModel<Booking> model = EntityModel.of(booking);

        // 1. "self" link: Points to this specific booking
        model.add(linkTo(methodOn(BookingController.class).getBookingById(booking.getId())).withSelfRel());

        // 2. State-driven links: Only show approve/reject if the status is currently PENDING
        if ("PENDING".equals(booking.getStatus())) {
            model.add(linkTo(methodOn(BookingController.class).updateStatus(booking.getId(), "APPROVED")).withRel("approve"));
            model.add(linkTo(methodOn(BookingController.class).updateStatus(booking.getId(), "REJECTED")).withRel("reject"));
        }

        // 3. Action link: Allow cancellation/deletion
        model.add(linkTo(methodOn(BookingController.class).deleteBooking(booking.getId())).withRel("cancel"));

        return model;
    }

    // --- NEW ENDPOINT REQUIRED FOR HATEOAS "SELF" LINKS ---
    @GetMapping("/{id}")
    public ResponseEntity<EntityModel<Booking>> getBookingById(@PathVariable Long id) {
        // NOTE: Make sure you added 'getBookingById(Long id)' to your BookingService!
        Booking booking = bookingService.getBookingById(id);
        return ResponseEntity.ok(toModel(booking));
    }

    // 1. POST: Create a new booking
    @PostMapping
    public ResponseEntity<EntityModel<Booking>> createBooking(
            @Valid @RequestBody BookingRequest request,
            @AuthenticationPrincipal User currentUser) {
        Booking newBooking = bookingService.createBooking(request, currentUser);
        // Wrap the new booking in our HATEOAS model before returning
        return ResponseEntity.status(HttpStatus.CREATED).body(toModel(newBooking)); 
    }

    // 2. GET: View my own bookings
    @GetMapping("/my")
    public ResponseEntity<CollectionModel<EntityModel<Booking>>> getMyBookings(@AuthenticationPrincipal User currentUser) {
        // Convert the List<Booking> into a List<EntityModel<Booking>>
        List<EntityModel<Booking>> models = bookingService.getUserBookings(currentUser.getId())
                .stream()
                .map(this::toModel)
                .collect(Collectors.toList());

        // Wrap the entire list and give the list itself a "self" link
        CollectionModel<EntityModel<Booking>> collectionModel = CollectionModel.of(models,
                linkTo(methodOn(BookingController.class).getMyBookings(currentUser)).withSelfRel());

        return ResponseEntity.ok(collectionModel);
    }

    // 3. GET: View ALL bookings (Admin only)
    @GetMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<CollectionModel<EntityModel<Booking>>> getAllBookings() {
        List<EntityModel<Booking>> models = bookingService.getAllBookings()
                .stream()
                .map(this::toModel)
                .collect(Collectors.toList());

        return ResponseEntity.ok(CollectionModel.of(models,
                linkTo(methodOn(BookingController.class).getAllBookings()).withSelfRel()));
    }

    // 4. PUT: Update workflow status (Admin only)
    @PutMapping("/{id}/status")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<EntityModel<Booking>> updateStatus(
            @PathVariable Long id, 
            @RequestParam String status) {
        Booking updatedBooking = bookingService.updateBookingStatus(id, status.toUpperCase());
        return ResponseEntity.ok(toModel(updatedBooking));
    }

    // 5. DELETE: Remove a booking
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBooking(@PathVariable Long id) {
        bookingService.deleteBooking(id);
        return ResponseEntity.noContent().build(); 
    }
    // GET: Admin Analytics Dashboard
    @GetMapping("/analytics")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<AnalyticsResponse> getAnalytics() {
        return ResponseEntity.ok(bookingService.getBookingAnalytics());
    }
}