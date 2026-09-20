import asyncio
import base64
import logging

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.db import supabase
from app.deps import get_current_user
from app.services.interview import build_config, now, system_prompt, to_messages
from app.services.llm import chat_text
from app.services.sarvam_stt import SarvamSTTSession
from app.services.sarvam_tts import synthesize_speech

router = APIRouter(prefix="/api/interviews", tags=["interviews"])
log = logging.getLogger("uvicorn.error")

CLOSING = "Thank you, that was the last question. Let me prepare your interview report."


class StartIn(BaseModel):
    role: str | None = None
    num_questions: int = 10


class AnswerIn(BaseModel):
    text: str


def _latest(table: str, cols: str, uid: str):
    rows = (
        supabase.table(table).select(cols).eq("user_id", uid)
        .order("created_at", desc=True).limit(1).execute().data
    )
    return rows[0] if rows else None


def _get(interview_id: str, uid: str) -> dict:
    rows = (
        supabase.table("interviews").select("*")
        .eq("id", interview_id).eq("user_id", uid).limit(1).execute().data
    )
    if not rows:
        raise HTTPException(404, "Interview not found")
    return rows[0]


def _public(row: dict) -> dict:
    cfg = row.get("config") or {}
    return {
        "id": row["id"],
        "title": row["title"],
        "status": row["status"],
        "score": row["score"],
        "config": {"role": cfg.get("role"), "total_questions": cfg.get("total_questions", 10)},
        "transcript": row["transcript"] or [],
        "created_at": row["created_at"],
    }


def _ask(cfg: dict, transcript: list[dict], question_no: int) -> str:
    try:
        reply = chat_text(system_prompt(cfg, question_no), to_messages(transcript))
    except Exception:
        log.exception("interviewer LLM failed")
        raise HTTPException(502, "AI is unavailable, please try again")
    if not reply:
        raise HTTPException(502, "AI returned an empty reply, please try again")
    return reply


def _process_answer(row: dict, text: str) -> dict:
    """Text (REST) aur voice (WebSocket) dono ka shared turn logic.
    Candidate ka jawab + AI ka agla sawal (ya closing) transcript me jodta hai,
    save karta hai. Fail hone par HTTPException, aur tab kuch save nahi hota."""
    cfg = row.get("config")
    if not cfg or row["status"] != "in_progress":
        raise HTTPException(400, "This interview cannot be continued")

    text = text.strip()
    if not text:
        raise HTTPException(400, "Answer is empty")

    transcript = (row["transcript"] or []) + [{"role": "candidate", "text": text[:3000], "t": now()}]
    asked = sum(1 for m in transcript if m["role"] == "ai")
    total = cfg["total_questions"]
    done = asked >= total

    reply = CLOSING if done else _ask(cfg, transcript, asked + 1)
    transcript.append({"role": "ai", "text": reply, "t": now()})

    supabase.table("interviews").update({"transcript": transcript}).eq("id", row["id"]).execute()

    return {
        "row": {**row, "transcript": transcript},
        "reply": reply,
        "question_no": total if done else asked + 1,
        "done": done,
    }


# ------------------------------- REST (text mode) -------------------------------


@router.post("")
def start(body: StartIn, user=Depends(get_current_user)):
    total = max(1, min(30, body.num_questions))
    jd = _latest("job_descriptions", "title,analysis", user.id)
    resume = _latest("resumes", "analysis", user.id)
    jd_a = (jd or {}).get("analysis") or {}
    role = (body.role or "").strip() or jd_a.get("role") or (jd or {}).get("title") or "Software Developer"

    cfg = build_config(role, jd_a, (resume or {}).get("analysis") or {}, total)
    first = _ask(cfg, [], 1)  # LLM fail ho to interview row banti hi nahi

    row = (
        supabase.table("interviews")
        .insert(
            {
                "user_id": user.id,
                "title": f"{role} - Mock Interview",
                "status": "in_progress",
                "config": cfg,
                "transcript": [{"role": "ai", "text": first, "t": now()}],
            }
        )
        .execute()
        .data[0]
    )
    return _public(row)


def _public_list_item(row: dict) -> dict:
    cfg = row.get("config") or {}

    return {
        "id": row["id"],
        "title": row["title"],
        "status": row["status"],
        "score": row["score"],
        "role": cfg.get("role"),
        "total_questions": cfg.get("total_questions", 10),
        "created_at": row["created_at"],
    }


@router.get("")
def list_interviews(user=Depends(get_current_user)):
    return (
        supabase.table("interviews")
        .select("id,title,status,score,created_at")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .execute()
        .data
    )

@router.get("/{interview_id}")
def get_interview(interview_id: str, user=Depends(get_current_user)):
    return _public(_get(interview_id, user.id))


@router.post("/{interview_id}/answer")
def answer(interview_id: str, body: AnswerIn, user=Depends(get_current_user)):
    row = _get(interview_id, user.id)
    result = _process_answer(row, body.text)
    return {"reply": result["reply"], "question_no": result["question_no"], "done": result["done"]}


@router.post("/{interview_id}/end")
def end(interview_id: str, user=Depends(get_current_user)):
    row = _get(interview_id, user.id)
    answered = any(m["role"] == "candidate" for m in (row["transcript"] or []))
    status = "completed" if answered else "cancelled"
    supabase.table("interviews").update({"status": status}).eq("id", interview_id).execute()
    return {"ok": True, "status": status}


