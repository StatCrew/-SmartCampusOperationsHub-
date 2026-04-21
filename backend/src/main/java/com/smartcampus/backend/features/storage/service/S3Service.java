package com.smartcampus.backend.features.storage.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.smartcampus.backend.config.S3Properties;

import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.core.sync.RequestBody;

import java.io.IOException;
import java.time.Duration;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class S3Service {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final S3Properties s3Properties;

    public String uploadFile(MultipartFile file) {

        String fileName = UUID.randomUUID() + "_" + file.getOriginalFilename();

        try {
            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(s3Properties.bucket())
                            .key(fileName)
                            .contentType(file.getContentType())
                            .build(),
                    RequestBody.fromBytes(file.getBytes())
            );
        } catch (IOException e) {
            throw new RuntimeException("File upload failed");
        }

        return "https://" + s3Properties.bucket() + ".s3.amazonaws.com/" + fileName;
    }

    public String generatePresignedUrl(String key) {
        if (key == null || key.isBlank()) {
            throw new RuntimeException("File key is required");
        }

        int durationMinutes = Math.max(1, s3Properties.presignMinutes());

        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(s3Properties.bucket())
                .key(key)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(durationMinutes))
                .getObjectRequest(getObjectRequest)
                .build();

        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }

    public int getPresignMinutes() {
        return Math.max(1, s3Properties.presignMinutes());
    }
}