import os
import shutil
import tempfile
from pathlib import Path
import numpy as np
import soundfile as sf
import pytest

from src.separator import (
    validate_audio_file,
    separate_with_dsp,
    separate_audio,
    AudioValidationError,
    StemGenerationError
)
from src.worker import run_worker


@pytest.fixture
def sample_wav(tmp_path):
    """Generates a synthetic 2-second stereo WAV test file with mixed frequencies."""
    sr = 44100
    duration = 2.0
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)

    # Sub-bass tone (80Hz), Vocal tone (1000Hz), High percussion tone (6000Hz)
    ch1 = 0.4 * np.sin(2 * np.pi * 80 * t) + 0.3 * np.sin(2 * np.pi * 1000 * t) + 0.2 * np.sin(2 * np.pi * 6000 * t)
    ch2 = 0.4 * np.sin(2 * np.pi * 80 * t) + 0.3 * np.sin(2 * np.pi * 1000 * t) - 0.2 * np.sin(2 * np.pi * 6000 * t)
    audio = np.column_stack([ch1, ch2])

    file_path = tmp_path / "test_track.wav"
    sf.write(str(file_path), audio, sr, subtype='PCM_16')
    return file_path


def test_validate_audio_file_valid(sample_wav):
    meta = validate_audio_file(sample_wav)
    assert meta["duration"] >= 1.9
    assert meta["samplerate"] == 44100
    assert meta["channels"] == 2
    assert meta["size_bytes"] > 0


def test_validate_audio_file_not_found(tmp_path):
    missing_path = tmp_path / "non_existent.wav"
    with pytest.raises(AudioValidationError):
        validate_audio_file(missing_path)


def test_validate_audio_file_empty(tmp_path):
    empty_file = tmp_path / "empty.wav"
    empty_file.write_bytes(b"")
    with pytest.raises(AudioValidationError):
        validate_audio_file(empty_file)


def test_separate_with_dsp_generates_four_stems(sample_wav, tmp_path):
    out_dir = tmp_path / "stems_output_4"
    stems = separate_with_dsp(sample_wav, out_dir, model_name="htdemucs")

    expected = ["vocals", "drums", "bass", "other"]
    assert set(stems.keys()) == set(expected)

    for stem_name in expected:
        path = stems[stem_name]
        assert path.exists(), f"Stem {stem_name} file does not exist"
        assert path.stat().st_size > 0, f"Stem {stem_name} is empty"


def test_separate_with_dsp_generates_two_stems(sample_wav, tmp_path):
    out_dir = tmp_path / "stems_output_2"
    stems = separate_with_dsp(sample_wav, out_dir, model_name="htdemucs_2s")

    expected = ["vocals", "instrumental"]
    assert set(stems.keys()) == set(expected)

    for stem_name in expected:
        path = stems[stem_name]
        assert path.exists()
        assert path.stat().st_size > 0


def test_separate_with_dsp_generates_six_stems(sample_wav, tmp_path):
    out_dir = tmp_path / "stems_output_6"
    stems = separate_with_dsp(sample_wav, out_dir, model_name="htdemucs_6s")

    expected = ["vocals", "drums", "bass", "other", "guitar", "piano"]
    assert set(stems.keys()) == set(expected)

    for stem_name in expected:
        path = stems[stem_name]
        assert path.exists()
        assert path.stat().st_size > 0


def test_run_worker_with_profiles(sample_wav, tmp_path):
    out_dir = tmp_path / "worker_output_6"
    result = run_worker(
        job_id="test-job-uuid-6s",
        input_file=str(sample_wav),
        output_dir=str(out_dir),
        model_name="htdemucs_6s",
        use_demucs=False
    )

    assert result["status"] == "SUCCEEDED"
    assert result["job_id"] == "test-job-uuid-6s"
    assert len(result["stems"]) == 6
