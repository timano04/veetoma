package com.veetoma.coreapi.service;

import com.veetoma.coreapi.model.MusicBoxTrack;
import com.veetoma.coreapi.repository.MusicBoxTrackRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class MusicBoxService {

    private final MusicBoxTrackRepository musicBoxTrackRepository;

    @Transactional(readOnly = true)
    public List<MusicBoxTrack> getAllTracks() {
        return musicBoxTrackRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public MusicBoxTrack getTrackById(UUID id) {
        return musicBoxTrackRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Music track not found with id: " + id));
    }

    @Transactional
    public MusicBoxTrack saveTrack(MusicBoxTrack track) {
        MusicBoxTrack saved = musicBoxTrackRepository.save(track);
        log.info("Saved Music Box track: {} - {}", saved.getTitle(), saved.getArtist());
        return saved;
    }

    @Transactional
    public void deleteTrack(UUID id) {
        musicBoxTrackRepository.deleteById(id);
        log.info("Deleted Music Box track with id: {}", id);
    }
}
