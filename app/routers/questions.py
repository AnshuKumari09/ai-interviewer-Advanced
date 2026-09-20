import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.db import supabase
from app.deps import get_current_user
from app.services.llm import chat_text

router = APIRouter(prefix="/api/questions", tags=["questions"])
log = logging.getLogger("uvicorn.error")


class GenerateIn(BaseModel):
    role: str
    topic: str | None = None
    difficulty: str = "Medium"
    count: int = 5


def _generation_prompt(role: str, topic: str | None, difficulty: str, count: int) -> str:
    return f"""You are generating interview practice questions for a candidate preparing for a "{role}" role.

Generate exactly {count} distinct interview questions.
Topic focus: {topic or "a realistic mix of DSA, system design, and behavioral"}
Target difficulty: {difficulty}

Respond with ONLY a raw JSON array (no markdown fences, no prose before or after). Each element:
{{"question": "<the question text>", "topic": "<short topic label>", "difficulty": "Easy|Medium|Hard"}}
"""


def _clean_json(raw: str):
    text = raw.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


@router.get("")
def list_questions(
    role: str | None = Query(None),
    topic: str | None = Query(None),
    difficulty: str | None = Query(None),
    source: str | None = Query(None),
    search: str | None = Query(None),
    limit: int = Query(50, le=100),
    user=Depends(get_current_user),
):
    q = supabase.table("questions").select("*")
    if role:
        q = q.ilike("role", f"%{role}%")
    if topic:
        q = q.eq("topic", topic)
    if difficulty:
        q = q.eq("difficulty", difficulty)
    if source:
        q = q.eq("source", source)
    if search:
        q = q.ilike("question_text", f"%{search}%")
    rows = q.order("created_at", desc=True).limit(limit).execute().data
    return rows


@router.get("/saved")
def list_saved(user=Depends(get_current_user)):
    rows = (
        supabase.table("saved_questions")
        .select("question_id, questions(*)")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .execute()
        .data
    )
    return [r["questions"] for r in rows if r.get("questions")]


@router.post("/generate")
def generate_questions(body: GenerateIn, user=Depends(get_current_user)):
    count = max(1, min(10, body.count))

    try:
        raw = chat_text(
            _generation_prompt(body.role, body.topic, body.difficulty, count),
            [{"role": "user", "content": "Generate the questions now."}],
        )
    except Exception:
        log.exception("question generation LLM call failed")
        raise HTTPException(502, "AI is unavailable, please try again")

    try:
        items = _clean_json(raw)
        if not isinstance(items, list):
            raise ValueError("not a list")
    except (json.JSONDecodeError, ValueError):
        log.error("Bad JSON from question generator: %s", raw)
        raise HTTPException(502, "AI returned an unexpected format, please try again")

    rows = [
        {
            "role": body.role,
            "topic": (it.get("topic") or body.topic or "General").strip(),
            "difficulty": (it.get("difficulty") or body.difficulty).strip(),
            "type": "ai_generated",
            "question_text": (it.get("question") or "").strip(),
            "source": "ai_generated",
            "created_by": user.id,
        }
        for it in items[:count]
        if isinstance(it, dict) and it.get("question")
    ]
    if not rows:
        raise HTTPException(502, "AI returned no usable questions, please try again")

    inserted = supabase.table("questions").insert(rows).execute().data
    return inserted


@router.post("/{question_id}/save")
def save_question(question_id: str, user=Depends(get_current_user)):
    supabase.table("saved_questions").upsert(
        {"user_id": user.id, "question_id": question_id}
    ).execute()
    return {"ok": True}


@router.delete("/{question_id}/save")
def unsave_question(question_id: str, user=Depends(get_current_user)):
    supabase.table("saved_questions").delete().eq("user_id", user.id).eq(
        "question_id", question_id
    ).execute()
    return {"ok": True}


# Add these to app/routers/questions.py, anywhere after the existing save/unsave endpoints.

@router.get("/progress")
def list_progress(user=Depends(get_current_user)):
    rows = (
        supabase.table("question_progress")
        .select("question_id")
        .eq("user_id", user.id)
        .execute()
        .data
    )
    return [r["question_id"] for r in rows]


@router.post("/{question_id}/progress")
def mark_done(question_id: str, user=Depends(get_current_user)):
    supabase.table("question_progress").upsert(
        {"user_id": user.id, "question_id": question_id, "status": "done"}
    ).execute()
    return {"ok": True}


@router.delete("/{question_id}/progress")
def mark_not_done(question_id: str, user=Depends(get_current_user)):
    supabase.table("question_progress").delete().eq("user_id", user.id).eq(
        "question_id", question_id
    ).execute()
    return {"ok": True}