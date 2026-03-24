package com.smartcampus.backend.features.auth.service;

import java.time.Instant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class EmailVerificationNotificationService {

    @Value("${app.auth.email-verification.from:no-reply@smartcampus.local}")
    private String fromAddress;

    @Value("${app.auth.email-verification.require-email-send:false}")
    private boolean requireEmailSend;

    public void sendOtp(String recipientEmail, String fullName, String otp, Instant expiresAt) {
        String message = "OTP delivery placeholder";
        handleDeliveryIssue(message + " from " + fromAddress + " for " + fullName, recipientEmail, otp, expiresAt);
    }

    private void handleDeliveryIssue(String reason, String recipientEmail, String otp, Instant expiresAt) {
        if (requireEmailSend) {
            throw new IllegalStateException(reason);
        }

        // Local/dev fallback prints OTP until SMTP wiring is enabled.
        log.warn("{} for {}. OTP: {} (expires: {})", reason, recipientEmail, otp, expiresAt);
    }
}


