package com.veetoma.coreapi.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModalSeparationRequest {

    @JsonProperty("job_id")
    private String jobId;

    @JsonProperty("audio_base64")
    private String audioBase64;

    @JsonProperty("audio_url")
    private String audioUrl;

    @JsonProperty("filename")
    private String filename;

    @JsonProperty("callback_url")
    private String callbackUrl;
}
