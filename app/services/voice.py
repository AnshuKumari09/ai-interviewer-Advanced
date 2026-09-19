import asyncio
import base64
import json
import logging
import re
from urllib.parse import urlencode

from groq import AsyncGroq
from websockets.asyncio.client import connect

from app.config import settings

log = logging.getLogger("uvicorn.error")

STT_URL = "wss://api.sarvam.ai/speech-to-text-realtime/ws"
TTS_URL = "wss://api.sarvam.ai/text-to-speech/ws"
HEADERS = {"Api-Subscription-Key": settings.sarvam_api_key}
LANG = "en-IN"
SPEAKER = "shubh"

client = AsyncGroq(api_key=settings.groq_api_key)
_SENT_END = re.compile(r"(?<=[.!?])\s+")


def stt_connect():
    q = urlencode(
        {
            "language_code": LANG,
            "model": "saaras:v3-realtime",
            "stream_type": "fast",
            "encoding": "linear16",
            "sample_rate": 16000,
            "silence_duration_ms": 1200,  # itni der chup rehne par jawab poora maana jayega
        }
    )
    return connect(f"{STT_URL}?{q}", additional_headers=HEADERS, max_size=None)


def audio_msg(pcm: bytes) -> str:
    return json.dumps({"event": "audio_input", "audio": base64.b64encode(pcm).decode()})


async def chunks(text: str):
    for s in _SENT_END.split(text.strip()):
        if s.strip():
            yield s.strip()


async def sentences(system: str, messages: list[dict]):
    """Groq ka stream, poora sentence bante hi yield."""
    stream = await client.chat.completions.create(
        model=settings.groq_fast_model,
        messages=[{"role": "system", "content": system}, *messages],
        temperature=0.6,
        reasoning_effort="low",
        max_completion_tokens=1024,
        stream=True,
    )
    buf = ""
    async for chunk in stream:
        if not chunk.choices:
            continue
        buf += chunk.choices[0].delta.content or ""
        parts = _SENT_END.split(buf)
        for s in parts[:-1]:
            if s.strip():
                yield s.strip()
        buf = parts[-1]
    if buf.strip():
        yield buf.strip()


class Tts:
    """Ek AI reply = ek WebSocket. Har sentence: text + flush, phir completion event tak MP3 chunks jama."""

    def __init__(self):
        self.ws = None
        self._lock = asyncio.Lock()

    async def ensure(self):
        async with self._lock:
            if self.ws is None:
                ws = await connect(
                    f"{TTS_URL}?model=bulbul:v3&send_completion_event=true",
                    additional_headers=HEADERS,
                    max_size=None,
                )
                cfg = {"model": "bulbul:v3", "language_code": LANG, "speaker": SPEAKER}
                await ws.send(json.dumps({"type": "config", "data": cfg}))
                self.ws = ws

    async def say(self, text: str) -> bytes:
        await self.ensure()
        await self.ws.send(json.dumps({"type": "text", "data": {"text": text}}))
        await self.ws.send(json.dumps({"type": "flush"}))
        audio = bytearray()
        try:
            async with asyncio.timeout(20):
                async for raw in self.ws:
                    msg = json.loads(raw)
                    kind = msg.get("type")
                    if kind == "audio":
                        audio += base64.b64decode(msg["data"]["audio"])
                    elif kind == "event":  # completion event
                        break
                    elif kind == "error":
                        raise RuntimeError(msg.get("data", {}).get("message", "TTS error"))
        except TimeoutError:
            log.warning("TTS timed out, using %d bytes collected", len(audio))
        log.info("tts: %d bytes for %r", len(audio), text[:40])
        return bytes(audio)

    async def close(self):
        if self.ws:
            await self.ws.close()