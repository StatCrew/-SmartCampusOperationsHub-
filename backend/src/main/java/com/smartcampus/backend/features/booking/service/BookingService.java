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
import java.time.Duration;
import java.time.LocalDateTime;

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
            // Calculate the next available slot and return it in the error message
            LocalDateTime nextAvailable = findNextAvailableSlot(request.resourceId(), request.startTime(), request.endTime());
            LocalDateTime nextAvailableEnd = nextAvailable.plus(Duration.between(request.startTime(), request.endTime()));
            
            String suggestion = String.format("Resource is busy. The next available slot is from %s to %s.", 
                    nextAvailable.toString().replace("T", " "), 
                    nextAvailableEnd.toString().replace("T", " "));
                    
            throw new ResponseStatusException(HttpStatus.CONFLICT, suggestion);
        }

        // Using the Builder pattern to map DTO to Entity
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

    // 5. Delete a Booking 
    public void deleteBooking(Long bookingId) {
        if (!bookingRepository.existsById(bookingId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found");
        }
        bookingRepository.deleteById(bookingId);
    }

    // Get a single booking by ID 
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

    // 7. Update Full Booking (Handles the PUT request)
    public Booking updateFullBooking(Long id, BookingRequest request, User currentUser) {
        Booking existingBooking = getBookingById(id);

        // Check for conflicts, ignoring the current booking itself so we don't conflict with our own old timeslot
        List<Booking> conflicts = bookingRepository.findConflictingBookings(
                request.resourceId(),
                request.startTime(),
                request.endTime()
        );

        conflicts = conflicts.stream()
                .filter(b -> !b.getId().equals(id))
                .toList();

        if (!conflicts.isEmpty()) {
            LocalDateTime nextAvailable = findNextAvailableSlot(request.resourceId(), request.startTime(), request.endTime());
            LocalDateTime nextAvailableEnd = nextAvailable.plus(Duration.between(request.startTime(), request.endTime()));
            
            String suggestion = String.format("Resource is busy. The next available slot is from %s to %s.", 
                    nextAvailable.toString().replace("T", " "), 
                    nextAvailableEnd.toString().replace("T", " "));
                    
            throw new ResponseStatusException(HttpStatus.CONFLICT, suggestion);
        }

        // Overwrite the old details with the new ones from the request
        existingBooking.setResourceId(request.resourceId());
        existingBooking.setStartTime(request.startTime());
        existingBooking.setEndTime(request.endTime());
        existingBooking.setPurpose(request.purpose());
        existingBooking.setAttendees(request.attendees());
        
        // Because they changed the details, reset the status so an Admin reviews it again
        existingBooking.setStatus("PENDING");

        return bookingRepository.save(existingBooking);
    }

    // Helper Method: Calculates the next available time slot if a conflict occurs
    private LocalDateTime findNextAvailableSlot(Long resourceId, LocalDateTime requestedStart, LocalDateTime requestedEnd) {
        Duration requestedDuration = Duration.between(requestedStart, requestedEnd);
        LocalDateTime proposedStart = requestedStart;

        // Get all upcoming bookings for this resource to find a gap
        List<Booking> futureBookings = bookingRepository.findByResourceIdAndStartTimeGreaterThanEqualOrderByStartTimeAsc(resourceId, requestedStart);

        for (Booking b : futureBookings) {
            // Ignore cancelled or rejected bookings
            if (b.getStatus().equals("CANCELLED") || b.getStatus().equals("REJECTED")) {
                continue;
            }

            LocalDateTime proposedEnd = proposedStart.plus(requestedDuration);
            
            // If our proposed slot overlaps with this booking, push our proposed start to the end of this booking
            if (proposedStart.isBefore(b.getEndTime()) && proposedEnd.isAfter(b.getStartTime())) {
                proposedStart = b.getEndTime();
            } else {
                
                break;
            }
        }
        return proposedStart;
    }
    
}