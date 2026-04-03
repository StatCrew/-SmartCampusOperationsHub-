package com.smartcampus.backend.features.auth.service;

import java.time.Instant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class EmailVerificationNotificationService {

    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    @Value("${app.auth.email-verification.from:no-reply@smartcampus.local}")
    private String fromAddress;

    @Value("${app.auth.email-verification.require-email-send:false}")
    private boolean requireEmailSend;

    public void sendOtp(String recipientEmail, String fullName, String otp, Instant expiresAt) {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            handleDeliveryIssue("JavaMailSender is not configured", recipientEmail, otp, expiresAt);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(recipientEmail);
            message.setSubject("Smart Campus - Email Verification Code");
            message.setText(buildOtpBody(fullName, otp, expiresAt));
            mailSender.send(message);
        } catch (Exception ex) {
            handleDeliveryIssue("Failed to send OTP email: " + ex.getMessage(), recipientEmail, otp, expiresAt);
        }
    }

    public void sendPasswordResetOtp(String recipientEmail, String fullName, String otp, Instant expiresAt) {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            handleDeliveryIssue("JavaMailSender is not configured", recipientEmail, otp, expiresAt);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(recipientEmail);
            message.setSubject("Smart Campus - Password Reset Code");
            message.setText(buildPasswordResetBody(fullName, otp, expiresAt));
            mailSender.send(message);
        } catch (Exception ex) {
            handleDeliveryIssue("Failed to send password reset email: " + ex.getMessage(), recipientEmail, otp, expiresAt);
        }
    }

    public void sendEmailChangeOtp(String recipientEmail, String fullName, String otp, Instant expiresAt) {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            handleDeliveryIssue("JavaMailSender is not configured", recipientEmail, otp, expiresAt);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(recipientEmail);
            message.setSubject("Smart Campus - Verify New Email Address");
            message.setText(buildEmailChangeBody(fullName, otp, expiresAt));
            mailSender.send(message);
        } catch (Exception ex) {
            handleDeliveryIssue("Failed to send email change OTP: " + ex.getMessage(), recipientEmail, otp, expiresAt);
        }
    }

    private void handleDeliveryIssue(String reason, String recipientEmail, String otp, Instant expiresAt) {
        if (requireEmailSend) {
            throw new IllegalStateException(reason);
        }

        // Local/dev fallback prints OTP until SMTP wiring is enabled.
        log.warn("{} for {}. OTP: {} (expires: {})", reason, recipientEmail, otp, expiresAt);
    }

    private String buildOtpBody(String fullName, String otp, Instant expiresAt) {
        String recipientName = (fullName == null || fullName.isBlank()) ? "there" : fullName;

        return "Hello " + recipientName + ",\n\n"
                + "Your Smart Campus verification code is: " + otp + "\n"
                + "This code expires at: " + expiresAt + "\n\n"
                + "If you did not request this, you can ignore this email.\n\n"
                + "- Smart Campus Team";
    }

    private String buildPasswordResetBody(String fullName, String otp, Instant expiresAt) {
        String recipientName = (fullName == null || fullName.isBlank()) ? "there" : fullName;

        return "Hello " + recipientName + ",\n\n"
                + "Your Smart Campus password reset code is: " + otp + "\n"
                + "This code expires at: " + expiresAt + "\n\n"
                + "If you did not request a password reset, you can ignore this email.\n\n"
                + "- Smart Campus Team";
    }

    private String buildEmailChangeBody(String fullName, String otp, Instant expiresAt) {
        String recipientName = (fullName == null || fullName.isBlank()) ? "there" : fullName;

        return "Hello " + recipientName + ",\n\n"
                + "We received a request to change your Smart Campus email address.\n"
                + "Use this verification code to confirm the new address: " + otp + "\n"
                + "This code expires at: " + expiresAt + "\n\n"
                + "If you did not request this change, please ignore this email.\n\n"
                + "- Smart Campus Team";
    }
}


