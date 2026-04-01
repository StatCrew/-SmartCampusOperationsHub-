package com.smartcampus.backend.features.user.service;

import com.smartcampus.backend.features.user.dto.CreateTechnicianRequest;
import com.smartcampus.backend.features.user.dto.UpdateRoleRequest;
import com.smartcampus.backend.features.user.dto.UpdateUserRequest;
import com.smartcampus.backend.features.user.dto.UpdateUserStatusRequest;
import com.smartcampus.backend.features.user.dto.UserResponse;
import com.smartcampus.backend.features.user.model.AuthProvider;
import com.smartcampus.backend.features.user.model.Role;
import com.smartcampus.backend.features.user.model.User;
import com.smartcampus.backend.features.user.repository.UserRepository;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public UserResponse getMyProfile(User authenticatedUser) {
        User user = loadAuthenticatedUser(authenticatedUser);
        return toResponse(user);
    }

    @Transactional
    public UserResponse updateMyProfile(User authenticatedUser, UpdateUserRequest request) {
        User user = loadAuthenticatedUser(authenticatedUser);
        user.setFullName(request.fullName().trim());
        return toResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse createTechnician(CreateTechnicianRequest request) {
        return createUser(request.fullName(), request.email(), request.password(), Role.TECHNICIAN, true);
    }

    @Transactional
    public UserResponse createUser(String fullName, String email, String password, Role role, Boolean active) {
        String normalizedEmail = email.toLowerCase().trim();
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new ResponseStatusException(BAD_REQUEST, "Email is already registered");
        }

        User technician = User.builder()
                .fullName(fullName.trim())
                .email(normalizedEmail)
                .password(passwordEncoder.encode(password))
                .role(role)
                .provider(AuthProvider.LOCAL)
                .emailVerified(Boolean.TRUE.equals(active))
                .createdAt(Instant.now())
                .build();

        return toResponse(userRepository.save(technician));
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public UserResponse getUserById(Long id) {
        return toResponse(getUserOrThrow(id));
    }

    @Transactional
    public UserResponse updateUserRole(Long id, UpdateRoleRequest request) {
        User user = getUserOrThrow(id);
        if (user.getRole() == request.role()) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid role change");
        }

        user.setRole(request.role());
        return toResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse updateUserStatus(Long id, UpdateUserStatusRequest request) {
        User user = getUserOrThrow(id);
        user.setEmailVerified(Boolean.TRUE.equals(request.active()));
        return toResponse(userRepository.save(user));
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
                user.getCreatedAt());
    }
}

