package com.veetoma.coreapi.service;

import com.veetoma.coreapi.dto.CreateJobRequest;
import com.veetoma.coreapi.dto.UpdateJobStatusRequest;
import com.veetoma.coreapi.model.AudioJob;
import com.veetoma.coreapi.model.AudioJobStatus;
import com.veetoma.coreapi.repository.AudioJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
public class AudioJobService {

    private final AudioJobRepository audioJobRepository;
    private final FileStorageService fileStorageService;
    private final AudioJobExecutionService audioJobExecutionService;
    private final ModalClientService modalClientService;

    public Map<String, Object> warmupWorker() {
        return modalClientService.pingWorkerSync();
    }

    @Transactional
    public AudioJob createJob(CreateJobRequest request) {
        if (request.getOriginalFilename() == null || request.getOriginalFilename().trim().isEmpty()) {
            throw new IllegalArgumentException("Original filename cannot be empty");
        }

        String fileUrl = request.getInputFileUrl();
        if (fileUrl == null || fileUrl.trim().isEmpty()) {
            fileUrl = "https://storage.veetoma.io/uploads/" + UUID.randomUUID() + "/" + request.getOriginalFilename();
        }

        String model = request.getModelName() != null && !request.getModelName().trim().isEmpty()
                ? request.getModelName().trim()
                : "htdemucs";
        int stems = resolveStemCount(model, request.getStemCount());

        AudioJob job = AudioJob.builder()
                .originalFilename(request.getOriginalFilename().trim())
                .inputFileUrl(fileUrl)
                .userId(request.getUserId())
                .modelName(model)
                .stemCount(stems)
                .status(AudioJobStatus.QUEUED)
                .build();

        AudioJob saved = audioJobRepository.save(job);
        log.info("Created new audio job with id: {} for file: {} [model={}, stems={}]",
                saved.getId(), saved.getOriginalFilename(), model, stems);
        return saved;
    }

    @Transactional
    public AudioJob uploadAndProcessJob(MultipartFile file, UUID userId, String modelName, boolean runWorker)
            throws IOException {
        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "audio.wav";
        UUID tempId = UUID.randomUUID();

        // 1. Save uploaded file to disk
        Path savedPath = fileStorageService.saveUploadedAudio(file, tempId);
        String fileUrl = "http://localhost:8080/api/files/uploads/" + savedPath.getFileName().toString();

        String model = modelName != null && !modelName.trim().isEmpty() ? modelName.trim() : "htdemucs";
        int stems = resolveStemCount(model, null);

        // 2. Create AudioJob entity with QUEUED state
        AudioJob job = AudioJob.builder()
                .originalFilename(originalFilename)
                .inputFileUrl(fileUrl)
                .userId(userId)
                .modelName(model)
                .stemCount(stems)
                .status(AudioJobStatus.QUEUED)
                .build();

        AudioJob saved = audioJobRepository.save(job);
        log.info("Created audio job {} from upload file {} [model={}, stems={}]",
                saved.getId(), originalFilename, model, stems);

        // 3. Trigger worker process asynchronously
        if (runWorker) {
            audioJobExecutionService.triggerJobSeparation(saved, savedPath);
        }

        return saved;
    }

    @Transactional
    public AudioJob uploadAndProcessJob(MultipartFile file, UUID userId, boolean runWorker) throws IOException {
        return uploadAndProcessJob(file, userId, "htdemucs", runWorker);
    }

    private int resolveStemCount(String modelName, Integer requestedCount) {
        if (requestedCount != null && requestedCount > 0) {
            return requestedCount;
        }
        if ("htdemucs_6s".equalsIgnoreCase(modelName)) {
            return 6;
        }
        if ("htdemucs_2s".equalsIgnoreCase(modelName) || "two_stems".equalsIgnoreCase(modelName)) {
            return 2;
        }
        return 4;
    }

    @Transactional(readOnly = true)
    public List<AudioJob> getAllJobs() {
        return audioJobRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public AudioJob getJobById(UUID id) {
        return audioJobRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Audio job not found with id: " + id));
    }

    @Transactional
    public AudioJob updateJobStatus(UUID id, UpdateJobStatusRequest request) {
        AudioJob job = getJobById(id);

        if (request.getStatus() != null) {
            job.setStatus(request.getStatus());
        }
        if (request.getVocalsUrl() != null) {
            job.setVocalsUrl(request.getVocalsUrl());
        }
        if (request.getDrumsUrl() != null) {
            job.setDrumsUrl(request.getDrumsUrl());
        }
        if (request.getBassUrl() != null) {
            job.setBassUrl(request.getBassUrl());
        }
        if (request.getOtherUrl() != null) {
            job.setOtherUrl(request.getOtherUrl());
        }
        if (request.getGuitarUrl() != null) {
            job.setGuitarUrl(request.getGuitarUrl());
        }
        if (request.getPianoUrl() != null) {
            job.setPianoUrl(request.getPianoUrl());
        }
        if (request.getInstrumentalUrl() != null) {
            job.setInstrumentalUrl(request.getInstrumentalUrl());
        }
        if (request.getErrorMessage() != null) {
            job.setErrorMessage(request.getErrorMessage());
        }

        AudioJob updated = audioJobRepository.save(job);
        log.info("Updated audio job id: {} status to: {}", id, updated.getStatus());
        return updated;
    }

    /**
     * Helper to simulate AI worker processing for development and demo testing.
     * Transitions status from QUEUED -> RUNNING -> SUCCEEDED with demo audio stems.
     */
    public void simulateJobProgress(UUID id) {
        CompletableFuture.runAsync(() -> {
            try {
                Thread.sleep(1200);
                updateJobStatus(id, UpdateJobStatusRequest.builder()
                        .status(AudioJobStatus.RUNNING)
                        .build());

                Thread.sleep(2500);
                updateJobStatus(id, UpdateJobStatusRequest.builder()
                        .status(AudioJobStatus.SUCCEEDED)
                        .vocalsUrl("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3")
                        .drumsUrl("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3")
                        .bassUrl("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3")
                        .otherUrl("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3")
                        .build());
            } catch (Exception e) {
                log.error("Simulation failed for job id: {}", id, e);
                updateJobStatus(id, UpdateJobStatusRequest.builder()
                        .status(AudioJobStatus.FAILED)
                        .errorMessage("Simulation error: " + e.getMessage())
                        .build());
            }
        });
    }
}
