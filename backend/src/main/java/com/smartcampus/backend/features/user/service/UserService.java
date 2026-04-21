package com.smartcampus.backend.features.user.service;

import com.smartcampus.backend.features.auth.dto.AuthResponse;
import com.smartcampus.backend.features.auth.model.EmailChangeOtp;
import com.smartcampus.backend.features.auth.repository.EmailChangeOtpRepository;
import com.smartcampus.backend.features.auth.service.AuthService;
import com.smartcampus.backend.features.auth.service.EmailVerificationNotificationService;
import com.smartcampus.backend.features.notifications.model.NotificationSeverity;
import com.smartcampus.backend.features.notifications.service.NotificationEventPublisher;
import com.smartcampus.backend.features.user.dto.CreateTechnicianRequest;
import com.smartcampus.backend.features.user.dto.ProfileUpdateResponse;
import com.smartcampus.backend.features.user.dto.UpdateAdminUserRequest;
import com.smartcampus.backend.features.user.dto.UpdateRoleRequest;
import com.smartcampus.backend.features.user.dto.UpdateUserRequest;
import com.smartcampus.backend.features.user.dto.UpdateUserStatusRequest;
import com.smartcampus.backend.features.user.dto.UserResponse;
import com.smartcampus.backend.features.user.dto.VerifyEmailChangeRequest;
import com.smartcampus.backend.features.user.model.AuthProvider;
import com.smartcampus.backend.features.user.model.Role;
import com.smartcampus.backend.features.user.model.User;
import com.smartcampus.backend.features.user.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.concurrent.ThreadLocalRandom;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;
import static org.springframework.http.HttpStatus.TOO_MANY_REQUESTS;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailChangeOtpRepository emailChangeOtpRepository;
    private final EmailVerificationNotificationService emailVerificationNotificationService;
    private final AuthService authService;
    private final NotificationEventPublisher notificationEventPublisher;

    @Transactional(readOnly = true)
    public UserResponse getMyProfile(User authenticatedUser) {
        User user = loadAuthenticatedUser(authenticatedUser);
        return toResponse(user);
    }

    @Transactional
    public ProfileUpdateResponse updateMyProfile(User authenticatedUser, UpdateUserRequest request) {
        User user = loadAuthenticatedUser(authenticatedUser);
        user.setFullName(request.fullName().trim());

        String requestedEmail = normalizeEmail(request.email());
        User savedUser = userRepository.save(user);

        if (requestedEmail == null || requestedEmail.equalsIgnoreCase(savedUser.getEmail())) {
            return new ProfileUpdateResponse(
                    toResponse(savedUser),
                    false,
                    null,
                    null,
                    "Profile updated successfully"
            );
        }

        if (savedUser.getProvider() != AuthProvider.LOCAL) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email changes are only available for local accounts");
        }

        userRepository.findByEmail(requestedEmail)
                .filter(existing -> !existing.getId().equals(savedUser.getId()))
                .ifPresent(existing -> {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is already registered");
                });

        EmailChangeOtp otp = sendEmailChangeOtp(savedUser, requestedEmail);
        return new ProfileUpdateResponse(
                toResponse(savedUser),
                true,
                requestedEmail,
                otp.getExpiresAt(),
                "Verification code sent to your new email address"
        );
    }

    @Transactional
    public AuthResponse verifyEmailChange(User authenticatedUser, VerifyEmailChangeRequest request) {
        User user = loadAuthenticatedUser(authenticatedUser);

        if (user.getProvider() != AuthProvider.LOCAL) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email changes are only available for local accounts");
        }

        String targetEmail = normalizeEmail(request.email());
        EmailChangeOtp otpRecord = emailChangeOtpRepository
                .findTopByUserIdAndTargetEmailIgnoreCaseAndConsumedFalseOrderByCreatedAtDesc(user.getId(), targetEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email change request not found. Request a new code"));

        Instant now = Instant.now();
        if (otpRecord.getExpiresAt().isBefore(now)) {
            otpRecord.setConsumed(true);
            otpRecord.setConsumedAt(now);
            emailChangeOtpRepository.save(otpRecord);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP has expired. Request a new code");
        }

        if (otpRecord.getAttempts() >= otpRecord.getMaxAttempts()) {
            otpRecord.setConsumed(true);
            otpRecord.setConsumedAt(now);
            emailChangeOtpRepository.save(otpRecord);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP attempts exceeded. Request a new code");
        }

        if (!otpRecord.getOtpHash().equals(hashToken(request.otp().trim()))) {
            otpRecord.setAttempts(otpRecord.getAttempts() + 1);
            if (otpRecord.getAttempts() >= otpRecord.getMaxAttempts()) {
                otpRecord.setConsumed(true);
                otpRecord.setConsumedAt(now);
            }
            emailChangeOtpRepository.save(otpRecord);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid OTP code");
        }

        otpRecord.setConsumed(true);
        otpRecord.setConsumedAt(now);
        emailChangeOtpRepository.save(otpRecord);

        user.setEmail(targetEmail);
        user.setEmailVerified(true);
        User savedUser = userRepository.save(user);
        return authService.issueTokenPairForUser(savedUser);
    }

    @Transactional
    public UserResponse createTechnician(CreateTechnicianRequest request) {
        return createUser(request.fullName(), request.email(), request.password(), Role.TECHNICIAN, true, request.specialties());
    }

    @Transactional
    public UserResponse createUser(String fullName, String email, String password, Role role, Boolean active) {
        return createUser(fullName, email, password, role, active, null);
    }

    @Transactional
    public UserResponse createUser(String fullName, String email, String password, Role role, Boolean active, String specialties) {
        String normalizedEmail = normalizeEmail(email);
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new ResponseStatusException(BAD_REQUEST, "Email is already registered");
        }

        User createdUser = User.builder()
                .fullName(fullName.trim())
                .email(normalizedEmail)
                .password(passwordEncoder.encode(password))
                .role(role)
                .provider(AuthProvider.LOCAL)
                .specialties(normalizeSpecialties(specialties))
                .emailVerified(Boolean.TRUE.equals(active))
                .active(Boolean.TRUE.equals(active))
                .createdAt(Instant.now())
                .build();

        User savedUser = userRepository.save(createdUser);

        notificationEventPublisher.publishToUser(
                savedUser.getId(),
                "USER_ACCOUNT_CREATED",
                "Your account is ready",
                "Your Smart Campus account has been created by an administrator.",
                NotificationSeverity.SUCCESS,
                "/dashboard/user/profile",
                "users",
                String.valueOf(savedUser.getId()),
                null);

        return toResponse(savedUser);
    }

    @Transactional(readOnly = true)
    public Page<UserResponse> getAllUsers(String search, Role role, Boolean active, Pageable pageable) {
        return userRepository.searchUsers(normalizeSearch(search), role, active, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public UserResponse getUserById(Long id) {
        return toResponse(getUserOrThrow(id));
    }

    @Transactional
    public UserResponse updateUser(Long id, UpdateAdminUserRequest request) {
        User user = getUserOrThrow(id);
        Role previousRole = user.getRole();
        boolean previousActive = Boolean.TRUE.equals(user.getActive());
        String normalizedEmail = normalizeEmail(request.email());

        userRepository.findByEmail(normalizedEmail)
                .filter(existing -> !existing.getId().equals(user.getId()))
                .ifPresent(existing -> {
                    throw new ResponseStatusException(BAD_REQUEST, "Email is already registered");
                });

        boolean emailChanged = !normalizedEmail.equalsIgnoreCase(user.getEmail());
        user.setFullName(request.fullName().trim());
        user.setEmail(normalizedEmail);
        user.setRole(request.role());
        user.setActive(Boolean.TRUE.equals(request.active()));

        if (emailChanged) {
            user.setEmailVerified(false);
        }

        User savedUser = userRepository.save(user);

        if (emailChanged) {
            notificationEventPublisher.publishToUser(
                    savedUser.getId(),
                    "USER_EMAIL_CHANGED",
                    "Account email updated",
                    "Your account email was changed by an administrator and needs verification.",
                    NotificationSeverity.WARNING,
                    "/dashboard/user/profile",
                    "users",
                    String.valueOf(savedUser.getId()),
                    null);
        }

        if (previousRole != savedUser.getRole()) {
            notificationEventPublisher.publishToUser(
                    savedUser.getId(),
                    "USER_ROLE_CHANGED",
                    "Your role was updated",
                    "Your access role is now " + savedUser.getRole().name() + ".",
                    NotificationSeverity.INFO,
                    "/",
                    "users",
                    String.valueOf(savedUser.getId()),
                    null);
        }

        boolean currentActive = Boolean.TRUE.equals(savedUser.getActive());
        if (previousActive != currentActive) {
            notificationEventPublisher.publishToUser(
                    savedUser.getId(),
                    "USER_STATUS_CHANGED",
                    currentActive ? "Account activated" : "Account deactivated",
                    currentActive
                            ? "Your account has been activated by an administrator."
                            : "Your account has been deactivated by an administrator.",
                    currentActive ? NotificationSeverity.SUCCESS : NotificationSeverity.WARNING,
                    "/dashboard/user/profile",
                    "users",
                    String.valueOf(savedUser.getId()),
                    null);
        }

        return toResponse(savedUser);
    }

    @Transactional
    public UserResponse updateUserRole(Long id, UpdateRoleRequest request) {
        User user = getUserOrThrow(id);
        if (user.getRole() == request.role()) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid role change");
        }

        user.setRole(request.role());
        User savedUser = userRepository.save(user);

        notificationEventPublisher.publishToUser(
                savedUser.getId(),
                "USER_ROLE_CHANGED",
                "Your role was updated",
                "Your access role is now " + savedUser.getRole().name() + ".",
                NotificationSeverity.INFO,
                "/",
                "users",
                String.valueOf(savedUser.getId()),
                null);

        return toResponse(savedUser);
    }

    @Transactional
    public UserResponse updateUserStatus(Long id, UpdateUserStatusRequest request) {
        User user = getUserOrThrow(id);
        user.setActive(Boolean.TRUE.equals(request.active()));
        User savedUser = userRepository.save(user);

        boolean active = Boolean.TRUE.equals(savedUser.getActive());
        notificationEventPublisher.publishToUser(
                savedUser.getId(),
                "USER_STATUS_CHANGED",
                active ? "Account activated" : "Account deactivated",
                active
                        ? "Your account has been activated by an administrator."
                        : "Your account has been deactivated by an administrator.",
                active ? NotificationSeverity.SUCCESS : NotificationSeverity.WARNING,
                "/dashboard/user/profile",
                "users",
                String.valueOf(savedUser.getId()),
                null);

        return toResponse(savedUser);
    }

    @Transactional
    public void deleteUser(Long id, User authenticatedUser) {
        if (authenticatedUser != null && authenticatedUser.getId() != null && authenticatedUser.getId().equals(id)) {
            throw new ResponseStatusException(BAD_REQUEST, "You cannot delete your own account");
        }

        User user = getUserOrThrow(id);
        userRepository.delete(user);
    }

    private EmailChangeOtp sendEmailChangeOtp(User user, String targetEmail) {
        Instant now = Instant.now();
        emailChangeOtpRepository.deleteByExpiresAtBefore(now);

        EmailChangeOtp currentOtp = emailChangeOtpRepository
                .findTopByUserIdAndTargetEmailIgnoreCaseAndConsumedFalseOrderByCreatedAtDesc(user.getId(), targetEmail)
                .orElse(null);

        if (currentOtp != null && currentOtp.getCreatedAt().plus(60, ChronoUnit.SECONDS).isAfter(now)) {
            throw new ResponseStatusException(TOO_MANY_REQUESTS, "Please wait before requesting another OTP");
        }

        if (currentOtp != null) {
            currentOtp.setConsumed(true);
            currentOtp.setConsumedAt(now);
            emailChangeOtpRepository.save(currentOtp);
        }

        String otp = generateOtp();
        EmailChangeOtp newOtp = emailChangeOtpRepository.save(EmailChangeOtp.builder()
                .user(user)
                .targetEmail(targetEmail)
                .otpHash(hashToken(otp))
                .expiresAt(now.plus(10, ChronoUnit.MINUTES))
                .attempts(0)
                .maxAttempts(5)
                .consumed(false)
                .createdAt(now)
                .build());

        emailVerificationNotificationService.sendEmailChangeOtp(
                user.getEmail(),
                user.getFullName(),
                otp,
                newOtp.getExpiresAt());
        return newOtp;
    }

    private User loadAuthenticatedUser(User authenticatedUser) {
        if (authenticatedUser == null || authenticatedUser.getId() == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Unauthenticated user");
        }

        return userRepository.findById(authenticatedUser.getId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));
    }

    private User getUserOrThrow(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole().name(),
                user.isEmailVerified(),
                Boolean.TRUE.equals(user.getActive()),
                user.getCreatedAt());
    }

    private String normalizeEmail(String email) {
        return email == null || email.isBlank() ? null : email.toLowerCase().trim();
    }

    private String normalizeSearch(String search) {
        return search == null || search.isBlank() ? null : search.trim();
    }

    private String normalizeSpecialties(String specialties) {
        if (specialties == null || specialties.isBlank()) {
            return null;
        }

        return specialties.trim();
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

    private String generateOtp() {
        return String.valueOf(ThreadLocalRandom.current().nextInt(100000, 1000000));
    }
}
