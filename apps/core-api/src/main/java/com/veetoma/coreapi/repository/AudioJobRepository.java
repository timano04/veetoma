package com.veetoma.coreapi.repository;

import com.veetoma.coreapi.model.AudioJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AudioJobRepository extends JpaRepository<AudioJob, UUID> {
    List<AudioJob> findAllByOrderByCreatedAtDesc();

    List<AudioJob> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
