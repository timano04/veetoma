package com.veetoma.coreapi;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.veetoma.coreapi.dto.ModalSeparationResponse;
import com.veetoma.coreapi.service.FileStorageService;
import com.veetoma.coreapi.service.ModalClientService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class ModalClientServiceTest {

    @Mock
    private FileStorageService fileStorageService;

    private ObjectMapper objectMapper;
    private ModalClientService modalClientService;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        modalClientService = new ModalClientService(fileStorageService);
        ReflectionTestUtils.setField(modalClientService, "endpointUrl", "https://mock-modal.run/separate");
        ReflectionTestUtils.setField(modalClientService, "enabled", true);
        ReflectionTestUtils.setField(modalClientService, "baseServerUrl", "http://localhost:8080");
        ReflectionTestUtils.setField(modalClientService, "timeoutSeconds", 30);
    }

    @Test
    void testConfigurationProperties() {
        assertTrue(modalClientService.isEnabled());
        assertEquals("https://mock-modal.run/separate", modalClientService.getEndpointUrl());
        assertEquals("http://localhost:8080", modalClientService.getBaseServerUrl());
    }

    @Test
    void testModalSeparationResponseDeserialization() throws IOException {
        String json = """
            {
              "status": "SUCCEEDED",
              "job_id": "123e4567-e89b-12d3-a456-426614174000",
              "model": "htdemucs_6s",
              "stem_count": 6,
              "stems_base64": {
                "vocals": "dm9jYWxzX2J5dGVz",
                "drums": "ZHJ1bXNfYnl0ZXM=",
                "bass": "YmFzc19ieXRlcw==",
                "other": "b3RoZXJfYnl0ZXM=",
                "guitar": "Z3VpdGFyX2J5dGVz",
                "piano": "cGlhbm9fYnl0ZXM="
              },
              "inference_duration_seconds": 3.45,
              "error_message": null
            }
            """;

        ModalSeparationResponse response = objectMapper.readValue(json, ModalSeparationResponse.class);

        assertNotNull(response);
        assertEquals("SUCCEEDED", response.getStatus());
        assertEquals("htdemucs_6s", response.getModel());
        assertEquals(6, response.getStemCount());
        assertNotNull(response.getStemsBase64());
        assertEquals(6, response.getStemsBase64().size());
        assertTrue(response.getStemsBase64().containsKey("guitar"));
        assertTrue(response.getStemsBase64().containsKey("piano"));
    }
}
