package com.veetoma.coreapi.dto;

import com.veetoma.coreapi.model.MusicBoxTrack;
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
public class MusicBoxTrackResponse {
    private UUID id;
    private String title;
    private String artist;
    private String album;
    private Integer durationSeconds;
    private String fileName;
    private String audioUrl;
    private String coverUrl;
    private String genre;
    private Long fileSizeBytes;
    private String format;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public static MusicBoxTrackResponse fromEntity(MusicBoxTrack track) {
        return MusicBoxTrackResponse.builder()
                .id(track.getId())
                .title(track.getTitle())
                .artist(track.getArtist())
                .album(track.getAlbum())
                .durationSeconds(track.getDurationSeconds())
                .fileName(track.getFileName())
                .audioUrl(track.getAudioUrl())
                .coverUrl(track.getCoverUrl())
                .genre(track.getGenre())
                .fileSizeBytes(track.getFileSizeBytes())
                .format(track.getFormat())
                .createdAt(track.getCreatedAt())
                .updatedAt(track.getUpdatedAt())
                .build();
    }
}
