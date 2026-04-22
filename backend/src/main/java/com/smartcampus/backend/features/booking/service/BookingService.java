package com.smartcampus.backend.features.booking.service;

import com.smartcampus.backend.features.booking.dto.AnalyticsResponse;
import com.smartcampus.backend.features.booking.dto.BookingRequest;
import com.smartcampus.backend.features.booking.model.Booking;
import com.smartcampus.backend.features.booking.repository.BookingRepository;
import com.smartcampus.backend.features.resource.model.ResourceAvailabilitySlot;
import com.smartcampus.backend.features.resource.repository.ResourceAvailabilitySlotRepository;
import com.smartcampus.backend.features.user.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service layer handling the business logic for facility reservations.
 * Manages creation, modification, and advanced conflict resolution.
 */
@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final ResourceAvailabilitySlotRepository slotRepository;

    /**
     * Creates a new booking after verifying resource availability.
     * Throws a CONFLICT status with suggested alternative times if the slot is taken.
     *
     * @param request     The booking details.
     * @param currentUser The authenticated user making the request.
     * @return The persisted Booking entity.
     */
    public Booking createBooking(BookingRequest request, User currentUser) {
        
        List<Booking> conflicts = bookingRepository.findConflictingBookings(
                request.resourceId(),
                request.startTime(),
                request.endTime()
        );

        if (!conflicts.isEmpty()) {
            String suggestion = buildConflictSuggestion(request.resourceId(), request.startTime(), request.endTime(), null);
            throw new ResponseStatusException(HttpStatus.CONFLICT, suggestion);
        }

        Booking newBooking = Booking.builder()
                .resourceId(request.resourceId())
                .user(currentUser)
                .startTime(request.startTime())
                .endTime(request.endTime())
                .purpose(request.purpose())
                .attendees(request.attendees())
                .status("PENDING")
                .build();

        return bookingRepository.save(newBooking);
    }

    /**
     * Retrieves all bookings associated with a specific user.
     */
    public List<Booking> getUserBookings(Long userId) {
        return bookingRepository.findByUserId(userId);
    }

    /**
     * Retrieves all bookings in the system.
     */
    public List<Booking> getAllBookings() {
        return bookingRepository.findAll();
    }

    /**
     * Updates the workflow status of an existing booking.
     */
    public Booking updateBookingStatus(Long bookingId, String newStatus) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));

        if (!newStatus.equals("APPROVED") && !newStatus.equals("REJECTED") && !newStatus.equals("CANCELLED")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status provided.");
        }

        booking.setStatus(newStatus);
        return bookingRepository.save(booking);
    }

    /**
     * Permanently deletes a booking record from the database.
     */
    public void deleteBooking(Long bookingId) {
        if (!bookingRepository.existsById(bookingId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found");
        }
        bookingRepository.deleteById(bookingId);
    }

    /**
     * Retrieves a single booking by its ID.
     */
    public Booking getBookingById(Long bookingId) {
        return bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found with ID: " + bookingId));
    }

    /**
     * Generates aggregated metrics for the administrative dashboard.
     */
    public AnalyticsResponse getBookingAnalytics() {
        List<Booking> allBookings = bookingRepository.findAll();

        long total = allBookings.size();
        long pending = allBookings.stream().filter(b -> b.getStatus().equals("PENDING")).count();
        long approved = allBookings.stream().filter(b -> b.getStatus().equals("APPROVED")).count();
        long rejected = allBookings.stream().filter(b -> b.getStatus().equals("REJECTED")).count();

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

    /**
     * Replaces the details of an existing booking and resets its status for review.
     * Prevents the existing booking from triggering a conflict with itself.
     */
    public Booking updateFullBooking(Long id, BookingRequest request, User currentUser) {
        Booking existingBooking = getBookingById(id);

        List<Booking> conflicts = bookingRepository.findConflictingBookings(
                request.resourceId(),
                request.startTime(),
                request.endTime()
        );

        conflicts = conflicts.stream()
                .filter(b -> !b.getId().equals(id))
                .toList();

        if (!conflicts.isEmpty()) {
            String suggestion = buildConflictSuggestion(request.resourceId(), request.startTime(), request.endTime(), id);
            throw new ResponseStatusException(HttpStatus.CONFLICT, suggestion);
        }

        existingBooking.setResourceId(request.resourceId());
        existingBooking.setStartTime(request.startTime());
        existingBooking.setEndTime(request.endTime());
        existingBooking.setPurpose(request.purpose());
        existingBooking.setAttendees(request.attendees());
        
        existingBooking.setStatus("PENDING");

        return bookingRepository.save(existingBooking);
    }

    /**
     * Advanced scheduling algorithm. 
     * Merges fragmented database slots in memory, then analyzes the dynamic operational hours 
     * of a resource to recommend the absolute next available slot.
     */
    private String buildConflictSuggestion(Long resourceId, LocalDateTime reqStart, LocalDateTime reqEnd, Long ignoreBookingId) {
        List<ResourceAvailabilitySlot> rawSchedule = slotRepository.findByResourceId(resourceId);
        
        if (rawSchedule == null || rawSchedule.isEmpty()) {
            return "Resource scheduling is not configured. Please contact the administrator.";
        }

        // Phase 1: Merge fragmented 1-hour database slots into contiguous blocks
        Map<DayOfWeek, List<TimeWindow>> scheduleMap = new HashMap<>();
        for (DayOfWeek day : DayOfWeek.values()) {
            List<ResourceAvailabilitySlot> daySlots = rawSchedule.stream()
                    .filter(s -> s.getDayOfWeek() == day)
                    .sorted(Comparator.comparing(ResourceAvailabilitySlot::getStartTime))
                    .toList();

            List<TimeWindow> merged = new ArrayList<>();
            TimeWindow current = null;
            
            for (ResourceAvailabilitySlot slot : daySlots) {
                if (current == null) {
                    current = new TimeWindow(slot.getStartTime(), slot.getEndTime());
                } else if (!slot.getStartTime().isAfter(current.end)) {
                    // Slots are contiguous or overlapping; extend the current window
                    if (slot.getEndTime().isAfter(current.end)) {
                        current.end = slot.getEndTime();
                    }
                } else {
                    merged.add(current);
                    current = new TimeWindow(slot.getStartTime(), slot.getEndTime());
                }
            }
            if (current != null) {
                merged.add(current);
            }
            scheduleMap.put(day, merged);
        }

        // Phase 2: Fetch bookings to identify conflicts
        List<Booking> futureBookings = bookingRepository.findByResourceIdAndStartTimeGreaterThanEqualOrderByStartTimeAsc(
                resourceId, reqStart.toLocalDate().atStartOfDay()
        ).stream()
         .filter(b -> "APPROVED".equals(b.getStatus()) || "PENDING".equals(b.getStatus()))
         .filter(b -> ignoreBookingId == null || !b.getId().equals(ignoreBookingId))
         .toList();

        Duration duration = Duration.between(reqStart, reqEnd);
        LocalDate checkDate = reqStart.toLocalDate();
        LocalDateTime searchTime = reqStart;

        LocalDateTime nextAvailableStart = null;
        LocalDateTime nextAvailableEnd = null;

        int daysChecked = 0;
        
        // Phase 3: Scan ahead up to 14 days
        while (daysChecked < 14) { 
            List<TimeWindow> daySchedule = scheduleMap.get(checkDate.getDayOfWeek());

            if (daySchedule != null) {
                for (TimeWindow window : daySchedule) {
                    LocalDateTime windowStart = checkDate.atTime(window.start);
                    LocalDateTime windowEnd = checkDate.atTime(window.end);

                    // Skip this window if we are already past its end time
                    if (!searchTime.isBefore(windowEnd)) continue;

                    LocalDateTime currentSearchStart = searchTime.isAfter(windowStart) ? searchTime : windowStart;

                    while (!currentSearchStart.plus(duration).isAfter(windowEnd)) {
                        LocalDateTime currentSearchEnd = currentSearchStart.plus(duration);
                        LocalDateTime finalSearchStart = currentSearchStart;

                        // Identify any overlap with existing bookings
                        List<Booking> overlaps = futureBookings.stream()
                                .filter(b -> finalSearchStart.isBefore(b.getEndTime()) && currentSearchEnd.isAfter(b.getStartTime()))
                                .toList();

                        if (overlaps.isEmpty()) {
                            // Valid gap found!
                            nextAvailableStart = currentSearchStart;
                            nextAvailableEnd = currentSearchEnd;
                            break; 
                        } else {
                            // Jump to the conclusion of the overlapping booking
                            LocalDateTime maxOverlapEnd = overlaps.stream()
                                    .map(Booking::getEndTime)
                                    .max(LocalDateTime::compareTo)
                                    .orElse(currentSearchEnd);
                                    
                            currentSearchStart = maxOverlapEnd;

                            // Apply rounding for a clean UI presentation (nearest 30m)
                            int min = currentSearchStart.getMinute();
                            if (min > 0 && min <= 30) {
                                currentSearchStart = currentSearchStart.withMinute(30).withSecond(0).withNano(0);
                            } else if (min > 30) {
                                currentSearchStart = currentSearchStart.plusHours(1).withMinute(0).withSecond(0).withNano(0);
                            }
                        }
                    }
                    if (nextAvailableStart != null) break;
                }
            }

            if (nextAvailableStart != null) break;

            // Reset search time to start of the next day
            checkDate = checkDate.plusDays(1);
            searchTime = checkDate.atStartOfDay();
            daysChecked++;
        }

        if (nextAvailableStart == null) {
            return "Resource is fully booked for the foreseeable future.";
        }

        return String.format("Time conflict. Next available: %s to %s.", 
                nextAvailableStart.toString().replace("T", " "), 
                nextAvailableEnd.toString().replace("T", " "));
    }

    /**
     * Lightweight inner class to handle memory-merged time windows cleanly.
     */
    private static class TimeWindow {
        LocalTime start;
        LocalTime end;
        
        TimeWindow(LocalTime start, LocalTime end) {
            this.start = start;
            this.end = end;
        }
    }
}