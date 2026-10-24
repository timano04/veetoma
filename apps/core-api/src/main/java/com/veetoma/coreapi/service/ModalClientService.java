package com.veetoma.coreapi.service;

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.StreamReadConstraints;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.veetoma.coreapi.dto.ModalSeparationRequest;
import com.veetoma.coreapi.dto.ModalSeparationResponse;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.net.ConnectException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpConnectTimeoutException;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
public class ModalClientService {

        @Getter
        @Value("${veetoma.modal.endpoint-url:https://timano4--veetoma-demucs-worker-demucsworker-api-separate.us-east.modal.run}")
        private String endpointUrl;

        @Getter
        @Value("${veetoma.modal.ping-url:}")
        private String pingUrl;

        public String getEffectivePingUrl() {
                if (pingUrl != null && !pingUrl.isBlank()) {
                        return pingUrl;
                }
                if (endpointUrl != null && endpointUrl.contains("api-separate")) {
                        return endpointUrl.replace("api-separate", "api-ping");
                }
                return endpointUrl;
        }

        @Getter
        @Value("${veetoma.modal.enabled:true}")
        private boolean enabled;

        @Getter
        @Value("${veetoma.modal.timeout-seconds:300}")
        private int timeoutSeconds;

        @Getter
        @Value("${veetoma.worker.base-server-url:http://localhost:8080}")
        private String baseServerUrl;

        private final FileStorageService fileStorageService;
        private final ObjectMapper objectMapper;
        private final HttpClient httpClient;

        @org.springframework.beans.factory.annotation.Autowired
        public ModalClientService(FileStorageService fileStorageService) {
                this.fileStorageService = fileStorageService;

                // Configure Jackson without the default 20MB maxStringLength limit (allows full
                // 6-stem payloads up to 1GB)
                StreamReadConstraints constraints = StreamReadConstraints.builder()
                                .maxStringLength(Integer.MAX_VALUE)
                                .maxNestingDepth(2000)
                                .build();
                JsonFactory jsonFactory = JsonFactory.builder()
                                .streamReadConstraints(constraints)
                                .build();
                this.objectMapper = new ObjectMapper(jsonFactory);

                this.httpClient = HttpClient.newBuilder()
                                .version(HttpClient.Version.HTTP_1_1)
                                .connectTimeout(Duration.ofSeconds(20))
                                .followRedirects(HttpClient.Redirect.NORMAL)
                                .build();
        }

        @PostConstruct
        public void logConfiguration() {
                log.info("================================================================================");
                log.info(" [MODAL CONFIG] Veetoma Modal AI Client Initialized");
                log.info(" [MODAL CONFIG] Endpoint URL   : {}", endpointUrl);
                log.info(" [MODAL CONFIG] Enabled        : {}", enabled);
                log.info(" [MODAL CONFIG] Timeout        : {}s", timeoutSeconds);
                log.info(" [MODAL CONFIG] Base Server URL: {}", baseServerUrl);
                log.info(" [MODAL CONFIG] Jackson MaxStr : UNLIMITED (StreamReadConstraints configured)");
                log.info("================================================================================");
        }

