package com.smartcampus.backend.features.auth.controller;

import com.smartcampus.backend.features.auth.dto.AuthResponse;
import com.smartcampus.backend.features.auth.dto.EmailVerificationResponse;
import com.smartcampus.backend.features.auth.dto.ForgotPasswordResetRequest;
import com.smartcampus.backend.features.auth.dto.ForgotPasswordResponse;
import com.smartcampus.backend.features.auth.dto.ForgotPasswordSendRequest;
import com.smartcampus.backend.features.auth.dto.LoginRequest;
import com.smartcampus.backend.features.auth.dto.LogoutRequest;
import com.smartcampus.backend.features.auth.dto.MeResponse;
import com.smartcampus.backend.features.auth.dto.RefreshTokenRequest;
import com.smartcampus.backend.features.auth.dto.RegisterRequest;
import com.smartcampus.backend.features.auth.dto.SendVerificationOtpRequest;
import com.smartcampus.backend.features.auth.dto.VerifyEmailOtpRequest;
import com.smartcampus.backend.features.auth.service.AuthService;
import com.smartcampus.backend.features.user.model.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(authService.refresh(request));
    }

    @PostMapping("/email-verification/send-otp")
    public ResponseEntity<EmailVerificationResponse> sendVerificationOtp(
            @Valid @RequestBody SendVerificationOtpRequest request) {
        return ResponseEntity.ok(authService.sendVerificationOtp(request));
    }

    @PostMapping("/email-verification/verify")
    public ResponseEntity<EmailVerificationResponse> verifyEmailOtp(
            @Valid @RequestBody VerifyEmailOtpRequest request) {
        return ResponseEntity.ok(authService.verifyEmailOtp(request));
    }

    @PostMapping("/forgot-password/send-otp")
    public ResponseEntity<ForgotPasswordResponse> sendForgotPasswordOtp(
            @Valid @RequestBody ForgotPasswordSendRequest request) {
        return ResponseEntity.ok(authService.sendForgotPasswordOtp(request));
    }

    @PostMapping("/forgot-password/reset")
    public ResponseEntity<ForgotPasswordResponse> resetForgotPassword(
            @Valid @RequestBody ForgotPasswordResetRequest request) {
        return ResponseEntity.ok(authService.resetForgotPassword(request));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(Authentication authentication,
                                       @RequestHeader(value = "Authorization", required = false) String authorization,
                                       @RequestBody(required = false) LogoutRequest request) {
        authService.logout(authentication, authorization, request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<MeResponse> me(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(authService.me(user));
    }
}

