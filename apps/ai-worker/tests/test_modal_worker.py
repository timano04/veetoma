import pytest
from pathlib import Path
import modal_worker


def test_modal_app_config():
    assert modal_worker.APP_NAME == "veetoma-demucs-worker"
    assert modal_worker.MODEL_NAME == "htdemucs_6s"
    assert modal_worker.EXPECTED_STEMS == ["vocals", "drums", "bass", "other", "piano", "guitar"]
    assert len(modal_worker.EXPECTED_STEMS) == 6


def test_separation_job_models():
    req = modal_worker.SeparationJobRequest(
        job_id="test-uuid",
        audio_url="http://localhost:8080/audio.mp3",
        filename="custom.mp3"
    )
    assert req.job_id == "test-uuid"
    assert req.audio_url == "http://localhost:8080/audio.mp3"
    assert req.filename == "custom.mp3"

    resp = modal_worker.SeparationJobResponse(
        status="SUCCEEDED",
        job_id="test-uuid",
        model="htdemucs_6s",
        stem_count=6,
        inference_duration_seconds=3.45
    )
    assert resp.status == "SUCCEEDED"
    assert resp.stem_count == 6
    assert resp.inference_duration_seconds == 3.45


def test_worker_class_structure():
    assert hasattr(modal_worker.DemucsWorker, "setup")
    assert hasattr(modal_worker.DemucsWorker, "separate")
    assert hasattr(modal_worker.DemucsWorker, "api_separate")
