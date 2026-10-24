package com.veetoma.coreapi.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.*;
import java.util.UUID;

@Service
@Slf4j
public class FileStorageService {

    private final Path baseStorageDir;
    private final Path uploadsDir;
    private final Path stemsDir;
    private final Path musicDir;
    private final Path musicCoversDir;

    public FileStorageService(
            @Value("${veetoma.storage.base-dir:d:/veetoma/storage}") String baseDir,
            @Value("${veetoma.storage.music-dir:d:/veetoma/music}") String musicDir) {
        this.baseStorageDir = Paths.get(baseDir).toAbsolutePath().normalize();
        this.uploadsDir = this.baseStorageDir.resolve("uploads");
        this.stemsDir = this.baseStorageDir.resolve("stems");
        this.musicDir = Paths.get(musicDir).toAbsolutePath().normalize();
        this.musicCoversDir = this.musicDir.resolve("covers");

        try {
            Files.createDirectories(this.uploadsDir);
            Files.createDirectories(this.stemsDir);
            Files.createDirectories(this.musicDir);
            Files.createDirectories(this.musicCoversDir);
            log.info("Initialized storage directories at: base={}, music={}", this.baseStorageDir, this.musicDir);
        } catch (IOException e) {
            log.error("Could not create storage directories: {}", e.getMessage(), e);
        }
    }

    public Path saveUploadedAudio(MultipartFile file, UUID jobId) throws IOException {
        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "audio.mp3";
        // Clean filename
        String safeName = originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
        String targetFilename = jobId + "_" + safeName;
        Path targetPath = this.uploadsDir.resolve(targetFilename);

        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
        log.info("Stored uploaded audio file at: {}", targetPath);
        return targetPath;
    }

    public Path getStemDirectory(UUID jobId) {
        Path jobStemDir = this.stemsDir.resolve(jobId.toString());
        try {
            Files.createDirectories(jobStemDir);
        } catch (IOException e) {
            log.error("Failed to create stem dir for job {}: {}", jobId, e.getMessage());
        }
        return jobStemDir;
    }

    public Path getStemFilePath(UUID jobId, String stemFilename) {
        return this.stemsDir.resolve(jobId.toString()).resolve(stemFilename);
    }

    public Path getUploadedFilePath(String filename) {
        return this.uploadsDir.resolve(filename);
    }

    public Path getMusicFilePath(String filename) {
        return this.musicDir.resolve(filename);
    }

    public Path getMusicCoverFilePath(String filename) {
        return this.musicCoversDir.resolve(filename);
    }

    public Resource loadAsResource(Path filePath) {
        try {
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new RuntimeException("File not found or unreadable: " + filePath);
            }
        } catch (MalformedURLException e) {
            throw new RuntimeException("Invalid file path: " + filePath, e);
        }
    }
}
