package com.veetoma.coreapi.controller;

import com.veetoma.coreapi.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Path;
import java.util.UUID;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
@Slf4j
public class FileController {

    private final FileStorageService fileStorageService;

    @GetMapping("/stems/{jobId}/{stemName}")
    public ResponseEntity<Resource> getStemAudio(
            @PathVariable UUID jobId,
            @PathVariable String stemName) {

        Path stemPath = fileStorageService.getStemFilePath(jobId, stemName);
        Resource resource = fileStorageService.loadAsResource(stemPath);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("audio/wav"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + stemName + "\"")
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .body(resource);
    }

    @GetMapping("/uploads/{filename}")
    public ResponseEntity<Resource> getUploadedAudio(@PathVariable String filename) {
        Path uploadPath = fileStorageService.getUploadedFilePath(filename);
        Resource resource = fileStorageService.loadAsResource(uploadPath);

        MediaType mediaType = filename.endsWith(".wav")
                ? MediaType.parseMediaType("audio/wav")
                : MediaType.parseMediaType("audio/mpeg");

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .body(resource);
    }

    @GetMapping("/music/{filename}")
    public ResponseEntity<Resource> getMusicAudio(@PathVariable String filename) {
        Path musicPath = fileStorageService.getMusicFilePath(filename);
        Resource resource = fileStorageService.loadAsResource(musicPath);

        MediaType mediaType = filename.toLowerCase().endsWith(".wav")
                ? MediaType.parseMediaType("audio/wav")
                : MediaType.parseMediaType("audio/mpeg");

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .body(resource);
    }

    @GetMapping("/music/covers/{filename}")
    public ResponseEntity<Resource> getMusicCover(@PathVariable String filename) {
        Path coverPath = fileStorageService.getMusicCoverFilePath(filename);
        Resource resource = fileStorageService.loadAsResource(coverPath);

        MediaType mediaType = filename.toLowerCase().endsWith(".png")
                ? MediaType.IMAGE_PNG
                : MediaType.IMAGE_JPEG;

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                .body(resource);
    }
}
