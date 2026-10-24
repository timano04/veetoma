"""
Veetoma Music & AI Stem Studio - Production Modal GPU Worker
============================================================
Serverless audio stem separation powered by Meta's Demucs (htdemucs_6s) on Modal.
Optimized for ultra-low latency, persistent checkpoint caching via modal.Volume,
pre-warmed GPU containers, and rock-solid error handling.

Architecture Highlights:
  1. Image: Debian-slim (Python 3.10) + ffmpeg + PyTorch CUDA + Demucs.
  2. Weight Caching: Persistent modal.Volume caches htdemucs_6s weights once.
  3. Pre-Warming: @modal.enter() loads model into GPU VRAM on container startup.
  4. Keep-Alive: min_containers=1 keeps at least 1 warm container ready.
  5. Outputs: 6 stems (vocals, drums, bass, other, piano, guitar).
"""

import os
import io
import json
import time
import base64
import logging
import tempfile
import urllib.request
import urllib.error
from pathlib import Path
from typing import Dict, Optional, Any

import modal
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Logging Configuration
# ---------------------------------------------------------------------------
logger = logging.getLogger("veetoma.modal_worker")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# ---------------------------------------------------------------------------
# Modal App & Shared Infrastructure
# ---------------------------------------------------------------------------
APP_NAME = "veetoma-demucs-worker"
VOLUME_NAME = "veetoma-model-cache"
CACHE_MOUNT_PATH = "/cache"
MODEL_NAME = "htdemucs_6s"
EXPECTED_STEMS = ["vocals", "drums", "bass", "other", "piano", "guitar"]

# Persistent storage volume for caching Demucs / PyTorch model weights
cache_volume = modal.Volume.from_name(VOLUME_NAME, create_if_missing=True)

# Container image with Debian-slim, FFmpeg, PyTorch, and Demucs
image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("ffmpeg", "git")
    .pip_install(
        "torch>=2.1.0",
        "torchaudio>=2.1.0",
        "demucs>=4.0.0",
        "soundfile>=0.12.0",
        "scipy>=1.11.0",
        "numpy",
        "fastapi>=0.100.0",
        "pydantic>=2.0.0",
        "httpx>=0.25.0",
        "python-multipart",
    )
)

app = modal.App(name=APP_NAME)


# ---------------------------------------------------------------------------
# Data Models for Web Endpoint
# ---------------------------------------------------------------------------
class SeparationJobRequest(BaseModel):
    job_id: Optional[str] = None
    audio_base64: Optional[str] = None
    audio_url: Optional[str] = None
    filename: Optional[str] = "audio.wav"
    callback_url: Optional[str] = None


class SeparationJobResponse(BaseModel):
    status: str
    job_id: Optional[str] = None
    model: str = MODEL_NAME
    stem_count: int = 6
    stems_base64: Optional[Dict[str, str]] = None
    stems_sizes_bytes: Optional[Dict[str, int]] = None
    inference_duration_seconds: float = 0.0
    error_message: Optional[str] = None


