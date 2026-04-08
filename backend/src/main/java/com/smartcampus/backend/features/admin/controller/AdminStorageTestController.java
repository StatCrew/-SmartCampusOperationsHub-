package com.smartcampus.backend.features.admin.controller;

import com.smartcampus.backend.features.admin.dto.AdminImageUploadResponse;
import com.smartcampus.backend.features.admin.dto.AdminPresignedUrlResponse;
import com.smartcampus.backend.features.admin.service.AdminStorageTestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/admin/storage-test")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminStorageTestController {

    private final AdminStorageTestService adminStorageTestService;

    @PostMapping(path = "/upload-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AdminImageUploadResponse> uploadImage(@RequestParam("file") MultipartFile file) {
        AdminImageUploadResponse response = adminStorageTestService.uploadTestImage(file);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/file-url")
    public ResponseEntity<AdminPresignedUrlResponse> getFileUrl(@RequestParam("key") String key) {
        AdminPresignedUrlResponse response = adminStorageTestService.generatePresignedUrl(key);
        return ResponseEntity.ok(response);
    }
}


