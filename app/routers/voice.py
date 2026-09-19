import asyncio
import json
import logging

from fastapi import APIRouter, HTTPException, WebSocket

from app.db import supabase
from app.routers.interviews import CLOSING, _get
from app.services.interview import now, system_prompt, to_messages
from app.services.voice import Tts, audio_msg, chunks, sentences, stt_connect

router = APIRouter()
log = logging.getLogger("uvicorn.error")


def _user_from_cookie(ws: WebSocket):
    token = ws.cookies.get("access_token")
    if not token:
        return None
    try:
        return supabase.auth.get_user(token).user
    except Exception:
        return None


def _save(interview_id: str, transcript: list) -> None:
    supabase.table("interviews").update({"transcript": transcript}).eq("id", interview_id).execute()


def _text(ev: dict) -> str:
    return (ev.get("text") or (ev.get("data") or {}).get("text") or "").strip()


@router.websocket("/ws/interviews/{interview_id}")
async def interview_ws(ws: WebSocket, interview_id: str):
    await ws.accept()
    user = await asyncio.to_thread(_user_from_cookie, ws)
    if not user:
        return await ws.close(code=4401)
    try:
        row = await asyncio.to_thread(_get, interview_id, user.id)
    except HTTPException:
        return await ws.close(code=4404)
    cfg = row.get("config")
    if not cfg or row["status"] != "in_progress":
        return await ws.close(code=4400)

    st = {"transcript": row["transcript"] or []}
    busy = asyncio.Event()  # set = AI soch/bol raha hai, mic ka audio ignore
    tasks: set[asyncio.Task] = set()

    async def send(obj: dict):
        try:
            await ws.send_json(obj)
        except Exception:
            pass

    def spawn(coro):
        t = asyncio.create_task(coro)
        tasks.add(t)
        t.add_done_callback(tasks.discard)

    async def speak(parts, emit: bool) -> str:
        tts = Tts()
        warm = asyncio.create_task(tts.ensure())  # TTS connection LLM ke saath-saath khul jaye
        spoken, tts_ok = [], True
        try:
            async for s in parts:
                spoken.append(s)
                if emit:
                    await ws.send_json({"type": "ai_text", "text": s})
                if tts_ok:
                    try:
                        audio = await tts.say(s)
                        if audio:
                            await ws.send_bytes(audio)
                    except Exception:
                        log.exception("TTS failed")
                        tts_ok = False
                        await ws.send_json({"type": "warning", "message": "Voice output unavailable, showing text only"})
        finally:
            warm.cancel()
            await tts.close()
        return " ".join(spoken)

    async def greet():
        """Connect hote hi current sawal bolo (transcript me pehle se hai, isliye emit=False)."""
        try:
            last = next((m for m in reversed(st["transcript"]) if m["role"] == "ai"), None)
            if last:
                await speak(chunks(last["text"]), emit=False)
        except asyncio.CancelledError:
            raise
        except Exception:
            log.exception("greet failed")
        finally:
            await send({"type": "turn_end", "done": False})
            busy.clear()

    async def turn(text: str):
        try:
            await ws.send_json({"type": "final", "text": text})
            tr = st["transcript"] + [{"role": "candidate", "text": text[:3000], "t": now()}]
            asked = sum(1 for m in tr if m["role"] == "ai")
            done = asked >= cfg["total_questions"]
            if done:
                reply = await speak(chunks(CLOSING), emit=True)
            else:
                reply = await speak(sentences(system_prompt(cfg, asked + 1), to_messages(tr)), emit=True)
            if not reply:
                raise RuntimeError("empty AI reply")
            tr.append({"role": "ai", "text": reply, "t": now()})
            await asyncio.to_thread(_save, interview_id, tr)  # poora turn safal hone par hi save
            st["transcript"] = tr
            await ws.send_json({"type": "turn_end", "done": done})
        except asyncio.CancelledError:
            raise
        except Exception:
            log.exception("voice turn failed")
            await send({"type": "error", "message": "Something went wrong, please answer again"})
            await send({"type": "turn_end", "done": False})
        finally:
            busy.clear()

    try:
        async with stt_connect() as stt:
            busy.set()
            spawn(greet())

            async def pump_audio():
                while True:
                    msg = await ws.receive()
                    if msg["type"] == "websocket.disconnect":
                        return
                    data = msg.get("bytes")
                    if data and not busy.is_set():
                        await stt.send(audio_msg(data))

            async def pump_stt():
                async for raw in stt:
                    ev = json.loads(raw)
                    kind = ev.get("event")
                    if kind == "transcript.partial":
                        if not busy.is_set():
                            await ws.send_json({"type": "partial", "text": _text(ev)})
                    elif kind == "transcript.final":
                        text = _text(ev)
                        if text and not busy.is_set():
                            busy.set()
                            spawn(turn(text))
                    elif kind == "error":
                        log.error("sarvam stt error: %s", ev)
                    elif kind not in ("pong", "vad.speech_start", "vad.speech_end"):
                        log.info("stt event: %s", raw[:200])

            async def keepalive():
                while True:
                    await asyncio.sleep(10)
                    await stt.send(json.dumps({"event": "ping"}))

            workers = [asyncio.create_task(f()) for f in (pump_audio, pump_stt, keepalive)]
            try:
                finished, _ = await asyncio.wait(workers, return_when=asyncio.FIRST_COMPLETED)
                for t in finished:
                    if not t.cancelled() and t.exception():
                        log.error("voice worker stopped: %r", t.exception())
            finally:
                for t in (*workers, *tasks):
                    t.cancel()
    except Exception:
        log.exception("could not connect to Sarvam STT")
        await send({"type": "error", "message": "Could not connect to the voice service"})
    finally:
        try:
            await ws.close()
        except Exception:
            pass