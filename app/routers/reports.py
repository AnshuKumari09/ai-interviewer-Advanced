import logging

from fastapi import APIRouter, Depends, HTTPException

from app.db import supabase
from app.deps import get_current_user
from app.routers.interviews import _get
from app.services.llm import chat_json
from app.services.report import SYSTEM, clean, transcript_text

router = APIRouter(prefix="/api/reports", tags=["reports"])
log = logging.getLogger("uvicorn.error")


def _out(row: dict) -> dict:
    cfg = row.get("config") or {}
    return {
        "id": row["id"],
        "title": row["title"],
        "status": row["status"],
        "score": row["score"],
        "role": cfg.get("role"),
        "created_at": row["created_at"],
        "report": row["report"],
    }


@router.get("/{interview_id}")
def get_report(interview_id: str, user=Depends(get_current_user)):
    return _out(_get(interview_id, user.id))


@router.post("/{interview_id}")
def generate_report(interview_id: str, force: bool = False, user=Depends(get_current_user)):
    row = _get(interview_id, user.id)
    if row["report"] and not force:
        return _out(row)

    transcript = row["transcript"] or []
    answers = [m for m in transcript if m["role"] == "candidate"]
    if not answers:
        raise HTTPException(400, "No answers were recorded in this interview, so there is nothing to evaluate")

    cfg = row.get("config") or {}
    prompt = (
        f"Target role: {cfg.get('role', 'not specified')}\n"
        f"Skills tested: {', '.join(cfg.get('skills', []))}\n"
        f"Questions planned: {cfg.get('total_questions')}, answered: {len(answers)}\n\n"
        f"TRANSCRIPT:\n{transcript_text(transcript)}"
    )

    try:
        report = clean(chat_json(SYSTEM, prompt, temperature=0.3, max_tokens=6000), transcript)
    except Exception:
        log.exception("report generation failed")
        raise HTTPException(502, "AI report generation failed, please try again")

    report["answered"] = len(answers)
    report["planned"] = cfg.get("total_questions")

    updated = (
        supabase.table("interviews")
        .update({"report": report, "score": report["overall_score"], "status": "completed"})
        .eq("id", interview_id)
        .execute()
        .data[0]
    )
    return _out(updated)