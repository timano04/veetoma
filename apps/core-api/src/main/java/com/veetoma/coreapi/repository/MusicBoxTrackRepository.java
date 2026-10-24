package com.veetoma.coreapi.repository;

import com.veetoma.coreapi.model.MusicBoxTrack;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MusicBoxTrackRepository extends JpaRepository<MusicBoxTrack, UUID> {
    List<MusicBoxTrack> findAllByOrderByCreatedAtDesc();
}
