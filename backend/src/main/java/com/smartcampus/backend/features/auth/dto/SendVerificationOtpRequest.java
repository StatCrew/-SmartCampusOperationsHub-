package com.smartcampus.backend.features.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record SendVerificationOtpRequest(
        @NotBlank @Email String email
) {
}

