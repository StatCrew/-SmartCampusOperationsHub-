package com.smartcampus.backend.features.user.hateoas;

import com.smartcampus.backend.features.user.controller.AdminUserController;
import com.smartcampus.backend.features.user.controller.UserController;
import com.smartcampus.backend.features.user.dto.UpdateRoleRequest;
import com.smartcampus.backend.features.user.dto.UpdateUserRequest;
import com.smartcampus.backend.features.user.dto.UpdateUserStatusRequest;
import com.smartcampus.backend.features.user.dto.UserResponse;
import java.util.List;
import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.stereotype.Component;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

@Component
public class UserModelAssembler {

    public EntityModel<UserResponse> toCurrentUserModel(UserResponse response) {
        return EntityModel.of(
                response,
                linkTo(methodOn(UserController.class).getMyProfile(null)).withSelfRel(),
                linkTo(methodOn(UserController.class).updateMyProfile(null, new UpdateUserRequest(response.fullName())))
                        .withRel("update-profile"));
    }

    public EntityModel<UserResponse> toAdminModel(UserResponse response) {
        return EntityModel.of(
                response,
                linkTo(methodOn(AdminUserController.class).getUserById(response.id())).withSelfRel(),
                linkTo(methodOn(AdminUserController.class)
                        .updateUserRole(response.id(), new UpdateRoleRequest(null)))
                        .withRel("change-role"),
                linkTo(methodOn(AdminUserController.class)
                        .updateUserStatus(response.id(), new UpdateUserStatusRequest(true)))
                        .withRel("change-status"));
    }

    public CollectionModel<EntityModel<UserResponse>> toAdminCollection(List<UserResponse> users) {
        List<EntityModel<UserResponse>> models = users.stream().map(this::toAdminModel).toList();
        return CollectionModel.of(models,
                linkTo(methodOn(AdminUserController.class).getAllUsers()).withSelfRel());
    }
}

