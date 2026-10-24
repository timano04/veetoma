package com.veetoma.coreapi.dto;

import com.veetoma.coreapi.model.AudioJob;
import com.veetoma.coreapi.model.AudioJobStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AudioJobResponse {
    private UUID id;
    private UUID userId;
    private String originalFilename;
    private String inputFileUrl;
    private AudioJobStatus status;
    private String modelName;
    private Integer stemCount;
    private String vocalsUrl;
    private String drumsUrl;
    private String bassUrl;
    private String otherUrl;
    private String guitarUrl;
    private String pianoUrl;
    private String instrumentalUrl;
    private String errorMessage;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public static AudioJobResponse fromEntity(AudioJob job) {
        if (job == null) return null;
        return AudioJobResponse.builder()
                .id(job.getId())
                .userId(job.getUserId())
                .originalFilename(job.getOriginalFilename())
                .inputFileUrl(job.getInputFileUrl())
                .status(job.getStatus())
                .modelName(job.getModelName())
                .stemCount(job.getStemCount())
                .vocalsUrl(job.getVocalsUrl())
                .drumsUrl(job.getDrumsUrl())
                .bassUrl(job.getBassUrl())
                .otherUrl(job.getOtherUrl())
                .guitarUrl(job.getGuitarUrl())
                .pianoUrl(job.getPianoUrl())
                .instrumentalUrl(job.getInstrumentalUrl())
                .errorMessage(job.getErrorMessage())
                .createdAt(job.getCreatedAt())
                .updatedAt(job.getUpdatedAt())
                .build();
    }
}