# ------------------------------- WebSocket (voice mode) -------------------------------


async def _get_ws_user(websocket: WebSocket):
    # httpOnly cookie WS handshake ke saath khud aa jati hai; ?token= sirf optional fallback
    token = websocket.query_params.get("token") or websocket.cookies.get("access_token")
    if not token:
        return None
    try:
        result = await asyncio.to_thread(supabase.auth.get_user, token)
        return result.user if result else None
    except Exception:
        log.exception("WS auth failed")
        return None


def _event_text(ev: dict) -> str:
    return (ev.get("text") or (ev.get("data") or {}).get("text") or "").strip()


async def _send_speech(websocket: WebSocket, text: str) -> None:
    """Text pehle hi browser ko ja chuka hota hai; TTS fail ho to sirf warning."""
    try:
        audio = await synthesize_speech(text, language_code="en-IN")
        await websocket.send_json(
            {"type": "llm.audio", "audio": base64.b64encode(audio).decode("ascii"), "format": "mp3"}
        )
    except WebSocketDisconnect:
        raise
    except Exception:
        log.exception("TTS error")
        await websocket.send_json({"type": "warning", "message": "Couldn't generate voice, showing text only"})


@router.websocket("/{interview_id}/audio")
async def interview_audio_ws(websocket: WebSocket, interview_id: str):
    await websocket.accept()

    user = await _get_ws_user(websocket)
    if not user:
        await websocket.send_json({"type": "error", "message": "Session expired, please refresh the page"})
        await websocket.close(code=4401)
        return

    try:
        row = await asyncio.to_thread(_get, interview_id, user.id)
    except HTTPException as e:
        await websocket.send_json({"type": "error", "message": e.detail})
        await websocket.close(code=4404)
        return

    if not row.get("config") or row["status"] != "in_progress":
        await websocket.send_json({"type": "error", "message": "This interview cannot be continued"})
        await websocket.close(code=4400)
        return

    stt = SarvamSTTSession(language_code="en-IN")
    try:
        await stt.connect()
    except Exception:
        log.exception("Failed to connect to Sarvam STT")
        await websocket.send_json({"type": "error", "message": "Voice service unavailable, please try again"})
        await websocket.close(code=1011)
        return

    await websocket.send_json({"type": "connected"})

    busy = True  # True = AI soch/bol raha hai, mic ka audio STT ko nahi jayega

    async def greet():
        """Connect hote hi current sawal bolo (transcript me pehle se hai)."""
        nonlocal busy
        try:
            last_ai = next((m for m in reversed(row["transcript"] or []) if m["role"] == "ai"), None)
            if last_ai:
                await _send_speech(websocket, last_ai["text"])
        except Exception:
            log.exception("greeting failed")
        finally:
            busy = False

    async def pump_browser_audio_to_stt():
        try:
            while True:
                message = await websocket.receive()
                if message.get("type") == "websocket.disconnect":
                    break
                data = message.get("bytes")
                if data and not busy:
                    await stt.send_audio(data)
        except (WebSocketDisconnect, RuntimeError):
            pass

    async def pump_stt_events_to_browser():
        nonlocal busy
        async for event in stt.events():
            kind = event.get("event")
            text = _event_text(event)

            if kind == "transcript.partial":
                if not busy:
                    await websocket.send_json({"event": kind, "text": text})
                continue

            if kind == "error":
                log.error("Sarvam STT error: %s", event)
                continue

            if kind != "transcript.final":
                if kind not in ("pong", "session.begin", "vad.speech_start", "vad.speech_end"):
                    log.info("stt event: %s", str(event)[:200])
                continue

            if not text or busy:
                continue

            busy = True
            finished = False
            try:
                await websocket.send_json({"event": "transcript.final", "text": text})
                result = await asyncio.to_thread(_process_answer, row, text)
                row.update(result["row"])  # agla turn latest transcript se chale

                await websocket.send_json(
                    {
                        "type": "llm.response",
                        "text": result["reply"],
                        "question_no": result["question_no"],
                        "done": result["done"],
                    }
                )
                await _send_speech(websocket, result["reply"])
                finished = result["done"]
            except HTTPException as e:
                await websocket.send_json({"type": "error", "message": e.detail})
            except WebSocketDisconnect:
                return
            except Exception:
                log.exception("Voice turn failed")
                await websocket.send_json(
                    {"type": "error", "message": "Something went wrong, please answer again"}
                )
            finally:
                busy = finished  # interview khatam to aage koi jawab nahi lena

    workers = [
        asyncio.create_task(pump_browser_audio_to_stt()),
        asyncio.create_task(pump_stt_events_to_browser()),
    ]
    greet_task = asyncio.create_task(greet())
    try:
        finished_tasks, _ = await asyncio.wait(workers, return_when=asyncio.FIRST_COMPLETED)
        for t in finished_tasks:
            if not t.cancelled() and t.exception():
                log.error("voice worker stopped: %r", t.exception())
        if workers[1] in finished_tasks:  # STT khud band hua, browser abhi connected hai
            try:
                await websocket.send_json(
                    {"type": "error", "message": "Voice connection lost, tap the mic to reconnect"}
                )
            except Exception:
                pass
    finally:
        for t in (*workers, greet_task):
            t.cancel()
        await stt.close()
        try:
            await websocket.close()
        except Exception:
            pass