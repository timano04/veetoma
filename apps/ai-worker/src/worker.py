"""
Veetoma AI Worker CLI & Orchestrator.
Receives audio jobs, processes stem separation across multiple profiles, and notifies Core API of lifecycle transitions.
"""

import sys
import json
import argparse
import logging
from pathlib import Path

from src.separator import separate_audio, AudioValidationError, StemGenerationError

logger = logging.getLogger("veetoma.worker")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


def notify_status(
    api_url: str,
    job_id: str,
    status: str,
    stems: dict = None,
    error_message: str = None,
    base_server_url: str = "http://localhost:8080"
):
    """
    Sends PATCH request to Core API to update Job state and stem URLs.
    Uses urllib.request from standard library for rock-solid reliability.
    """
    import urllib.request
    import urllib.error

    url = f"{api_url}/{job_id}/status"
    payload = {"status": status}

    if status == "SUCCEEDED" and stems:
        stem_fields = {
            "vocals": "vocalsUrl",
            "drums": "drumsUrl",
            "bass": "bassUrl",
            "other": "otherUrl",
            "guitar": "guitarUrl",
            "piano": "pianoUrl",
            "instrumental": "instrumentalUrl"
        }
        for stem_name, field_name in stem_fields.items():
            if stem_name in stems:
                payload[field_name] = f"{base_server_url}/api/files/stems/{job_id}/{stem_name}.wav"

    if error_message:
        payload["errorMessage"] = str(error_message)

    try:
        logger.info(f"Notifying Core API -> {url} [status={status}]")
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json"},
            method="PATCH"
        )
        with urllib.request.urlopen(req, timeout=10.0) as resp:
            logger.info(f"Successfully reported status to Core API: HTTP {resp.status}")
    except urllib.error.HTTPError as e:
        logger.warning(f"Failed to notify API: HTTP {e.code} - {e.read().decode('utf-8', errors='ignore')}")
    except Exception as e:
        logger.error(f"Error communicating with Core API: {e}")


def run_worker(
    job_id: str = None,
    input_file: str = None,
    output_dir: str = None,
    api_url: str = None,
    model_name: str = "htdemucs",
    use_demucs: bool = True
) -> dict:
    """
    Executes worker separation pipeline and handles status updates.
    """
    input_path = Path(input_file).resolve()
    out_dir = Path(output_dir).resolve()

    if job_id and api_url:
        notify_status(api_url, job_id, "RUNNING")

    try:
        logger.info(f"Starting stem isolation for job: {job_id or 'standalone'} using model: {model_name}")
        stems = separate_audio(input_path, out_dir, use_demucs=use_demucs, model_name=model_name)
        logger.info(f"Separation complete. Extracted {len(stems)} stems: {list(stems.keys())}")

        if job_id and api_url:
            notify_status(api_url, job_id, "SUCCEEDED", stems=stems)

        return {
            "status": "SUCCEEDED",
            "job_id": job_id,
            "model_name": model_name,
            "stems": {name: str(path) for name, path in stems.items()}
        }

    except Exception as err:
        logger.error(f"Stem separation failed: {err}", exc_info=True)
        if job_id and api_url:
            notify_status(api_url, job_id, "FAILED", error_message=str(err))

        return {
            "status": "FAILED",
            "job_id": job_id,
            "error": str(err)
        }


def main():
    parser = argparse.ArgumentParser(description="Veetoma AI Stem Separation Worker")
    parser.add_argument("--job-id", type=str, help="UUID of the Audio Job", default=None)
    parser.add_argument("--input-file", type=str, required=True, help="Path to input audio file")
    parser.add_argument("--output-dir", type=str, required=True, help="Directory to save separated stems")
    parser.add_argument("--api-url", type=str, help="Core API endpoint for status notifications", default=None)
    parser.add_argument("--model", dest="model_name", type=str, default="htdemucs", help="Separation model: htdemucs_2s, htdemucs, htdemucs_6s")
    parser.add_argument("--use-demucs", action="store_true", default=True, help="Use Demucs neural model (default: True)")
    parser.add_argument("--no-demucs", dest="use_demucs", action="store_false", help="Disable Demucs, use fast DSP")

    args = parser.parse_args()

    result = run_worker(
        job_id=args.job_id,
        input_file=args.input_file,
        output_dir=args.output_dir,
        api_url=args.api_url,
        model_name=args.model_name,
        use_demucs=args.use_demucs
    )

    print(json.dumps(result, indent=2))
    if result["status"] != "SUCCEEDED":
        sys.exit(1)


if __name__ == "__main__":
    main()
