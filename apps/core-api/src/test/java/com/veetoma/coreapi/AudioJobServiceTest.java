package com.veetoma.coreapi;

import com.veetoma.coreapi.dto.CreateJobRequest;
import com.veetoma.coreapi.model.AudioJob;
import com.veetoma.coreapi.model.AudioJobStatus;
import com.veetoma.coreapi.repository.AudioJobRepository;
import com.veetoma.coreapi.service.AudioJobService;
import com.veetoma.coreapi.service.AudioJobExecutionService;
import com.veetoma.coreapi.service.FileStorageService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AudioJobServiceTest {

    @Mock
    private AudioJobRepository audioJobRepository;

    @Mock
    private FileStorageService fileStorageService;

    @Mock
    private AudioJobExecutionService audioJobExecutionService;

    @InjectMocks
    private AudioJobService audioJobService;

    @Test
    void testCreateJob_success() {
        CreateJobRequest request = CreateJobRequest.builder()
                .originalFilename("master_track.wav")
                .inputFileUrl("https://storage.veetoma.io/uploads/track.wav")
                .build();

        AudioJob mockJob = AudioJob.builder()
                .id(UUID.randomUUID())
                .originalFilename("master_track.wav")
                .inputFileUrl("https://storage.veetoma.io/uploads/track.wav")
                .status(AudioJobStatus.QUEUED)
                .build();

        when(audioJobRepository.save(any(AudioJob.class))).thenReturn(mockJob);

        AudioJob created = audioJobService.createJob(request);

        assertNotNull(created);
        assertEquals("master_track.wav", created.getOriginalFilename());
        assertEquals(AudioJobStatus.QUEUED, created.getStatus());
        verify(audioJobRepository, times(1)).save(any(AudioJob.class));
    }

    @Test
    void testGetJobById_success() {
        UUID id = UUID.randomUUID();
        AudioJob mockJob = AudioJob.builder()
                .id(id)
                .originalFilename("track.mp3")
                .status(AudioJobStatus.RUNNING)
                .build();

        when(audioJobRepository.findById(id)).thenReturn(Optional.of(mockJob));

        AudioJob found = audioJobService.getJobById(id);
        assertNotNull(found);
        assertEquals(id, found.getId());
        assertEquals(AudioJobStatus.RUNNING, found.getStatus());
    }

    @Test
    void testUploadAndProcessJob_triggersExecution() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "session_mix.wav", "audio/wav", "dummy_audio_bytes".getBytes()
        );

        Path dummyPath = Paths.get("d:/veetoma/storage/uploads/session_mix.wav");
        when(fileStorageService.saveUploadedAudio(any(), any())).thenReturn(dummyPath);

        AudioJob mockJob = AudioJob.builder()
                .id(UUID.randomUUID())
                .originalFilename("session_mix.wav")
                .inputFileUrl("http://localhost:8080/api/files/uploads/session_mix.wav")
                .status(AudioJobStatus.QUEUED)
                .build();
        when(audioJobRepository.save(any(AudioJob.class))).thenReturn(mockJob);

        AudioJob result = audioJobService.uploadAndProcessJob(file, null, true);

        assertNotNull(result);
        assertEquals("session_mix.wav", result.getOriginalFilename());
        assertEquals(AudioJobStatus.QUEUED, result.getStatus());
        verify(audioJobExecutionService, times(1)).triggerJobSeparation(eq(mockJob), eq(dummyPath));
    }
}
