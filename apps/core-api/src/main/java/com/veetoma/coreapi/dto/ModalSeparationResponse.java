package com.veetoma.coreapi.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModalSeparationResponse {

    @JsonProperty("status")
    private String status;

    @JsonProperty("job_id")
    private String jobId;

    @JsonProperty("model")
    private String model;

    @JsonProperty("stem_count")
    private Integer stemCount;

    @JsonProperty("stems_base64")
    private Map<String, String> stemsBase64;

    @JsonProperty("stems_sizes_bytes")
    private Map<String, Long> stemsSizesBytes;

    @JsonProperty("inference_duration_seconds")
    private Double inferenceDurationSeconds;

    @JsonProperty("error_message")
    private String errorMessage;
}
