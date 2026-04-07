package com.smartcampus.backend.features.booking.service;

import com.smartcampus.backend.features.booking.dto.AnalyticsResponse;
import com.smartcampus.backend.features.booking.dto.BookingRequest;
import com.smartcampus.backend.features.booking.model.Booking;
import com.smartcampus.backend.features.booking.repository.BookingRepository;
import com.smartcampus.backend.features.user.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;
import java.util.stream.Collectors;


import java.util.List;


@Service
@RequiredArgsConstructor // Lombok: Automatically creates a constructor for the repository
public class BookingService {

    private final BookingRepository bookingRepository;

    // 1. Create a Booking
    public Booking createBooking(BookingRequest request, User currentUser) {
        
        // Fulfilling the conflict checking workflow requirement
        List<Booking> conflicts = bookingRepository.findConflictingBookings(
                request.resourceId(),
                request.startTime(),
                request.endTime()
        );

        if (!conflicts.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Resource is already booked or pending during this time.");
        }

        // Using the Builder pattern (thanks to Lombok's @Builder) to map DTO to Entity
        Booking newBooking = Booking.builder()
                .resourceId(request.resourceId())
                .user(currentUser)
                .startTime(request.startTime())
                .endTime(request.endTime())
                .purpose(request.purpose())
                .attendees(request.attendees())
                .status("PENDING") // All new bookings start in the PENDING state
                .build();

        return bookingRepository.save(newBooking);
    }

    // 2. Get Bookings for the Logged-in User
    public List<Booking> getUserBookings(Long userId) {
        return bookingRepository.findByUserId(userId);
    }

    // 3. Get All Bookings (For Admins)
    public List<Booking> getAllBookings() {
        return bookingRepository.findAll();
    }

    // 4. Update Booking Status (Approve, Reject, Cancel)
    public Booking updateBookingStatus(Long bookingId, String newStatus) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));

        // Ensure only valid workflow states are applied
        if (!newStatus.equals("APPROVED") && !newStatus.equals("REJECTED") && !newStatus.equals("CANCELLED")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status provided.");
        }

        booking.setStatus(newStatus);
        return bookingRepository.save(booking);
    }
    // 5. Delete a Booking (Required by Rubric)
    public void deleteBooking(Long bookingId) {
        if (!bookingRepository.existsById(bookingId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found");
        }
        bookingRepository.deleteById(bookingId);
    }
    // Get a single booking by ID (Required for HATEOAS self-links)
    public Booking getBookingById(Long bookingId) {
        return bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found with ID: " + bookingId));
    }

    // 6. Generate Admin Analytics Dashboard
    public AnalyticsResponse getBookingAnalytics() {
        List<Booking> allBookings = bookingRepository.findAll();

        long total = allBookings.size();
        long pending = allBookings.stream().filter(b -> b.getStatus().equals("PENDING")).count();
        long approved = allBookings.stream().filter(b -> b.getStatus().equals("APPROVED")).count();
        long rejected = allBookings.stream().filter(b -> b.getStatus().equals("REJECTED")).count();

        // Group by Resource ID and count to find the most popular resources
        Map<Long, Long> popularResources = allBookings.stream()
                .collect(Collectors.groupingBy(Booking::getResourceId, Collectors.counting()));

        return AnalyticsResponse.builder()
                .totalBookings(total)
                .pendingRequests(pending)
                .approvedRequests(approved)
                .rejectedRequests(rejected)
                .popularResources(popularResources)
                .build();
    }
    
}