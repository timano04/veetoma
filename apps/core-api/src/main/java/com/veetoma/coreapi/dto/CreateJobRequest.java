package com.veetoma.coreapi.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateJobRequest {
    private String originalFilename;
    private String inputFileUrl;
    private UUID userId;
    private String modelName;
    private Integer stemCount;
}
