package com.smartcampus.backend.features.admin.service;

import com.smartcampus.backend.config.S3Properties;
import com.smartcampus.backend.features.admin.dto.AdminImageUploadResponse;
import com.smartcampus.backend.features.admin.dto.AdminPresignedUrlResponse;
import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

@Service
@RequiredArgsConstructor
public class AdminStorageTestService {

    private static final long MAX_IMAGE_BYTES = 5L * 1024 * 1024;

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final S3Properties s3Properties;

    public AdminImageUploadResponse uploadTestImage(MultipartFile file) {
        validateS3Configuration();
        validateFile(file);

        String key = buildObjectKey(file.getOriginalFilename());
        String contentType = normalizeContentType(file.getContentType());

        try {
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(s3Properties.bucket())
                    .key(key)
                    .contentType(contentType)
                    .build();

            s3Client.putObject(request, RequestBody.fromBytes(file.getBytes()));
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to read upload file", exception);
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to upload image to S3", exception);
        }

        AdminPresignedUrlResponse presigned = generatePresignedUrl(key);

        return new AdminImageUploadResponse(
                key,
                presigned.url(),
                presigned.expiresAt(),
                s3Properties.bucket(),
                contentType,
                file.getSize());
    }

    public AdminPresignedUrlResponse generatePresignedUrl(String key) {
        validateS3Configuration();
        if (isBlank(key)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File key is required");
        }

        int durationMinutes = Math.max(1, s3Properties.presignMinutes());
        Instant expiresAt = Instant.now().plus(Duration.ofMinutes(durationMinutes));

        try {
            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                    .bucket(s3Properties.bucket())
                    .key(key)
                    .build();

            GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofMinutes(durationMinutes))
                    .getObjectRequest(getObjectRequest)
                    .build();

            String presignedUrl = s3Presigner.presignGetObject(presignRequest).url().toString();
            return new AdminPresignedUrlResponse(key, presignedUrl, expiresAt);
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to generate pre-signed URL", exception);
        }
    }

    private void validateS3Configuration() {
        if (isBlank(s3Properties.accessKey()) || isBlank(s3Properties.secretKey())
                || isBlank(s3Properties.region()) || isBlank(s3Properties.bucket())) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "S3 is not configured. Set app.storage.s3.* properties.");
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please select an image file");
        }

        String contentType = normalizeContentType(file.getContentType());
        if (!contentType.startsWith("image/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only image uploads are allowed");
        }

        if (file.getSize() > MAX_IMAGE_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image size must be 5MB or less");
        }
    }

    private String buildObjectKey(String originalFilename) {
        String safeName = originalFilename == null
                ? "upload"
                : originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
        return "admin-test/" + UUID.randomUUID() + "-" + safeName;
    }

    private String normalizeContentType(String contentType) {
        return contentType == null ? "application/octet-stream" : contentType.toLowerCase(Locale.ROOT).trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}


