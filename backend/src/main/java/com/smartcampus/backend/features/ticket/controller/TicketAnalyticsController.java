package com.smartcampus.backend.features.ticket.controller;

import com.smartcampus.backend.features.ticket.dto.TicketAnalyticsResponse;
import com.smartcampus.backend.features.ticket.service.TicketAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/tickets/analytics")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class TicketAnalyticsController {

    private final TicketAnalyticsService analyticsService;

    @GetMapping
    public TicketAnalyticsResponse getAnalytics() {
        return analyticsService.getTicketAnalytics();
    }
}
