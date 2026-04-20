package com.smartcampus.backend.features.ticket.service;

import com.smartcampus.backend.features.storage.service.S3Service;
import com.smartcampus.backend.features.ticket.dto.TicketPresignedUrlResponse;
import com.smartcampus.backend.features.ticket.model.Ticket;
import com.smartcampus.backend.features.ticket.model.TicketAttachment;
import com.smartcampus.backend.features.ticket.model.TicketComment;
import com.smartcampus.backend.features.ticket.model.TicketStatus;
import com.smartcampus.backend.features.ticket.repository.TicketAttachmentRepository;
import com.smartcampus.backend.features.ticket.repository.TicketCommentRepository;
import com.smartcampus.backend.features.ticket.repository.TicketRepository;
import com.smartcampus.backend.features.user.model.User;
import com.smartcampus.backend.features.user.model.Role;
import com.smartcampus.backend.features.user.repository.UserRepository;
import com.smartcampus.backend.features.notifications.model.NotificationCategory;
import com.smartcampus.backend.features.notifications.model.NotificationSeverity;
import com.smartcampus.backend.features.notifications.service.NotificationEventPublisher;
import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final TicketCommentRepository commentRepository;
    private final S3Service s3Service;
    private final TicketAttachmentRepository attachmentRepository;
    private final NotificationEventPublisher notificationEventPublisher;


    // Create Ticket
    public Ticket createTicket(Ticket ticket) {

        // Get logged-in user
        String email = getAuthenticatedEmail();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Set required fields
        ticket.setUser(user);
        ticket.setStatus(TicketStatus.OPEN);
        ticket.setCreatedAt(LocalDateTime.now());

        // SLA CALCULATION (Innovation Feature)
        calculateDueDate(ticket);

        Ticket saved = ticketRepository.save(ticket);
        assignBestTechnician(saved);
        Ticket refreshed = ticketRepository.findById(saved.getId()).orElse(saved);
        publishTicketCreatedNotification(refreshed);
        return refreshed;
    }

    // Update Ticket
    public Ticket updateTicket(Long id, Ticket updatedTicket) {

        // Find existing ticket
        Ticket existing = ticketRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));

        // Only allow updates if status is OPEN
        if (existing.getStatus() != TicketStatus.OPEN) {
            throw new RuntimeException("Cannot update ticket. Already in progress or closed.");
        }

        // Update fields
        existing.setTitle(updatedTicket.getTitle());
        existing.setDescription(updatedTicket.getDescription());
        existing.setCategory(updatedTicket.getCategory());
        existing.setContactNumber(updatedTicket.getContactNumber());
        existing.setPriority(updatedTicket.getPriority());

        // Update timestamp
        existing.setUpdatedAt(java.time.LocalDateTime.now());

        // Save
        return ticketRepository.save(existing);
    }


    // Delete Ticket
    public void deleteTicket(Long id) {

        // Find ticket
        Ticket existing = ticketRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));

        // Only allow delete if status is OPEN
        if (existing.getStatus() != TicketStatus.OPEN) {
            throw new RuntimeException("Cannot delete ticket. Already in progress or closed.");
        }

        // Delete
        ticketRepository.delete(existing);
    }


    // Get logged-in user's tickets
    public List<Ticket> getMyTickets() {

        String email = getAuthenticatedEmail();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return ticketRepository.findByUserId(user.getId());
    }


    // Get ticket by ID (for admin)
    public Ticket getTicketById(Long id) {
    return ticketRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Ticket not found"));
    }

    public Ticket getMyTicketById(Long ticketId) {
        String email = getAuthenticatedEmail();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));

        if (ticket.getUser() == null || ticket.getUser().getId() == null || !ticket.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("You can only access your own tickets");
        }

        return ticket;
    }

    public TicketPresignedUrlResponse getMyTicketAttachmentUrl(Long ticketId, String key) {
        Ticket ticket = getMyTicketById(ticketId);
        return buildAttachmentUrlResponse(ticket, key);
    }

    public TicketPresignedUrlResponse getAdminTicketAttachmentUrl(Long ticketId, String key) {
        Ticket ticket = getTicketById(ticketId);
        return buildAttachmentUrlResponse(ticket, key);
    }

    public TicketPresignedUrlResponse getAssignedTicketAttachmentUrl(Long ticketId, String key) {
        Ticket ticket = getAssignedTicketById(ticketId);
        return buildAttachmentUrlResponse(ticket, key);
    }


    // Get all tickets (for admin)
    public List<Ticket> getAllTickets() {
    return ticketRepository.findAll();
    }

    public Ticket assignTechnician(Long ticketId, Long technicianId, User actor) {
        if (actor == null || actor.getRole() != Role.ADMIN) {
            throw new RuntimeException("Only admins can assign technicians");
        }

        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));

        User technician = userRepository.findById(technicianId)
                .orElseThrow(() -> new RuntimeException("Technician not found"));

        if (technician.getRole() != Role.TECHNICIAN || !Boolean.TRUE.equals(technician.getActive())) {
            throw new RuntimeException("Selected user is not an active technician");
        }

        if (ticket.getStatus() == TicketStatus.CLOSED) {
            throw new RuntimeException("Cannot assign a closed ticket");
        }

        ticket.setTechnician(technician);
        ticket.setStatus(TicketStatus.IN_PROGRESS);
        ticket.setUpdatedAt(LocalDateTime.now());
        Ticket saved = ticketRepository.save(ticket);
        publishAssignmentNotifications(saved, technician);
        return saved;
    }


    // Update ticket status with role-based rules
    public Ticket updateTicketStatus(Long ticketId, TicketStatus newStatus, User user) {

        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));

        TicketStatus current = ticket.getStatus();

        if (current == TicketStatus.CLOSED) {
            throw new RuntimeException("Ticket is already closed.");
        }

        // RULE 1: ADMIN → OPEN → IN_PROGRESS
        else if (user.getRole() == Role.ADMIN &&
                current == TicketStatus.OPEN &&
                newStatus == TicketStatus.IN_PROGRESS) {

            // AUTO ASSIGN TECHNICIAN
            if (ticket.getTechnician() == null) {
                assignBestTechnician(ticket);
            }

            ticket.setStatus(TicketStatus.IN_PROGRESS);
        }

        // RULE 2: TECHNICIAN → IN_PROGRESS → RESOLVED
        else if (user.getRole() == Role.TECHNICIAN &&
                current == TicketStatus.IN_PROGRESS &&
                newStatus == TicketStatus.RESOLVED) {

            ticket.setStatus(TicketStatus.RESOLVED);

            // AUTO COMMENT
            TicketComment comment = TicketComment.builder()
                    .message("Technician resolved the issue")
                    .ticket(ticket)
                    .user(user)
                    .createdAt(LocalDateTime.now())
                    .build();

            commentRepository.save(comment);
        }

        // RULE 3: ADMIN → RESOLVED → CLOSED
        else if ((user.getRole() == Role.ADMIN) &&
                current == TicketStatus.RESOLVED &&
                newStatus == TicketStatus.CLOSED) {

            ticket.setStatus(TicketStatus.CLOSED);

            // AUTO COMMENT (optional but recommended)
            TicketComment comment = TicketComment.builder()
                    .message("Ticket closed by admin")
                    .ticket(ticket)
                    .user(user)
                    .createdAt(LocalDateTime.now())
                    .build();

            commentRepository.save(comment);
        }

        else {
            throw new RuntimeException("Invalid status transition");
        }

    return ticketRepository.save(ticket);
    }

    private void calculateDueDate(Ticket ticket) {
        LocalDateTime now = LocalDateTime.now();
        String priority = ticket.getPriority() != null ? ticket.getPriority().toUpperCase(Locale.ROOT) : "MEDIUM";

        ticket.setDueDate(switch (priority) {
            case "URGENT" -> now.plusHours(4);
            case "HIGH" -> now.plusHours(24);
            case "MEDIUM" -> now.plusDays(3);
            case "LOW" -> now.plusDays(7);
            default -> now.plusDays(3);
        });
    }

    public Ticket rejectTicket(Long ticketId, String reason, User admin) {
        if (admin.getRole() != Role.ADMIN) {
            throw new RuntimeException("Only admins can reject tickets");
        }

        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));

        if (ticket.getStatus() != TicketStatus.OPEN) {
            throw new RuntimeException("Only open tickets can be rejected");
        }

        ticket.setStatus(TicketStatus.REJECTED);
        ticket.setRejectionReason(reason);
        ticket.setUpdatedAt(LocalDateTime.now());

        TicketComment comment = TicketComment.builder()
                .message("Ticket REJECTED. Reason: " + reason)
                .ticket(ticket)
                .user(admin)
                .createdAt(LocalDateTime.now())
                .build();
        commentRepository.save(comment);

        return ticketRepository.save(ticket);
    }

    public Ticket resolveTicket(Long ticketId, String notes, User technician) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));

        // Validate technician assignment
        if (ticket.getTechnician() == null || !ticket.getTechnician().getId().equals(technician.getId())) {
            throw new RuntimeException("You are not assigned to this ticket");
        }

        if (ticket.getStatus() != TicketStatus.IN_PROGRESS) {
            throw new RuntimeException("Only tickets in progress can be resolved");
        }

        ticket.setStatus(TicketStatus.RESOLVED);
        ticket.setResolutionNotes(notes);
        ticket.setUpdatedAt(LocalDateTime.now());

        TicketComment comment = TicketComment.builder()
                .message("Issue RESOLVED. Technician Notes: " + notes)
                .ticket(ticket)
                .user(technician)
                .createdAt(LocalDateTime.now())
                .build();
        commentRepository.save(comment);

        return ticketRepository.save(ticket);
    }

    public Ticket rateTicket(Long ticketId, Integer rating, String feedback, User user) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));

        if (!ticket.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("You can only rate your own tickets");
        }

        if (ticket.getStatus() != TicketStatus.RESOLVED && ticket.getStatus() != TicketStatus.CLOSED) {
            throw new RuntimeException("You can only rate resolved or closed tickets");
        }

        ticket.setRating(rating);
        ticket.setFeedback(feedback);
        return ticketRepository.save(ticket);
    }


    private int technicianIndex = 0; // For round-robin technician assignment

    private User getNextTechnician() {

        List<User> technicians = userRepository
                .searchUsers("", Role.TECHNICIAN, true, PageRequest.of(0, 100))
                .getContent();

        if (technicians.isEmpty()) {
            throw new RuntimeException("No technicians available");
        }

        User selected = technicians.get(technicianIndex % technicians.size());

        technicianIndex++;

        return selected;
    }

    private void assignBestTechnician(Ticket ticket) {
        Optional<User> selected = findBestTechnician(ticket.getCategory());
        if (selected.isEmpty()) {
            return;
        }

        ticket.setTechnician(selected.get());
        ticketRepository.save(ticket);
        publishAssignmentNotifications(ticket, selected.get());
    }

    private Optional<User> findBestTechnician(String category) {
        List<User> technicians = userRepository
                .searchUsers("", Role.TECHNICIAN, true, PageRequest.of(0, 100))
                .getContent();

        if (technicians.isEmpty()) {
            return Optional.empty();
        }

        String normalizedCategory = category == null ? "" : category.trim().toLowerCase(Locale.ROOT);

        return technicians.stream()
                .filter(tech -> Boolean.TRUE.equals(tech.getActive()))
                .sorted((a, b) -> {
                    boolean aMatches = matchesCategory(a.getSpecialties(), normalizedCategory);
                    boolean bMatches = matchesCategory(b.getSpecialties(), normalizedCategory);
                    if (aMatches != bMatches) {
                        return Boolean.compare(!aMatches, !bMatches);
                    }

                    return Integer.compare(countOpenWorkload(a.getId()), countOpenWorkload(b.getId()));
                })
                .findFirst();
    }

    private boolean matchesCategory(String specialties, String category) {
        if (specialties == null || specialties.isBlank() || category.isBlank()) {
            return false;
        }

        return List.of(specialties.split(","))
                .stream()
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(value -> value.toLowerCase(Locale.ROOT))
                .anyMatch(value -> value.contains(category) || category.contains(value));
    }

    private int countOpenWorkload(Long technicianId) {
        return (int) ticketRepository.findByTechnicianId(technicianId)
                .stream()
                .filter(ticket -> ticket.getStatus() == TicketStatus.OPEN || ticket.getStatus() == TicketStatus.IN_PROGRESS)
                .count();
    }

    private void publishAssignmentNotifications(Ticket ticket, User technician) {
        if (ticket.getUser() != null && ticket.getUser().getId() != null) {
            notificationEventPublisher.publishToUser(
                    ticket.getUser().getId(),
                    "TICKET_ASSIGNED",
                    "Your ticket has been assigned",
                    "Ticket #" + ticket.getId() + " has been assigned to " + technician.getFullName() + ".",
                    NotificationSeverity.INFO,
                    "/dashboard/user/tickets",
                    "tickets",
                    String.valueOf(ticket.getId()),
                    null,
                    NotificationCategory.TICKET);
        }

        notificationEventPublisher.publishToUser(
                technician.getId(),
                "TICKET_ASSIGNED",
                "New ticket assigned",
                "Ticket #" + ticket.getId() + " has been assigned to you.",
                NotificationSeverity.INFO,
                "/dashboard/technician/tickets",
                "tickets",
                String.valueOf(ticket.getId()),
                null,
                NotificationCategory.TICKET);
    }

    private void publishTicketCreatedNotification(Ticket ticket) {
        if (ticket.getUser() == null || ticket.getUser().getId() == null) {
            return;
        }

        notificationEventPublisher.publishToUser(
                ticket.getUser().getId(),
                "TICKET_CREATED",
                "Ticket submitted successfully",
                "Ticket #" + ticket.getId() + " has been submitted.",
                NotificationSeverity.SUCCESS,
                "/dashboard/user/tickets",
                "tickets",
                String.valueOf(ticket.getId()),
                null,
                NotificationCategory.TICKET);
    }

    private String extractKeyFromUrl(String fileUrl) {
        try {
            java.net.URI uri = java.net.URI.create(fileUrl);
            String path = uri.getPath();
            if (path == null || path.isBlank()) {
                return fileUrl;
            }
            return path.startsWith("/") ? path.substring(1) : path;
        } catch (Exception exception) {
            return fileUrl;
        }
    }

    private TicketPresignedUrlResponse buildAttachmentUrlResponse(Ticket ticket, String key) {
        if (key == null || key.isBlank()) {
            throw new RuntimeException("Attachment key is required");
        }

        String normalizedKey = key.trim();

        boolean isOwnedAttachment = ticket.getAttachments() != null && ticket.getAttachments().stream()
                .map(TicketAttachment::getFileUrl)
                .filter(Objects::nonNull)
                .map(this::extractKeyFromUrl)
                .anyMatch(normalizedKey::equals);

        if (!isOwnedAttachment) {
            throw new RuntimeException("Attachment does not belong to this ticket");
        }

        String url = s3Service.generatePresignedUrl(normalizedKey);
        Instant expiresAt = Instant.now().plus(Duration.ofMinutes(s3Service.getPresignMinutes()));
        return new TicketPresignedUrlResponse(normalizedKey, url, expiresAt);
    }

    public List<Ticket> getMyAssignedTickets() {

        String email = getAuthenticatedEmail();

        User technician = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Only tickets assigned to this technician
        return ticketRepository.findByTechnicianId(technician.getId());
    }

    public Ticket getAssignedTicketById(Long ticketId) {
        String email = getAuthenticatedEmail();

        User technician = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));

        if (ticket.getTechnician() == null || ticket.getTechnician().getId() == null || !ticket.getTechnician().getId().equals(technician.getId())) {
            throw new RuntimeException("You can only view tickets assigned to you");
        }

        return ticket;
    }

    public void saveAttachments(Ticket ticket, java.util.List<MultipartFile> files) {

        if (files.size() > 3) {
            throw new RuntimeException("Maximum 3 attachments allowed");
        }

        for (MultipartFile file : files) {

            String url = s3Service.uploadFile(file);

            TicketAttachment attachment = new TicketAttachment();
            attachment.setFileUrl(url);
            attachment.setTicket(ticket);

            attachmentRepository.save(attachment);
        }
    }

    private String getAuthenticatedEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth == null || !auth.isAuthenticated() || auth.getName() == null) {
            throw new RuntimeException("User not authenticated");
        }

        return auth.getName();
    }


}