        /**
         * Sends input audio to the Modal serverless Demucs worker for 6-stem
         * separation.
         * Streams the resulting JSON response to minimize heap memory allocation and
         * writes decoded stem WAV files directly to the local stem directory.
         *
         * @param jobId          Audio job UUID
         * @param inputAudioPath Local path to original audio
         * @param filename       Original file name
         * @return ModalSeparationResponse with separation metadata
         */
        public ModalSeparationResponse processSeparation(UUID jobId, Path inputAudioPath, String filename)
                        throws IOException, InterruptedException {

                if (!Files.exists(inputAudioPath)) {
                        throw new FileNotFoundException(
                                        "Input audio file not found on disk at: " + inputAudioPath.toAbsolutePath());
                }

                long rawFileSize = Files.size(inputAudioPath);
                if (rawFileSize == 0) {
                        throw new IllegalArgumentException(
                                        "Input audio file is empty (0 bytes): " + inputAudioPath.toAbsolutePath());
                }

                log.info("[MODAL-REQ] Preparing separation request for job ID: {}", jobId);
                log.info("[MODAL-REQ] Target Endpoint  : {}", endpointUrl);
                log.info("[MODAL-REQ] Audio Filename   : {}", filename);
                log.info("[MODAL-REQ] Input File Size  : {} bytes ({:.2f} MB)", rawFileSize,
                                rawFileSize / (1024.0 * 1024.0));

                long readStart = System.currentTimeMillis();
                byte[] audioBytes = Files.readAllBytes(inputAudioPath);
                String base64Audio = Base64.getEncoder().encodeToString(audioBytes);
                log.debug("[MODAL-REQ] Base64 encoded in {} ms (base64 string length: {} chars)",
                                System.currentTimeMillis() - readStart, base64Audio.length());

                ModalSeparationRequest requestPayload = ModalSeparationRequest.builder()
                                .jobId(jobId.toString())
                                .audioBase64(base64Audio)
                                .filename(filename)
                                .build();

                String jsonBody = objectMapper.writeValueAsString(requestPayload);

                HttpRequest request = HttpRequest.newBuilder()
                                .uri(URI.create(endpointUrl))
                                .header("Content-Type", "application/json")
                                .header("Accept", "application/json")
                                .header("User-Agent", "VeetomaCoreApi/1.0 (Java 21 HttpClient)")
                                .timeout(Duration.ofSeconds(timeoutSeconds))
                                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                                .build();

                log.info("[MODAL-REQ] Outgoing HTTP POST -> Target: {}", endpointUrl);
                log.info("[MODAL-REQ] Request body size: {} bytes ({:.2f} MB)",
                                jsonBody.length(), jsonBody.length() / (1024.0 * 1024.0));

                long httpStartTime = System.currentTimeMillis();
                HttpResponse<InputStream> response;

                try {
                        // Use streaming body handler to stream large JSON directly into Jackson parser
                        response = httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());
                } catch (HttpConnectTimeoutException e) {
                        log.error("[MODAL-ERROR] Connection timed out after 20s while connecting to Modal endpoint: {}",
                                        endpointUrl, e);
                        throw e;
                } catch (HttpTimeoutException e) {
                        log.error("[MODAL-ERROR] Request timed out after {}s waiting for Modal inference to complete: {}",
                                        timeoutSeconds, endpointUrl, e);
                        throw e;
                } catch (ConnectException e) {
                        log.error("[MODAL-ERROR] Failed to connect to Modal endpoint {}: {}", endpointUrl,
                                        e.getMessage(), e);
                        throw e;
                } catch (IOException e) {
                        log.error("[MODAL-ERROR] I/O Exception during HTTP POST to {}: {}", endpointUrl, e.getMessage(),
                                        e);
                        throw e;
                } catch (InterruptedException e) {
                        log.error("[MODAL-ERROR] Thread interrupted while waiting for Modal response: {}",
                                        e.getMessage(), e);
                        Thread.currentThread().interrupt();
                        throw e;
                } catch (Exception e) {
                        log.error("[MODAL-ERROR] Unexpected error sending request to Modal endpoint {}: {}",
                                        endpointUrl, e.getMessage(), e);
                        throw e;
                }

                long elapsedMs = System.currentTimeMillis() - httpStartTime;
                log.info("[MODAL-RESP] Received HTTP {} in {} ms ({:.2f}s) for job {}",
                                response.statusCode(), elapsedMs, elapsedMs / 1000.0, jobId);

                if (response.statusCode() != 200) {
                        String errorBody;
                        try (InputStream is = response.body()) {
                                byte[] errBytes = is.readAllBytes();
                                errorBody = new String(errBytes, StandardCharsets.UTF_8);
                        }
                        log.error("[MODAL-RESP-ERROR] Modal endpoint returned non-200 status: HTTP {} | Body: {}",
                                        response.statusCode(),
                                        errorBody.length() > 500 ? errorBody.substring(0, 500) + "..." : errorBody);
                        throw new RuntimeException(
                                        "Modal worker returned HTTP " + response.statusCode() + ": " + errorBody);
                }

                ModalSeparationResponse separationResponse;
                try (InputStream is = response.body()) {
                        // Stream parse JSON response with relaxed string length constraint
                        separationResponse = objectMapper.readValue(is, ModalSeparationResponse.class);
                } catch (Exception parseErr) {
                        log.error("[MODAL-RESP-ERROR] Failed to stream-parse JSON from Modal response for job {}: {}",
                                        jobId, parseErr.getMessage(), parseErr);
                        throw new IOException("Failed to parse Modal response payload: " + parseErr.getMessage(),
                                        parseErr);
                }

                if (separationResponse == null) {
                        log.error("[MODAL-RESP-ERROR] Empty or null response payload returned from Modal endpoint");
                        throw new IllegalStateException("Received empty response body from Modal AI worker");
                }

