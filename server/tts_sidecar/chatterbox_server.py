"""
Chatterbox-Nano TTS sidecar.

A minimal HTTP server that loads Chatterbox-Nano (110M, CPU-native variant of
Chatterbox-Turbo) once at boot and exposes:

    GET  /health                      -> {"ok": true, "model": "..."} once the model is loaded
    POST /synthesize                  -> audio/wav
         body: { "text": str, "voice": "<reference clip filename>" }

The Node sidecarManager spawns this with a venv python interpreter, health-
checks it, and proxies /api/tts/generate here. Everything runs offline after
the one-time pip install + weight download.

Run directly for development:
    python chatterbox_server.py --port 3117 --voices-dir ./voices
"""

import argparse
import io
import json
import os
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# Loaded on a background thread at boot (see start_loading) so /health stays
# answerable while weights download.
_model = None
_model_error = None
# Serializes loading: /health polling would otherwise start several concurrent
# loads (each downloading weights) on the threading server's worker threads.
_model_lock = threading.Lock()
VOICES_DIR = "."

# Chatterbox derives speaker conditionals from the reference clip and asserts a
# hard floor internally; check it up front so the user gets a usable message.
MIN_REF_SECONDS = 5.0


def get_model():
    """Load Chatterbox-Nano once. Nano = same class as Turbo with nano=True."""
    global _model, _model_error
    if _model is not None or _model_error is not None:
        return _model
    with _model_lock:
        # Another thread may have finished while we waited for the lock.
        if _model is not None or _model_error is not None:
            return _model
        try:
            import torch  # noqa: F401 — imported to fail fast with a clear error
            from chatterbox.tts_turbo import ChatterboxTurboTTS

            print("[chatterbox] Loading Chatterbox-Nano (cpu)...", flush=True)
            _model = ChatterboxTurboTTS.from_pretrained(device="cpu", nano=True)
            print("[chatterbox] Model ready.", flush=True)
        except Exception as e:  # noqa: BLE001 — report any load failure via /health
            _model_error = str(e)
            print(f"[chatterbox] Model load FAILED: {e}", file=sys.stderr, flush=True)
    return _model


def start_loading():
    """
    Load the model on a background thread.

    The first load downloads ~1.5GB of weights and can take many minutes, so it
    must not happen inside a request handler: /health has to stay answerable the
    whole time or the supervising Node process has no way to tell "still
    downloading" apart from "hung".
    """
    threading.Thread(target=get_model, name="model-loader", daemon=True).start()


def resolve_voice_path(voice):
    """Map a voice id to its reference-clip path inside VOICES_DIR."""
    if not voice:
        return None
    # Reject path traversal — voice must be a plain filename.
    if os.path.sep in voice or ".." in voice:
        return None
    p = os.path.join(VOICES_DIR, voice)
    return p if os.path.isfile(p) else None


def ref_clip_too_short(path):
    """Duration of a reference clip if it's under the model's floor, else None."""
    try:
        import librosa

        seconds = librosa.get_duration(path=path)
    except Exception:  # noqa: BLE001 — let generation surface a decode failure
        return None
    return seconds if seconds <= MIN_REF_SECONDS else None


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):  # quieter logs; Node captures stdout anyway
        pass

    def _json(self, code, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            # Reads state only — never triggers the load, so this stays
            # responsive while weights download on the loader thread.
            if _model_error:
                self._json(503, {"ok": False, "error": _model_error})
            elif _model is None:
                self._json(200, {"ok": False, "loading": True})
            else:
                self._json(200, {"ok": True, "model": "chatterbox-nano"})
            return
        self._json(404, {"error": "Not found"})

    def do_POST(self):
        if self.path != "/synthesize":
            self._json(404, {"error": "Not found"})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length) or b"{}")
        except Exception:  # noqa: BLE001
            self._json(400, {"error": "Invalid JSON body"})
            return

        text = (payload.get("text") or "").strip()
        if not text:
            self._json(400, {"error": "Missing text"})
            return

        model = get_model()
        if model is None:
            msg = _model_error or "Model still loading"
            self._json(503, {"error": msg})
            return

        voice_path = resolve_voice_path(payload.get("voice"))
        if voice_path:
            short = ref_clip_too_short(voice_path)
            if short is not None:
                self._json(400, {
                    "error": (
                        f"Reference clip '{os.path.basename(voice_path)}' is "
                        f"{short:.1f}s. Chatterbox needs a clip longer than "
                        f"{MIN_REF_SECONDS:.0f}s to clone a voice."
                    )
                })
                return

        try:
            wav = model.generate(text, audio_prompt_path=voice_path)
            buf = io.BytesIO()
            import torchaudio as ta

            ta.save(buf, wav, model.sr, format="wav")
            audio = buf.getvalue()
        except Exception as e:  # noqa: BLE001
            self._json(500, {"error": f"Generation failed: {e}"})
            return

        self.send_response(200)
        self.send_header("Content-Type", "audio/wav")
        self.send_header("Content-Length", str(len(audio)))
        self.end_headers()
        self.wfile.write(audio)


def main():
    global VOICES_DIR
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=3117)
    parser.add_argument("--voices-dir", default=".")
    args = parser.parse_args()
    VOICES_DIR = os.path.abspath(args.voices_dir)
    os.makedirs(VOICES_DIR, exist_ok=True)

    start_loading()

    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"[chatterbox] Sidecar listening on 127.0.0.1:{args.port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
