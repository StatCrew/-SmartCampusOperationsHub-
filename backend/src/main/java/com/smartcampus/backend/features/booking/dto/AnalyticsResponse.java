package com.smartcampus.backend.features.booking.dto;

import lombok.Builder;
import lombok.Data;
import java.util.Map;

@Data
@Builder
public class AnalyticsResponse {
    private long totalBookings;
    private long pendingRequests;
    private long approvedRequests;
    private long rejectedRequests;
    private Map<Long, Long> popularResources; // Shows Resource ID -> Number of Bookings
}