# ---------------------------------------------------------------------------
# Core Worker Class: GPU Inference & Warm State Management
# ---------------------------------------------------------------------------
@app.cls(
    gpu="T4",
    image=image,
    volumes={CACHE_MOUNT_PATH: cache_volume},
    timeout=600,
    scaledown_window=60,
    min_containers=0,
)
class DemucsWorker:
    """
    Stateful GPU worker that keeps the htdemucs_6s model pre-loaded in VRAM.
    Uses persistent volume caching so cold starts never download weights over the internet.
    """

    @modal.enter()
    def setup(self):
        """
        Runs once when a new container spins up.
        Directs PyTorch / Demucs cache to the persistent Volume and pre-loads model into VRAM.
        """
        import torch
        from demucs.api import Separator

        # Configure torch cache to live on persistent volume
        torch_cache_dir = Path(CACHE_MOUNT_PATH) / "torch"
        torch_cache_dir.mkdir(parents=True, exist_ok=True)
        os.environ["TORCH_HOME"] = str(torch_cache_dir)

        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"[Modal Worker] Initializing Demucs '{MODEL_NAME}' on {self.device}...")

        start_time = time.perf_counter()
        # Initializing Separator loads model weights from /cache into GPU VRAM
        self.separator = Separator(model=MODEL_NAME, device=self.device, split=True)
        init_duration = time.perf_counter() - start_time

        # Commit volume to ensure downloaded weights persist across future containers
        try:
            cache_volume.commit()
        except Exception as vol_err:
            logger.debug(f"[Modal Worker] Volume commit notice: {vol_err}")

        logger.info(
            f"[Modal Worker] Demucs '{MODEL_NAME}' successfully loaded into VRAM in {init_duration:.2f}s. "
            f"Container is WARM and READY on {self.device}."
        )

    def _validate_audio(self, audio_path: Path):
        """Enforces audio file integrity, size, and duration constraints."""
        import soundfile as sf

        if not audio_path.exists():
            raise ValueError(f"Audio file does not exist: {audio_path}")

        file_size = audio_path.stat().st_size
        if file_size == 0:
            raise ValueError("Audio file is empty (0 bytes).")
        if file_size > 150 * 1024 * 1024:
            raise ValueError(f"Audio file exceeds 150MB limit: {file_size / (1024 * 1024):.1f}MB")

        info = sf.info(str(audio_path))
        if info.duration < 0.5:
            raise ValueError(f"Audio duration is too short: {info.duration:.2f}s (< 0.5s)")
        if info.duration > 1200:
            raise ValueError(f"Audio duration exceeds 20 minutes limit: {info.duration:.1f}s")

    @modal.fastapi_endpoint(method="GET")
    def api_ping(self) -> Dict[str, Any]:
        """
        Lightweight GET endpoint to pre-warm the container.
        When invoked, triggers container spin-up and @modal.enter() to pre-load
        the Demucs model into GPU VRAM in the background with zero audio processing.
        """
        logger.info(f"[Modal Worker] Pre-warm ping received. Worker is WARM on {self.device}.")
        return {
            "status": "warm",
            "message": "Worker is awake and model is pre-loaded in GPU VRAM",
            "device": self.device,
            "model": MODEL_NAME,
            "expected_stems": EXPECTED_STEMS,
        }

    @modal.method()
    def separate(
        self,
        audio_bytes: bytes,
        filename: str = "audio.wav",
        job_id: Optional[str] = None,
        callback_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Executes 6-stem separation on raw audio bytes using the pre-loaded T4 GPU model.
        Returns a dictionary containing raw bytes for all 6 stems.
        """
        from demucs.api import save_audio

        logger.info(
            f"[Modal Worker] Starting separation for job '{job_id or 'direct'}' "
            f"(file: '{filename}', size: {len(audio_bytes)} bytes)..."
        )
        start_time = time.perf_counter()

        with tempfile.TemporaryDirectory() as temp_dir_str:
            temp_dir = Path(temp_dir_str)
            input_path = temp_dir / filename
            output_dir = temp_dir / "stems"
            output_dir.mkdir(parents=True, exist_ok=True)

            # 1. Write input audio to isolated temporary disk
            input_path.write_bytes(audio_bytes)
            self._validate_audio(input_path)

            # 2. Run GPU inference using pre-loaded model
            logger.info(f"[Modal Worker] Running Demucs inference on {self.device}...")
            _, stems_tensors = self.separator.separate_audio_file(input_path)

            # 3. Save, validate, and collect all 6 stems
            stems_bytes: Dict[str, bytes] = {}
            stems_sizes: Dict[str, int] = {}

            for stem_name in EXPECTED_STEMS:
                tensor = stems_tensors.get(stem_name)
                if tensor is None:
                    raise RuntimeError(f"Demucs did not output expected stem: '{stem_name}'")

                stem_path = output_dir / f"{stem_name}.wav"
                save_audio(tensor, stem_path, samplerate=self.separator.samplerate)

                if not stem_path.exists() or stem_path.stat().st_size == 0:
                    raise RuntimeError(f"Generated stem '{stem_name}.wav' is missing or zero bytes.")

                stem_data = stem_path.read_bytes()
                stems_bytes[stem_name] = stem_data
                stems_sizes[stem_name] = len(stem_data)

            inference_duration = time.perf_counter() - start_time
            logger.info(
                f"[Modal Worker] Successfully extracted 6 stems in {inference_duration:.2f}s "
                f"for job '{job_id or 'direct'}'."
            )

            result = {
                "status": "SUCCEEDED",
                "job_id": job_id,
                "model": MODEL_NAME,
                "stem_count": 6,
                "stems": stems_bytes,
                "stems_sizes": stems_sizes,
                "inference_duration_seconds": round(inference_duration, 2),
            }

            # Optional callback to Spring Boot Core API
            if callback_url and job_id:
                self._notify_core_api(callback_url, job_id, "SUCCEEDED")

            return result

    @modal.fastapi_endpoint(method="POST")
    def api_separate(self, req: SeparationJobRequest) -> SeparationJobResponse:
        """
        Public HTTP REST endpoint for the Spring Boot Core API to trigger separation.
        Accepts base64 audio payload or a downloadable audio URL.
        """
        start_time = time.perf_counter()

        try:
            # 1. Acquire audio bytes from payload or URL
            audio_bytes: bytes
            if req.audio_base64:
                audio_bytes = base64.b64decode(req.audio_base64)
            elif req.audio_url:
                logger.info(f"[Modal Worker] Fetching audio from URL: {req.audio_url}")
                with urllib.request.urlopen(req.audio_url, timeout=30.0) as resp:
                    audio_bytes = resp.read()
            else:
                return SeparationJobResponse(
                    status="FAILED",
                    job_id=req.job_id,
                    error_message="Missing audio input: provide either audio_base64 or audio_url.",
                )

            # 2. Execute GPU separation
            result = self.separate.local(
                audio_bytes=audio_bytes,
                filename=req.filename or "audio.wav",
                job_id=req.job_id,
                callback_url=req.callback_url,
            )

            # 3. Base64-encode stems for JSON transport
            stems_b64 = {
                name: base64.b64encode(raw).decode("utf-8")
                for name, raw in result["stems"].items()
            }

            return SeparationJobResponse(
                status="SUCCEEDED",
                job_id=req.job_id,
                model=MODEL_NAME,
                stem_count=6,
                stems_base64=stems_b64,
                stems_sizes_bytes=result["stems_sizes"],
                inference_duration_seconds=result["inference_duration_seconds"],
            )

        except Exception as e:
            logger.error(f"[Modal Worker] API separation failed for job '{req.job_id}': {e}", exc_info=True)
            if req.callback_url and req.job_id:
                self._notify_core_api(req.callback_url, req.job_id, "FAILED", error_message=str(e))

            return SeparationJobResponse(
                status="FAILED",
                job_id=req.job_id,
                model=MODEL_NAME,
                error_message=str(e),
                inference_duration_seconds=round(time.perf_counter() - start_time, 2),
            )

    def _notify_core_api(
        self,
        callback_url: str,
        job_id: str,
        status: str,
        error_message: Optional[str] = None,
    ):
        """Asynchronously updates job state in Spring Boot backend upon completion."""
        try:
            payload = {"status": status}
            if error_message:
                payload["errorMessage"] = error_message

            req = urllib.request.Request(
                callback_url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="PATCH",
            )
            with urllib.request.urlopen(req, timeout=10.0) as resp:
                logger.info(f"[Modal Worker] Notified Core API status={status} (HTTP {resp.status})")
        except Exception as net_err:
            logger.warning(f"[Modal Worker] Could not notify Core API at {callback_url}: {net_err}")


# ---------------------------------------------------------------------------
# Local Test & Verification CLI
# ---------------------------------------------------------------------------
@app.local_entrypoint()
def main(input_file: str, output_dir: str = "./modal_stems_output"):
    """
    Local CLI entrypoint for testing the worker on Modal GPU:
    Usage:
      modal run apps/ai-worker/modal_worker.py --input-file path/to/song.mp3
    """
    input_path = Path(input_file)
    if not input_path.exists():
        print(f"Error: Input file does not exist: {input_path}")
        return

    print(f"Submitting '{input_path.name}' ({input_path.stat().st_size / (1024 * 1024):.2f} MB) to Modal GPU...")
    audio_data = input_path.read_bytes()

    worker = DemucsWorker()
    start = time.perf_counter()
    result = worker.separate.remote(audio_bytes=audio_data, filename=input_path.name)
    total_time = time.perf_counter() - start

    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    print(f"\n==================================================")
    print(f"  Separation Completed in {total_time:.2f}s (Inference: {result['inference_duration_seconds']}s)")
    print(f"==================================================")

    for stem_name, stem_bytes in result["stems"].items():
        file_path = out_path / f"{stem_name}.wav"
        file_path.write_bytes(stem_bytes)
        print(f"  [OK] Saved {stem_name:8s} -> {file_path} ({len(stem_bytes) / (1024 * 1024):.2f} MB)")

    print(f"\nAll 6 stems successfully generated and saved to: {out_path.resolve()}\n")
