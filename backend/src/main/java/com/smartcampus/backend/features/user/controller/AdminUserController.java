package com.smartcampus.backend.features.user.controller;

import com.smartcampus.backend.features.user.dto.CreateTechnicianRequest;
import com.smartcampus.backend.features.user.dto.CreateUserRequest;
import com.smartcampus.backend.features.user.dto.UpdateAdminUserRequest;
import com.smartcampus.backend.features.user.dto.UpdateRoleRequest;
import com.smartcampus.backend.features.user.dto.UpdateUserStatusRequest;
import com.smartcampus.backend.features.user.dto.UserResponse;
import com.smartcampus.backend.features.user.hateoas.UserModelAssembler;
import com.smartcampus.backend.features.user.model.Role;
import com.smartcampus.backend.features.user.model.User;
import com.smartcampus.backend.features.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.hateoas.EntityModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final UserService userService;
    private final UserModelAssembler userModelAssembler;

    @PostMapping
    public ResponseEntity<EntityModel<UserResponse>> createUser(@Valid @RequestBody CreateUserRequest request) {
        UserResponse response = userService.createUser(
                request.fullName(),
                request.email(),
                request.password(),
                request.role(),
                request.active());
        return ResponseEntity.status(HttpStatus.CREATED).body(userModelAssembler.toAdminModel(response));
    }

    @PostMapping("/technician")
    public ResponseEntity<EntityModel<UserResponse>> createTechnician(
            @Valid @RequestBody CreateTechnicianRequest request) {
        UserResponse response = userService.createTechnician(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(userModelAssembler.toAdminModel(response));
    }

    @GetMapping
    public ResponseEntity<Page<UserResponse>> getAllUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Role role,
            @RequestParam(required = false) Boolean active,
            @PageableDefault(size = 10, sort = "createdAt") Pageable pageable) {
        return ResponseEntity.ok(userService.getAllUsers(search, role, active, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EntityModel<UserResponse>> getUserById(@PathVariable Long id) {
        UserResponse response = userService.getUserById(id);
        return ResponseEntity.ok(userModelAssembler.toAdminModel(response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EntityModel<UserResponse>> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UpdateAdminUserRequest request) {
        UserResponse response = userService.updateUser(id, request);
        return ResponseEntity.ok(userModelAssembler.toAdminModel(response));
    }

    @PatchMapping("/{id}/role")
    public ResponseEntity<EntityModel<UserResponse>> updateUserRole(
            @PathVariable Long id,
            @Valid @RequestBody UpdateRoleRequest request) {
        UserResponse response = userService.updateUserRole(id, request);
        return ResponseEntity.ok(userModelAssembler.toAdminModel(response));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<EntityModel<UserResponse>> updateUserStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserStatusRequest request) {
        UserResponse response = userService.updateUserStatus(id, request);
        return ResponseEntity.ok(userModelAssembler.toAdminModel(response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id, @AuthenticationPrincipal User user) {
        userService.deleteUser(id, user);
        return ResponseEntity.noContent().build();
    }
}

