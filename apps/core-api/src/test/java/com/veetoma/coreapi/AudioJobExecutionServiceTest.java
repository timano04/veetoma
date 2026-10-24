package com.veetoma.coreapi;

import com.veetoma.coreapi.dto.ModalSeparationResponse;
import com.veetoma.coreapi.model.AudioJob;
import com.veetoma.coreapi.model.AudioJobStatus;
import com.veetoma.coreapi.repository.AudioJobRepository;
import com.veetoma.coreapi.service.AudioJobExecutionService;
import com.veetoma.coreapi.service.FileStorageService;
import com.veetoma.coreapi.service.ModalClientService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AudioJobExecutionServiceTest {

    @Mock
    private FileStorageService fileStorageService;

    @Mock
    private ModalClientService modalClientService;

    @Mock
    private AudioJobRepository audioJobRepository;

    @InjectMocks
    private AudioJobExecutionService audioJobExecutionService;

    @TempDir
    Path tempDir;

    @Test
    void testTriggerJobSeparation_modalEnabled_success() throws Exception {
        UUID jobId = UUID.randomUUID();
        Path audioPath = tempDir.resolve("input.wav");
        Files.write(audioPath, "dummy_audio".getBytes());

        Path stemOutputDir = tempDir.resolve("stems");
        Files.createDirectories(stemOutputDir);
        when(fileStorageService.getStemDirectory(jobId)).thenReturn(stemOutputDir);

        when(modalClientService.isEnabled()).thenReturn(true);
        when(modalClientService.getBaseServerUrl()).thenReturn("http://localhost:8080");

        ModalSeparationResponse modalResponse = ModalSeparationResponse.builder()
                .status("SUCCEEDED")
                .model("htdemucs_6s")
                .stemCount(6)
                .stemsBase64(Map.of(
                        "vocals", "dm9jYWxz",
                        "drums", "ZHJ1bXM=",
                        "bass", "YmFzcw==",
                        "other", "b3RoZXI=",
                        "guitar", "Z3VpdGFy",
                        "piano", "cGlhbm8="
                ))
                .inferenceDurationSeconds(4.2)
                .build();

        when(modalClientService.processSeparation(eq(jobId), eq(audioPath), eq("test.wav")))
                .thenReturn(modalResponse);

        AudioJob job = AudioJob.builder()
                .id(jobId)
                .originalFilename("test.wav")
                .status(AudioJobStatus.QUEUED)
                .build();

        when(audioJobRepository.findById(jobId)).thenReturn(Optional.of(job));

        audioJobExecutionService.triggerJobSeparation(job, audioPath);

        assertEquals(AudioJobStatus.SUCCEEDED, job.getStatus());
        assertEquals("htdemucs_6s", job.getModelName());
        assertEquals(6, job.getStemCount());
        assertEquals("http://localhost:8080/api/files/stems/" + jobId + "/guitar.wav", job.getGuitarUrl());
        assertEquals("http://localhost:8080/api/files/stems/" + jobId + "/piano.wav", job.getPianoUrl());

        verify(modalClientService, times(1)).processSeparation(eq(jobId), eq(audioPath), eq("test.wav"));
        verify(audioJobRepository, atLeast(1)).save(job);
    }
}
