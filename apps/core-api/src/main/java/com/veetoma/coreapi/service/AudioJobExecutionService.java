package com.veetoma.coreapi.service;

import com.veetoma.coreapi.dto.ModalSeparationResponse;
import com.veetoma.coreapi.model.AudioJob;
import com.veetoma.coreapi.model.AudioJobStatus;
import com.veetoma.coreapi.repository.AudioJobRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
public class AudioJobExecutionService {

    @Value("${veetoma.worker.python-bin:py -3.11}")
    private String pythonBin;

    @Value("${veetoma.worker.script-dir:d:/veetoma/apps/ai-worker}")
    private String scriptDir;

    @Value("${veetoma.worker.use-demucs:false}")
    private boolean useDemucs;

    @Value("${veetoma.worker.api-url:http://localhost:8080/api/jobs}")
    private String apiUrl;

    @Value("${veetoma.worker.fallback-to-local:true}")
    private boolean fallbackToLocal;

    private final FileStorageService fileStorageService;
    private final ModalClientService modalClientService;
    private final AudioJobRepository audioJobRepository;

    public AudioJobExecutionService(
            FileStorageService fileStorageService,
            ModalClientService modalClientService,
            AudioJobRepository audioJobRepository) {
        this.fileStorageService = fileStorageService;
        this.modalClientService = modalClientService;
        this.audioJobRepository = audioJobRepository;
    }

    @Async
    public void triggerJobSeparation(AudioJob job, Path inputAudioPath) {
        UUID jobId = job.getId();
        Path stemOutputDir = fileStorageService.getStemDirectory(jobId);

        // Update status to RUNNING in database
        try {
            AudioJob runningJob = audioJobRepository.findById(jobId).orElse(job);
            runningJob.setStatus(AudioJobStatus.RUNNING);
            audioJobRepository.save(runningJob);
            log.info("[JOB-START] Job {} marked RUNNING. Audio input: {}", jobId, inputAudioPath.toAbsolutePath());
        } catch (Exception dbErr) {
            log.warn("[JOB-START] Could not update job {} to RUNNING state in DB: {}", jobId, dbErr.getMessage());
        }

        // ---------------------------------------------------------------------
        // Strategy 1: Modal Cloud AI Worker (Demucs htdemucs_6s on GPU)
        // ---------------------------------------------------------------------
        if (modalClientService.isEnabled()) {
            log.info("[JOB-DISPATCH] Routing job {} to Modal GPU AI worker: {}",
                    jobId, modalClientService.getEndpointUrl());

            try {
                ModalSeparationResponse response = modalClientService.processSeparation(
                        jobId, inputAudioPath, job.getOriginalFilename());

                String baseUrl = modalClientService.getBaseServerUrl();
                AudioJob completedJob = audioJobRepository.findById(jobId).orElse(job);
                completedJob.setStatus(AudioJobStatus.SUCCEEDED);
                completedJob.setModelName(response.getModel() != null ? response.getModel() : "htdemucs_6s");
                completedJob.setStemCount(response.getStemCount() != null ? response.getStemCount() : 6);

                if (response.getStemsBase64() != null) {
                    Map<String, String> stems = response.getStemsBase64();
                    if (stems.containsKey("vocals")) {
                        completedJob.setVocalsUrl(baseUrl + "/api/files/stems/" + jobId + "/vocals.wav");
                    }
                    if (stems.containsKey("drums")) {
                        completedJob.setDrumsUrl(baseUrl + "/api/files/stems/" + jobId + "/drums.wav");
                    }
                    if (stems.containsKey("bass")) {
                        completedJob.setBassUrl(baseUrl + "/api/files/stems/" + jobId + "/bass.wav");
                    }
                    if (stems.containsKey("other")) {
                        completedJob.setOtherUrl(baseUrl + "/api/files/stems/" + jobId + "/other.wav");
                    }
                    if (stems.containsKey("guitar")) {
                        completedJob.setGuitarUrl(baseUrl + "/api/files/stems/" + jobId + "/guitar.wav");
                    }
                    if (stems.containsKey("piano")) {
                        completedJob.setPianoUrl(baseUrl + "/api/files/stems/" + jobId + "/piano.wav");
                    }
                }

                audioJobRepository.save(completedJob);
                log.info("[JOB-SUCCESS] Job {} successfully finished via Modal GPU in {:.2f}s!",
                        jobId, response.getInferenceDurationSeconds());
                return;

            } catch (Exception e) {
                log.error("[MODAL-FAILURE] Modal AI separation failed for job {}: {}. Full stack trace:",
                        jobId, e.getMessage(), e);

                if (!fallbackToLocal) {
                    log.error("[MODAL-FAILURE] Local fallback is disabled. Marking job {} as FAILED.", jobId);
                    markJobFailed(jobId, job, "Modal AI worker error: " + e.getMessage());
                    return;
                }

                log.warn("[MODAL-FALLBACK] Initiating fallback to local Python worker for job {}...", jobId);
            }
        } else {
            log.info(
                    "[JOB-DISPATCH] Modal AI worker is disabled in configuration. Using local Python worker for job {}",
                    jobId);
        }

        // ---------------------------------------------------------------------
        // Strategy 2: Local Python Worker Process (src.worker)
        // ---------------------------------------------------------------------
        try {
            List<String> command = new ArrayList<>();
            for (String part : pythonBin.split(" ")) {
                if (!part.trim().isEmpty()) {
                    command.add(part.trim());
                }
            }
            command.add("-m");
            command.add("src.worker");
            command.add("--job-id");
            command.add(jobId.toString());
            command.add("--input-file");
            command.add(inputAudioPath.toAbsolutePath().toString());
            command.add("--output-dir");
            command.add(stemOutputDir.toAbsolutePath().toString());
            command.add("--api-url");
            command.add(apiUrl);

            String model = job.getModelName() != null && !job.getModelName().trim().isEmpty()
                    ? job.getModelName()
                    : "htdemucs";
            command.add("--model");
            command.add(model);

            if (useDemucs) {
                command.add("--use-demucs");
            }

            ProcessBuilder pb = new ProcessBuilder(command);
            pb.directory(new File(scriptDir));
            pb.redirectErrorStream(true);

            log.info("[LOCAL-WORKER] Spawning local AI worker process: {}", String.join(" ", command));
            Process process = pb.start();

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    log.info("[LOCAL-AI-WORKER-{}] {}", jobId.toString().substring(0, 8), line);
                }
            }

            int exitCode = process.waitFor();
            log.info("[LOCAL-WORKER] Process for job {} completed with exit code: {}", jobId, exitCode);

            if (exitCode != 0) {
                markJobFailed(jobId, job, "Local AI worker process exited with error code: " + exitCode);
            }

        } catch (Exception e) {
            log.error("[LOCAL-WORKER-ERROR] Failed to run local worker for job {}: {}", jobId, e.getMessage(), e);
            markJobFailed(jobId, job, "Worker execution failed: " + e.getMessage());
        }
    }

    private void markJobFailed(UUID jobId, AudioJob fallbackEntity, String errorMessage) {
        try {
            AudioJob failedJob = audioJobRepository.findById(jobId).orElse(fallbackEntity);
            failedJob.setStatus(AudioJobStatus.FAILED);
            failedJob.setErrorMessage(errorMessage);
            audioJobRepository.save(failedJob);
            log.info("[JOB-FAILED] Updated job {} status to FAILED in database.", jobId);
        } catch (Exception e) {
            log.error("[JOB-FAILED-ERROR] Could not update job {} status to FAILED: {}", jobId, e.getMessage(), e);
        }
    }
}
