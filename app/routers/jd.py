import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.db import supabase
from app.deps import get_current_user
from app.services.jd import SYSTEM, enrich
from app.services.llm import chat_json

router = APIRouter(prefix="/api/jd", tags=["jd"])
log = logging.getLogger("uvicorn.error")


class JDIn(BaseModel):
    text: str
    title: str | None = None


def _out(row: dict) -> dict:
    return {k: row[k] for k in ("id", "title", "analysis", "created_at")}


@router.get("")
def latest_jd(user=Depends(get_current_user)):
    rows = (
        supabase.table("job_descriptions")
        .select("id,title,analysis,created_at")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
        .data
    )
    return _out(rows[0]) if rows else None


@router.post("")
def analyze_jd(body: JDIn, user=Depends(get_current_user)):
    text = body.text.strip()
    if len(text) < 50:
        raise HTTPException(400, "Paste the full job description (at least 50 characters)")

    resume = (
        supabase.table("resumes")
        .select("text_content")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
        .data
    )
    if not resume or not resume[0]["text_content"]:
        raise HTTPException(400, "Upload your resume first (Resume Analysis page)")

    try:
        raw = chat_json(
            SYSTEM,
            f"JOB DESCRIPTION:\n{text[:6000]}\n\nRESUME:\n{resume[0]['text_content'][:8000]}",
        )
        analysis = enrich(raw)
    except Exception:
        log.exception("jd analysis failed")
        raise HTTPException(502, "AI analysis failed, please try again")

    if not analysis["skills"]:
        raise HTTPException(502, "Could not extract skills from this JD, please try again")

    row = (
        supabase.table("job_descriptions")
        .insert(
            {
                "user_id": user.id,
                "title": body.title or analysis["role"] or "Job Description",
                "text_content": text,
                "analysis": analysis,
            }
        )
        .execute()
        .data[0]
    )
    return _out(row)