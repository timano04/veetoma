package com.veetoma.coreapi.controller;

import com.veetoma.coreapi.dto.AudioJobResponse;
import com.veetoma.coreapi.dto.CreateJobRequest;
import com.veetoma.coreapi.dto.UpdateJobStatusRequest;
import com.veetoma.coreapi.model.AudioJob;
import com.veetoma.coreapi.service.AudioJobService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/jobs")
@RequiredArgsConstructor
@Slf4j
public class AudioJobController {

    private final AudioJobService audioJobService;

    @PostMapping
    public ResponseEntity<AudioJobResponse> createJob(@RequestBody CreateJobRequest request) {
        AudioJob job = audioJobService.createJob(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(AudioJobResponse.fromEntity(job));
    }

    @PostMapping("/upload")
    public ResponseEntity<AudioJobResponse> uploadAndCreateJob(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "userId", required = false) UUID userId,
            @RequestParam(value = "modelName", defaultValue = "htdemucs") String modelName,
            @RequestParam(value = "autoRun", defaultValue = "true") boolean autoRun) throws Exception {

        AudioJob job = audioJobService.uploadAndProcessJob(file, userId, modelName, autoRun);
        return ResponseEntity.status(HttpStatus.CREATED).body(AudioJobResponse.fromEntity(job));
    }

    @GetMapping
    public ResponseEntity<List<AudioJobResponse>> getAllJobs() {
        List<AudioJobResponse> responses = audioJobService.getAllJobs().stream()
                .map(AudioJobResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AudioJobResponse> getJobById(@PathVariable UUID id) {
        AudioJob job = audioJobService.getJobById(id);
        return ResponseEntity.ok(AudioJobResponse.fromEntity(job));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<AudioJobResponse> updateJobStatus(
            @PathVariable UUID id,
            @RequestBody UpdateJobStatusRequest request) {
        AudioJob job = audioJobService.updateJobStatus(id, request);
        return ResponseEntity.ok(AudioJobResponse.fromEntity(job));
    }

    @PostMapping("/{id}/simulate")
    public ResponseEntity<Map<String, String>> simulateJob(@PathVariable UUID id) {
        audioJobService.simulateJobProgress(id);
        return ResponseEntity.ok(Map.of(
                "message", "AI processing simulation triggered for job " + id,
                "jobId", id.toString()
        ));
    }

    @GetMapping("/warmup")
    public ResponseEntity<Map<String, Object>> warmupWorker() {
        log.info("Received request to warm up Modal AI worker container");
        return ResponseEntity.ok(audioJobService.warmupWorker());
    }

    @PostMapping("/warmup")
    public ResponseEntity<Map<String, Object>> warmupWorkerPost() {
        log.info("Received POST request to warm up Modal AI worker container");
        return ResponseEntity.ok(audioJobService.warmupWorker());
    }
}
