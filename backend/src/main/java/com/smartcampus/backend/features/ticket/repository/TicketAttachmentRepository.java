package com.smartcampus.backend.features.ticket.repository;

import com.smartcampus.backend.features.ticket.model.TicketAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TicketAttachmentRepository extends JpaRepository<TicketAttachment, Long> {
}