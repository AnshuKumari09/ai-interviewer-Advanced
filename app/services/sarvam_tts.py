import asyncio
import base64
import json
import logging

from websockets.asyncio.client import connect

from app.config import settings

log = logging.getLogger("uvicorn.error")

TTS_URL = "wss://api.sarvam.ai/text-to-speech/ws?model=bulbul:v3&send_completion_event=true"


async def synthesize_speech(text: str, language_code: str = "en-IN", speaker: str = "shubh") -> bytes:
    """text ko bolke MP3 bytes return karta hai. Text limit 2500 characters."""
    audio = bytearray()
    async with connect(
        TTS_URL, additional_headers={"Api-Subscription-Key": settings.sarvam_api_key}, max_size=None
    ) as ws:
        cfg = {"model": "bulbul:v3", "language_code": language_code, "speaker": speaker}
        await ws.send(json.dumps({"type": "config", "data": cfg}))
        await ws.send(json.dumps({"type": "text", "data": {"text": text[:2500]}}))
        await ws.send(json.dumps({"type": "flush"}))
        try:
            async with asyncio.timeout(20):
                async for raw in ws:
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
    if not audio:
        raise RuntimeError("TTS returned no audio")
    return bytes(audio)