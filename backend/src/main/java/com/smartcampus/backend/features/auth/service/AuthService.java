package com.smartcampus.backend.features.auth.service;

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
import com.smartcampus.backend.features.auth.model.EmailVerificationOtp;
import com.smartcampus.backend.features.auth.model.PasswordResetOtp;
import com.smartcampus.backend.features.auth.model.RefreshToken;
import com.smartcampus.backend.features.auth.model.RevokedToken;
import com.smartcampus.backend.features.auth.repository.EmailVerificationOtpRepository;
import com.smartcampus.backend.features.auth.repository.PasswordResetOtpRepository;
import com.smartcampus.backend.features.auth.repository.RefreshTokenRepository;
import com.smartcampus.backend.features.auth.repository.RevokedTokenRepository;
import com.smartcampus.backend.features.user.model.AuthProvider;
import com.smartcampus.backend.features.user.model.Role;
import com.smartcampus.backend.features.user.model.User;
import com.smartcampus.backend.features.user.repository.UserRepository;
import com.smartcampus.backend.security.jwt.JwtService;
import io.jsonwebtoken.JwtException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.concurrent.ThreadLocalRandom;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.TOO_MANY_REQUESTS;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final EmailVerificationNotificationService emailVerificationNotificationService;
    private final EmailVerificationOtpRepository emailVerificationOtpRepository;
    private final PasswordResetOtpRepository passwordResetOtpRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final RevokedTokenRepository revokedTokenRepository;

    @Value("${app.auth.email-verification.otp-minutes:10}")
    private long otpValidityMinutes;

    @Value("${app.auth.email-verification.max-attempts:5}")
    private int otpMaxAttempts;

    @Value("${app.auth.email-verification.resend-cooldown-seconds:60}")
    private long resendCooldownSeconds;

    @Value("${app.auth.forgot-password.otp-minutes:10}")
    private long forgotPasswordOtpValidityMinutes;

    @Value("${app.auth.forgot-password.max-attempts:5}")
    private int forgotPasswordOtpMaxAttempts;

    @Value("${app.auth.forgot-password.resend-cooldown-seconds:60}")
    private long forgotPasswordResendCooldownSeconds;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String normalizedEmail = request.email().toLowerCase().trim();
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new ResponseStatusException(BAD_REQUEST, "Email is already registered");
        }

        User user = User.builder()
                .fullName(request.fullName().trim())
                .email(normalizedEmail)
                .password(passwordEncoder.encode(request.password()))
                .role(Role.USER)
                .provider(AuthProvider.LOCAL)
                .emailVerified(false)
                .createdAt(Instant.now())
                .build();

        User savedUser = userRepository.save(user);
        sendOtpForUser(savedUser);
        return issueTokenPair(savedUser);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String normalizedEmail = request.email().toLowerCase().trim();
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(normalizedEmail, request.password()));
            User user = (User) authentication.getPrincipal();

            if (user.getProvider() == AuthProvider.LOCAL && !user.isEmailVerified()) {
                throw new ResponseStatusException(FORBIDDEN, "Email is not verified. Verify your email before login");
            }

            return issueTokenPair(user);
        } catch (BadCredentialsException ex) {
            throw new ResponseStatusException(UNAUTHORIZED, "Invalid email or password");
        }
    }

    @Transactional
    public EmailVerificationResponse sendVerificationOtp(SendVerificationOtpRequest request) {
        String normalizedEmail = request.email().toLowerCase().trim();
        User user = userRepository.findByEmail(normalizedEmail)
                .orElse(null);

        if (user == null) {
            return new EmailVerificationResponse(
                    "If this email is registered, a verification code has been sent",
                    false,
                    null);
        }

        if (user.getProvider() != AuthProvider.LOCAL) {
            return new EmailVerificationResponse(
                    "OAuth accounts are already verified",
                    true,
                    null);
        }

        if (user.isEmailVerified()) {
            return new EmailVerificationResponse("Email is already verified", true, null);
        }

        EmailVerificationOtp otp = sendOtpForUser(user);
        return new EmailVerificationResponse("Verification code sent", false, otp.getExpiresAt());
    }

    @Transactional
    public EmailVerificationResponse verifyEmailOtp(VerifyEmailOtpRequest request) {
        String normalizedEmail = request.email().toLowerCase().trim();
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResponseStatusException(BAD_REQUEST, "Invalid verification request"));

        if (user.getProvider() != AuthProvider.LOCAL) {
            throw new ResponseStatusException(BAD_REQUEST, "Email verification is only required for local accounts");
        }

        if (user.isEmailVerified()) {
            return new EmailVerificationResponse("Email is already verified", true, null);
        }

        EmailVerificationOtp otpRecord = emailVerificationOtpRepository
                .findTopByUserIdAndConsumedFalseOrderByCreatedAtDesc(user.getId())
                .orElseThrow(() -> new ResponseStatusException(BAD_REQUEST, "OTP not found. Request a new code"));

        Instant now = Instant.now();
        if (otpRecord.getExpiresAt().isBefore(now)) {
            otpRecord.setConsumed(true);
            otpRecord.setConsumedAt(now);
            emailVerificationOtpRepository.save(otpRecord);
            throw new ResponseStatusException(BAD_REQUEST, "OTP has expired. Request a new code");
        }

        if (otpRecord.getAttempts() >= otpRecord.getMaxAttempts()) {
            otpRecord.setConsumed(true);
            otpRecord.setConsumedAt(now);
            emailVerificationOtpRepository.save(otpRecord);
            throw new ResponseStatusException(BAD_REQUEST, "OTP attempts exceeded. Request a new code");
        }

        if (!otpRecord.getOtpHash().equals(hashToken(request.otp().trim()))) {
            otpRecord.setAttempts(otpRecord.getAttempts() + 1);
            if (otpRecord.getAttempts() >= otpRecord.getMaxAttempts()) {
                otpRecord.setConsumed(true);
                otpRecord.setConsumedAt(now);
            }
            emailVerificationOtpRepository.save(otpRecord);
            throw new ResponseStatusException(BAD_REQUEST, "Invalid OTP code");
        }

        otpRecord.setConsumed(true);
        otpRecord.setConsumedAt(now);
        emailVerificationOtpRepository.save(otpRecord);

        user.setEmailVerified(true);
        userRepository.save(user);

        return new EmailVerificationResponse("Email verified successfully", true, null);
    }

    @Transactional
    public ForgotPasswordResponse sendForgotPasswordOtp(ForgotPasswordSendRequest request) {
        String normalizedEmail = request.email().toLowerCase().trim();
        User user = userRepository.findByEmail(normalizedEmail).orElse(null);

        if (user == null || user.getProvider() != AuthProvider.LOCAL) {
            return new ForgotPasswordResponse(
                    "If this account exists, a password reset code has been sent",
                    null);
        }

        PasswordResetOtp otp = sendPasswordResetOtpForUser(user);
        return new ForgotPasswordResponse("Password reset code sent", otp.getExpiresAt());
    }

    @Transactional
    public ForgotPasswordResponse resetForgotPassword(ForgotPasswordResetRequest request) {
        String normalizedEmail = request.email().toLowerCase().trim();
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResponseStatusException(BAD_REQUEST, "Invalid password reset request"));

        if (user.getProvider() != AuthProvider.LOCAL) {
            throw new ResponseStatusException(BAD_REQUEST, "Password reset is only available for local accounts");
        }

        PasswordResetOtp otpRecord = passwordResetOtpRepository
                .findTopByUserIdAndConsumedFalseOrderByCreatedAtDesc(user.getId())
                .orElseThrow(() -> new ResponseStatusException(BAD_REQUEST, "OTP not found. Request a new code"));

        Instant now = Instant.now();
        if (otpRecord.getExpiresAt().isBefore(now)) {
            otpRecord.setConsumed(true);
            otpRecord.setConsumedAt(now);
            passwordResetOtpRepository.save(otpRecord);
            throw new ResponseStatusException(BAD_REQUEST, "OTP has expired. Request a new code");
        }

        if (otpRecord.getAttempts() >= otpRecord.getMaxAttempts()) {
            otpRecord.setConsumed(true);
            otpRecord.setConsumedAt(now);
            passwordResetOtpRepository.save(otpRecord);
            throw new ResponseStatusException(BAD_REQUEST, "OTP attempts exceeded. Request a new code");
        }

        if (!otpRecord.getOtpHash().equals(hashToken(request.otp().trim()))) {
            otpRecord.setAttempts(otpRecord.getAttempts() + 1);
            if (otpRecord.getAttempts() >= otpRecord.getMaxAttempts()) {
                otpRecord.setConsumed(true);
                otpRecord.setConsumedAt(now);
            }
            passwordResetOtpRepository.save(otpRecord);
            throw new ResponseStatusException(BAD_REQUEST, "Invalid OTP code");
        }

        otpRecord.setConsumed(true);
        otpRecord.setConsumedAt(now);
        passwordResetOtpRepository.save(otpRecord);

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        revokeAllRefreshTokens(user, now);

        return new ForgotPasswordResponse("Password reset successfully", null);
    }

    @Transactional
    public AuthResponse refresh(RefreshTokenRequest request) {
        String refreshToken = request.refreshToken().trim();
        String tokenHash = hashToken(refreshToken);

        RefreshToken storedToken = refreshTokenRepository.findByTokenHashAndRevokedFalse(tokenHash)
                .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "Invalid refresh token"));

        if (storedToken.getExpiresAt().isBefore(Instant.now())) {
            storedToken.setRevoked(true);
            storedToken.setRevokedAt(Instant.now());
            refreshTokenRepository.save(storedToken);
            throw new ResponseStatusException(UNAUTHORIZED, "Refresh token expired");
        }

        User user = storedToken.getUser();

        try {
            if (!jwtService.isTokenValid(refreshToken, user, JwtService.TOKEN_TYPE_REFRESH)) {
                throw new ResponseStatusException(UNAUTHORIZED, "Invalid refresh token");
            }
        } catch (JwtException | IllegalArgumentException ex) {
            throw new ResponseStatusException(UNAUTHORIZED, "Invalid refresh token");
        }

        storedToken.setRevoked(true);
        storedToken.setRevokedAt(Instant.now());
        refreshTokenRepository.save(storedToken);

        return issueTokenPair(user);
    }

    @Transactional
    public void logout(Authentication authentication, String authorizationHeader, LogoutRequest request) {
        String refreshToken = request == null ? null : request.refreshToken();
        if (refreshToken != null && !refreshToken.isBlank()) {
            revokeRefreshToken(refreshToken.trim(), authentication);
        }

        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return;
        }

        String accessToken = authorizationHeader.substring(7);
        try {
            if (!JwtService.TOKEN_TYPE_ACCESS.equals(jwtService.extractTokenType(accessToken))) {
                return;
            }

            String jti = jwtService.extractJti(accessToken);
            Instant expiresAt = jwtService.extractExpiration(accessToken);

            if (jti != null && !jti.isBlank() && !expiresAt.isBefore(Instant.now()) && !revokedTokenRepository.existsByJti(jti)) {
                revokedTokenRepository.save(RevokedToken.builder()
                        .jti(jti)
                        .expiresAt(expiresAt)
                        .revokedAt(Instant.now())
                        .build());
            }
        } catch (JwtException | IllegalArgumentException ignored) {
            // Ignore malformed/expired access token during logout.
        }
    }

    public MeResponse me(User authenticatedUser) {
        return new MeResponse(
                authenticatedUser.getId(),
                authenticatedUser.getFullName(),
                authenticatedUser.getEmail(),
                authenticatedUser.getRole().name(),
                authenticatedUser.isEmailVerified(),
                authenticatedUser.getProvider().name());
    }

    @Transactional
    public AuthResponse issueOAuthToken(User user) {
        return issueTokenPair(user);
    }

    private AuthResponse issueTokenPair(User user) {
        refreshTokenRepository.deleteByExpiresAtBefore(Instant.now());
        revokedTokenRepository.deleteByExpiresAtBefore(Instant.now());

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .tokenHash(hashToken(refreshToken))
                .expiresAt(jwtService.extractExpiration(refreshToken))
                .revoked(false)
                .createdAt(Instant.now())
                .build());

        return mapAuthResponse(user, accessToken, refreshToken);
    }

    private AuthResponse mapAuthResponse(User user, String accessToken, String refreshToken) {
        AuthResponse.UserSummary summary = new AuthResponse.UserSummary(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole().name(),
                user.isEmailVerified(),
                user.getProvider().name());

        return new AuthResponse(accessToken, refreshToken, "Bearer", summary);
    }

    private void revokeRefreshToken(String refreshToken, Authentication authentication) {
        String tokenHash = hashToken(refreshToken);
        RefreshToken storedToken = refreshTokenRepository.findByTokenHashAndRevokedFalse(tokenHash)
                .orElse(null);

        if (storedToken == null) {
            return;
        }

        if (authentication != null
                && !(authentication instanceof AnonymousAuthenticationToken)
                && authentication.getPrincipal() instanceof User authenticatedUser
                && !storedToken.getUser().getId().equals(authenticatedUser.getId())) {
            throw new ResponseStatusException(UNAUTHORIZED, "Refresh token does not belong to authenticated user");
        }

        storedToken.setRevoked(true);
        storedToken.setRevokedAt(Instant.now());
        refreshTokenRepository.save(storedToken);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 algorithm is not available", ex);
        }
    }

    private EmailVerificationOtp sendOtpForUser(User user) {
        Instant now = Instant.now();
        emailVerificationOtpRepository.deleteByExpiresAtBefore(now);

        EmailVerificationOtp currentOtp = emailVerificationOtpRepository
                .findTopByUserIdAndConsumedFalseOrderByCreatedAtDesc(user.getId())
                .orElse(null);

        if (currentOtp != null
                && currentOtp.getCreatedAt().plus(resendCooldownSeconds, ChronoUnit.SECONDS).isAfter(now)) {
            throw new ResponseStatusException(TOO_MANY_REQUESTS, "Please wait before requesting another OTP");
        }

        if (currentOtp != null) {
            currentOtp.setConsumed(true);
            currentOtp.setConsumedAt(now);
            emailVerificationOtpRepository.save(currentOtp);
        }

        String otp = generateOtp();
        EmailVerificationOtp newOtp = emailVerificationOtpRepository.save(EmailVerificationOtp.builder()
                .user(user)
                .otpHash(hashToken(otp))
                .expiresAt(now.plus(otpValidityMinutes, ChronoUnit.MINUTES))
                .attempts(0)
                .maxAttempts(otpMaxAttempts)
                .consumed(false)
                .createdAt(now)
                .build());

        emailVerificationNotificationService.sendOtp(user.getEmail(), user.getFullName(), otp, newOtp.getExpiresAt());
        return newOtp;
    }

    private PasswordResetOtp sendPasswordResetOtpForUser(User user) {
        Instant now = Instant.now();
        passwordResetOtpRepository.deleteByExpiresAtBefore(now);

        PasswordResetOtp currentOtp = passwordResetOtpRepository
                .findTopByUserIdAndConsumedFalseOrderByCreatedAtDesc(user.getId())
                .orElse(null);

        if (currentOtp != null
                && currentOtp.getCreatedAt().plus(forgotPasswordResendCooldownSeconds, ChronoUnit.SECONDS).isAfter(now)) {
            throw new ResponseStatusException(TOO_MANY_REQUESTS, "Please wait before requesting another OTP");
        }

        if (currentOtp != null) {
            currentOtp.setConsumed(true);
            currentOtp.setConsumedAt(now);
            passwordResetOtpRepository.save(currentOtp);
        }

        String otp = generateOtp();
        PasswordResetOtp newOtp = passwordResetOtpRepository.save(PasswordResetOtp.builder()
                .user(user)
                .otpHash(hashToken(otp))
                .expiresAt(now.plus(forgotPasswordOtpValidityMinutes, ChronoUnit.MINUTES))
                .attempts(0)
                .maxAttempts(forgotPasswordOtpMaxAttempts)
                .consumed(false)
                .createdAt(now)
                .build());

        emailVerificationNotificationService
                .sendPasswordResetOtp(user.getEmail(), user.getFullName(), otp, newOtp.getExpiresAt());
        return newOtp;
    }

    private void revokeAllRefreshTokens(User user, Instant now) {
        for (RefreshToken refreshToken : refreshTokenRepository.findAllByUserIdAndRevokedFalse(user.getId())) {
            refreshToken.setRevoked(true);
            refreshToken.setRevokedAt(now);
        }
    }

    private String generateOtp() {
        int value = ThreadLocalRandom.current().nextInt(100000, 1000000);
        return String.valueOf(value);
    }
}

