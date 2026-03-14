"""
tts.py  –  Text-to-Speech service.

Supports two backends (selected via env var TTS_BACKEND):
  • "openai"  – uses OpenAI /audio/speech  (default)
  • "google"  – uses Google Cloud Text-to-Speech

Returns base-64 encoded MP3 audio bytes.
"""
import base64, os
from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

TTS_BACKEND = os.getenv("TTS_BACKEND", "openai").lower()

# ─── Language → voice mapping ───────────────────────────────────────────────
OPENAI_VOICE_MAP = {
    "vi": "alloy",    # OpenAI doesn't have a native Vietnamese voice;
                      # alloy is multilingual and handles Vietnamese reasonably.
    "en": "alloy",
}

GOOGLE_VOICE_MAP = {
    "vi": "vi-VN-Standard-A",
    "en": "en-US-Standard-C",
}


async def synthesize(text: str, lang: str = "vi") -> str:
    """
    Synthesise *text* in *lang* and return base-64 MP3 string.
    """
    if TTS_BACKEND == "google":
        return await _google_tts(text, lang)
    return await _openai_tts(text, lang)


# ─── OpenAI TTS ─────────────────────────────────────────────────────────────
async def _openai_tts(text: str, lang: str) -> str:
    voice = OPENAI_VOICE_MAP.get(lang, "alloy")
    response = await client.audio.speech.create(
        model="tts-1",
        voice=voice,
        input=text,
    )
    # response.content is bytes
    return base64.b64encode(response.content).decode("utf-8")


# ─── Google Cloud TTS ───────────────────────────────────────────────────────
async def _google_tts(text: str, lang: str) -> str:
    """
    Requires: pip install google-cloud-texttospeech
    and GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service-account JSON.
    """
    try:
        from google.cloud import texttospeech_v1 as tts
    except ImportError:
        raise ImportError("pip install google-cloud-texttospeech")

    client_g = tts.TextToSpeechClient()
    voice_name = GOOGLE_VOICE_MAP.get(lang, "en-US-Standard-C")

    synthesis_input = tts.SynthesisInput(text=text)
    voice           = tts.VoiceSelectionParams(
        language_code=voice_name[:5],  # "vi-VN"
        name=voice_name,
    )
    audio_config = tts.AudioConfig(audio_encoding=tts.AudioEncoding.MP3)

    resp = client_g.synthesize_speech(
        input=synthesis_input,
        voice=voice,
        audio_config=audio_config,
    )
    return base64.b64encode(resp.audio_content).decode("utf-8")