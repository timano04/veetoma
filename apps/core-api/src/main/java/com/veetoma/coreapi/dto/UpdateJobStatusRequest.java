package com.veetoma.coreapi.dto;

import com.veetoma.coreapi.model.AudioJobStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateJobStatusRequest {
    private AudioJobStatus status;
    private String vocalsUrl;
    private String drumsUrl;
    private String bassUrl;
    private String otherUrl;
    private String guitarUrl;
    private String pianoUrl;
    private String instrumentalUrl;
    private String errorMessage;
}
