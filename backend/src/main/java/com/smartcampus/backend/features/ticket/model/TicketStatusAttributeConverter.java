package com.smartcampus.backend.features.ticket.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = false)
public class TicketStatusAttributeConverter implements AttributeConverter<TicketStatus, String> {

    @Override
    public String convertToDatabaseColumn(TicketStatus attribute) {
        return attribute == null ? null : attribute.name();
    }

    @Override
    public TicketStatus convertToEntityAttribute(String dbData) {
        return dbData == null ? null : TicketStatus.from(dbData);
    }
}