                log.info("[MODAL-RESP] Parsed response -> Status: {}, Model: {}, Stem Count: {}, Inference Time: {}s",
                                separationResponse.getStatus(),
                                separationResponse.getModel(),
                                separationResponse.getStemCount(),
                                separationResponse.getInferenceDurationSeconds());

                if (!"SUCCEEDED".equalsIgnoreCase(separationResponse.getStatus())) {
                        log.error("[MODAL-RESP-ERROR] Modal worker reported task failure: {}",
                                        separationResponse.getErrorMessage());
                        throw new RuntimeException(
                                        "Modal worker reported failure: " + separationResponse.getErrorMessage());
                }

                Map<String, String> stemsBase64 = separationResponse.getStemsBase64();
                if (stemsBase64 == null || stemsBase64.isEmpty()) {
                        log.error("[MODAL-RESP-ERROR] Modal worker returned SUCCEEDED status but stems_base64 map is empty or null!");
                        throw new IllegalStateException("Modal worker succeeded but returned no stems");
                }

                Path stemOutputDir = fileStorageService.getStemDirectory(jobId);
                log.info("[MODAL-SAVING] Decoding and saving {} stems to directory: {}", stemsBase64.size(),
                                stemOutputDir.toAbsolutePath());

                for (Map.Entry<String, String> entry : stemsBase64.entrySet()) {
                        String stemName = entry.getKey();
                        byte[] stemBytes = Base64.getDecoder().decode(entry.getValue());
                        Path targetFile = stemOutputDir.resolve(stemName + ".wav");
                        Files.write(targetFile, stemBytes);
                        log.info("[MODAL-SAVING] Saved stem '{}' -> {} ({} bytes, {:.2f} MB)",
                                        stemName, targetFile.getFileName(), stemBytes.length,
                                        stemBytes.length / (1024.0 * 1024.0));
                }

                log.info("[MODAL-SUCCESS] All {} stems decoded and saved successfully for job ID: {}",
                                stemsBase64.size(), jobId);
                return separationResponse;
        }

        /**
         * Sends a lightweight non-blocking GET ping to the Modal AI worker.
         * This triggers container spin-up and pre-loads Demucs into GPU VRAM in
         * advance.
         */
        public java.util.concurrent.CompletableFuture<Map<String, Object>> pingWorkerAsync() {
                return java.util.concurrent.CompletableFuture.supplyAsync(() -> {
                        if (!enabled) {
                                log.info("[MODAL PING] Modal is disabled, skipping pre-warm ping.");
                                return Map.of("status", "disabled", "message", "Modal is disabled");
                        }

                        String targetPingUrl = getEffectivePingUrl();
                        log.info("[MODAL PING] Pre-warming Modal GPU container via: {}", targetPingUrl);

                        try {
                                HttpRequest request = HttpRequest.newBuilder()
                                                .uri(URI.create(targetPingUrl))
                                                .timeout(Duration.ofSeconds(60))
                                                .GET()
                                                .build();

                                HttpResponse<String> response = httpClient.send(request,
                                                HttpResponse.BodyHandlers.ofString());
                                log.info("[MODAL PING] Response code: {}, body: {}", response.statusCode(),
                                                response.body());

                                if (response.statusCode() == 200) {
                                        return Map.of(
                                                        "status", "warm",
                                                        "httpStatus", response.statusCode(),
                                                        "response", response.body(),
                                                        "message", "Modal worker pre-warmed successfully");
                                } else {
                                        return Map.of(
                                                        "status", "pending_warmup",
                                                        "httpStatus", response.statusCode(),
                                                        "response", response.body());
                                }
                        } catch (Exception e) {
                                log.warn("[MODAL PING] Pre-warm ping attempt encountered: {}", e.getMessage());
                                return Map.of(
                                                "status", "warming_initiated",
                                                "error", e.getMessage() != null ? e.getMessage() : "Unknown exception");
                        }
                });
        }

        public Map<String, Object> pingWorkerSync() {
                try {
                        return pingWorkerAsync().get(5, java.util.concurrent.TimeUnit.SECONDS);
                } catch (java.util.concurrent.TimeoutException te) {
                        log.info("[MODAL PING] Warm-up ping is continuing in background on Modal.");
                        return Map.of("status", "warming_in_background", "message",
                                        "Worker container initialization triggered");
                } catch (Exception e) {
                        return Map.of("status", "warming_triggered", "message",
                                        e.getMessage() != null ? e.getMessage() : "Warming triggered");
                }
        }
}
