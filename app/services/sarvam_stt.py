"""Sarvam realtime STT (saaras:v3-realtime) ka async WebSocket client."""

import asyncio
import base64
import json
import logging
from typing import AsyncIterator, Optional
from urllib.parse import urlencode

from websockets.asyncio.client import ClientConnection, connect
from websockets.exceptions import ConnectionClosed

from app.config import settings

log = logging.getLogger("uvicorn.error")

SARVAM_STT_URL = "wss://api.sarvam.ai/speech-to-text-realtime/ws"


class SarvamSTTSession:
    def __init__(self, language_code: str = "en-IN", stream_type: str = "fast", silence_ms: int = 1200):
        self.language_code = language_code
        self.stream_type = stream_type
        self.silence_ms = silence_ms
        self._ws: Optional[ClientConnection] = None
        self._ping_task: Optional[asyncio.Task] = None

    async def connect(self) -> None:
        query = urlencode(
            {
                "language_code": self.language_code,
                "model": "saaras:v3-realtime",
                "stream_type": self.stream_type,
                "mode": "transcribe",
                "encoding": "linear16",
                "sample_rate": 16000,
                "silence_duration_ms": self.silence_ms,
            }
        )
        self._ws = await connect(
            f"{SARVAM_STT_URL}?{query}",
            additional_headers={"Api-Subscription-Key": settings.sarvam_api_key},
            max_size=None,
        )
        self._ping_task = asyncio.create_task(self._keepalive())
        log.info("Connected to Sarvam realtime STT")

    async def _keepalive(self) -> None:
        try:
            while True:
                await asyncio.sleep(10)
                await self._ws.send(json.dumps({"event": "ping"}))
        except Exception:
            pass

    async def send_audio(self, pcm16_bytes: bytes) -> None:
        """16-bit little-endian mono PCM, 16000 Hz."""
        if not self._ws:
            return
        await self._ws.send(
            json.dumps({"event": "audio_input", "audio": base64.b64encode(pcm16_bytes).decode("utf-8")})
        )

    async def events(self) -> AsyncIterator[dict]:
        if not self._ws:
            raise RuntimeError("call connect() before events()")
        try:
            async for raw in self._ws:
                try:
                    yield json.loads(raw)
                except json.JSONDecodeError:
                    log.warning("Non-JSON message from Sarvam STT: %s", raw)
        except ConnectionClosed as e:
            log.info("Sarvam STT connection closed: %s", e)

    async def close(self) -> None:
        if self._ping_task:
            self._ping_task.cancel()
        if self._ws:
            await self._ws.close()  # dobara call karna safe hai