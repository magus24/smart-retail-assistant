import base64
import hashlib
import io
import logging
import wave
from typing import Optional

from google import genai

from app.core.config import settings

logger = logging.getLogger(__name__)

_client = None
_tts_cache = {}


def get_genai_client() -> Optional[genai.Client]:
    global _client
    if _client is None:
        if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your_gemini_api_key_here":
            logger.error("GEMINI_API_KEY is not set or is invalid.")
            return None
        try:
            _client = genai.Client(api_key=settings.GEMINI_API_KEY)
        except Exception as e:
            logger.error(f"Failed to configure Gemini Client: {e}")
            return None
    return _client


def _wrap_in_wav(pcm_data: bytes, sample_rate: int = 24000) -> bytes:
    with io.BytesIO() as wav_io:
        with wave.open(wav_io, "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(pcm_data)
        return wav_io.getvalue()


def generate_tts_audio(text: str) -> Optional[bytes]:
    if not text:
        return None

    text = text[:4000]
    text_hash = hashlib.md5(text.encode()).hexdigest()
    if text_hash in _tts_cache:
        logger.info("Returning Gemini TTS from cache")
        return _tts_cache[text_hash]

    client = get_genai_client()
    if not client:
        return None

    try:
        response = client.models.generate_content(
            model="gemini-3.1-flash-tts-preview",
            contents=text,
            config={
                "response_modalities": ["AUDIO"],
                "speech_config": {
                    "voice_config": {
                        "prebuilt_voice_config": {"voice_name": "Aoede"}
                    }
                },
            },
        )

        audio_data = response.candidates[0].content.parts[0].inline_data.data
        if isinstance(audio_data, str):
            missing_padding = len(audio_data) % 4
            if missing_padding:
                audio_data += "=" * (4 - missing_padding)
            audio_bytes = base64.b64decode(audio_data)
        else:
            audio_bytes = audio_data

        wav_bytes = _wrap_in_wav(audio_bytes, sample_rate=24000)
        _tts_cache[text_hash] = wav_bytes
        return wav_bytes
    except Exception as e:
        logger.error(f"Gemini TTS generation failed: {e}")
        return None
