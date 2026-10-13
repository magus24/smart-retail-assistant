import logging
from typing import AsyncGenerator

from google import genai

from app.core.config import settings

logger = logging.getLogger(__name__)

_client = None


def get_genai_client() -> genai.Client:
    global _client
    if _client is None:
        if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your_gemini_api_key_here":
            logger.error("GEMINI_API_KEY is not set or is invalid.")
            raise ValueError("Invalid Gemini API Key")
        from google.genai import types

        _client = genai.Client(
            api_key=settings.GEMINI_API_KEY,
            http_options=types.HttpOptions(api_version="v1alpha"),
        )
    return _client


async def stream_gemini_audio(text: str) -> AsyncGenerator[bytes, None]:
    client = get_genai_client()

    system_instruction = (
        "You are a voice synthesizer. Speak the exact text provided to you "
        "word-for-word without any modifications or conversational responses. "
        "Your ONLY job is to read the text aloud."
    )

    config = {
        "response_modalities": ["AUDIO"],
        "system_instruction": {"parts": [{"text": system_instruction}]},
        "speech_config": {
            "voice_config": {
                "prebuilt_voice_config": {"voice_name": "Aoede"}
            }
        },
    }

    try:
        async with client.aio.live.connect(
            model="gemini-2.5-flash-native-audio-latest",
            config=config,
        ) as session:
            await session.send(input=text, end_of_turn=True)

            async for response in session.receive():
                server_content = response.server_content
                if server_content is not None:
                    model_turn = server_content.model_turn
                    if model_turn is not None:
                        for part in model_turn.parts:
                            if part.inline_data and part.inline_data.data:
                                yield part.inline_data.data
    except Exception as e:
        logger.error(f"Error streaming Gemini audio: {e}")
