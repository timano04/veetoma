package com.veetoma.coreapi.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "audio_jobs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AudioJob {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "original_filename", nullable = false, length = 255)
    private String originalFilename;

    @Column(name = "input_file_url", nullable = false, columnDefinition = "TEXT")
    private String inputFileUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private AudioJobStatus status;

    @Column(name = "model_name", nullable = false, length = 50)
    private String modelName;

    @Column(name = "stem_count", nullable = false)
    private Integer stemCount;

    @Column(name = "vocals_url", columnDefinition = "TEXT")
    private String vocalsUrl;

    @Column(name = "drums_url", columnDefinition = "TEXT")
    private String drumsUrl;

    @Column(name = "bass_url", columnDefinition = "TEXT")
    private String bassUrl;

    @Column(name = "other_url", columnDefinition = "TEXT")
    private String otherUrl;

    @Column(name = "guitar_url", columnDefinition = "TEXT")
    private String guitarUrl;

    @Column(name = "piano_url", columnDefinition = "TEXT")
    private String pianoUrl;

    @Column(name = "instrumental_url", columnDefinition = "TEXT")
    private String instrumentalUrl;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (status == null) {
            status = AudioJobStatus.QUEUED;
        }
        if (modelName == null || modelName.trim().isEmpty()) {
            modelName = "htdemucs";
        }
        if (stemCount == null) {
            stemCount = 4;
        }
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = OffsetDateTime.now();
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
