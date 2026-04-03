package com.smartcampus.backend.features.user.controller;

import com.smartcampus.backend.features.auth.dto.AuthResponse;
import com.smartcampus.backend.features.user.dto.UpdateUserRequest;
import com.smartcampus.backend.features.user.dto.ProfileUpdateResponse;
import com.smartcampus.backend.features.user.dto.UserResponse;
import com.smartcampus.backend.features.user.dto.VerifyEmailChangeRequest;
import com.smartcampus.backend.features.user.hateoas.UserModelAssembler;
import com.smartcampus.backend.features.user.model.User;
import com.smartcampus.backend.features.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.hateoas.EntityModel;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final UserModelAssembler userModelAssembler;

    @GetMapping("/me")
    public ResponseEntity<EntityModel<UserResponse>> getMyProfile(@AuthenticationPrincipal User user) {
        UserResponse response = userService.getMyProfile(user);
        return ResponseEntity.ok(userModelAssembler.toCurrentUserModel(response));
    }

    @PutMapping("/me")
    public ResponseEntity<ProfileUpdateResponse> updateMyProfile(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(userService.updateMyProfile(user, request));
    }

    @PostMapping("/me/email-change/verify")
    public ResponseEntity<AuthResponse> verifyEmailChange(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody VerifyEmailChangeRequest request) {
        return ResponseEntity.ok(userService.verifyEmailChange(user, request));
    }
}

