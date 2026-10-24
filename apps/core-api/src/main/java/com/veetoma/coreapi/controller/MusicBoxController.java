package com.veetoma.coreapi.controller;

import com.veetoma.coreapi.dto.MusicBoxTrackResponse;
import com.veetoma.coreapi.model.MusicBoxTrack;
import com.veetoma.coreapi.service.MusicBoxService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/music-box/tracks")
@RequiredArgsConstructor
@Slf4j
public class MusicBoxController {

    private final MusicBoxService musicBoxService;

    @GetMapping
    public ResponseEntity<List<MusicBoxTrackResponse>> getAllTracks() {
        List<MusicBoxTrackResponse> responses = musicBoxService.getAllTracks().stream()
                .map(MusicBoxTrackResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MusicBoxTrackResponse> getTrackById(@PathVariable UUID id) {
        MusicBoxTrack track = musicBoxService.getTrackById(id);
        return ResponseEntity.ok(MusicBoxTrackResponse.fromEntity(track));
    }

    @PostMapping
    public ResponseEntity<MusicBoxTrackResponse> createTrack(@RequestBody MusicBoxTrack track) {
        MusicBoxTrack saved = musicBoxService.saveTrack(track);
        return ResponseEntity.status(HttpStatus.CREATED).body(MusicBoxTrackResponse.fromEntity(saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTrack(@PathVariable UUID id) {
        musicBoxService.deleteTrack(id);
        return ResponseEntity.noContent().build();
    }
}
